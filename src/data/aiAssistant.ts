/**
 * AI Assistant – simulated conversational engine that analyses bioreactor data.
 *
 * Responds to user queries by inspecting actual run data, alerts, records,
 * and insights to produce markdown-formatted analytical reports.
 */

import { RUNS, INTERFACES, PARAMETERS, getTimeseries, getInitialEvents } from "./runData";
import { getDataRecords, getRecordCountsByInterface } from "./dataRecords";
import { getAlerts, getAlertCountsBySeverity } from "./alertsEngine";
import { getInsights, type AiInsight } from "./aiInsights";
import { computeCompleteness } from "./labelTemplates";

// ── Types ──

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// ── Helpers ──

let _msgCounter = 0;
function msgId(): string {
  return `msg-${Date.now()}-${++_msgCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

// ── Data analysis helpers ──

function summarizeRunStatus(runId?: string) {
  const runs = runId ? RUNS.filter((r) => r.run_id === runId) : RUNS;
  return runs.map((r) => {
    const ts = getTimeseries(r.run_id);
    const lastPoint = ts[ts.length - 1];
    const params: Record<string, string> = {};
    if (lastPoint) {
      for (const p of PARAMETERS.filter((p) => p.is_critical)) {
        const v = lastPoint[p.parameter_code];
        if (typeof v === "number") {
          const inRange = v >= p.min_value && v <= p.max_value;
          params[p.display_name] = `${v.toFixed(2)} ${p.unit} ${inRange ? "✅" : "⚠️ OUT OF RANGE"}`;
        }
      }
    }
    return { run: r.bioreactor_run, reactor: r.reactor_id, cell_line: r.cell_line, target: r.target_protein, elapsed_h: lastPoint?.elapsed_h ?? 0, params };
  });
}

function getParameterTrend(runId: string, paramCode: string) {
  const ts = getTimeseries(runId);
  const param = PARAMETERS.find((p) => p.parameter_code === paramCode);
  if (!param || ts.length === 0) return null;

  const values = ts.map((p) => (typeof p[paramCode] === "number" ? (p[paramCode] as number) : null)).filter((v): v is number => v !== null);
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const last = values[values.length - 1];
  const first = values[0];
  const trendDir = last > first + (max - min) * 0.05 ? "increasing" : last < first - (max - min) * 0.05 ? "decreasing" : "stable";

  // Simple linear forecast: last 5 points
  const recent = values.slice(-5);
  const slope = recent.length > 1 ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 0;
  const forecast4h = last + slope * 4;

  return { param, min, max, avg, last, trendDir, forecast4h, totalPoints: values.length };
}

function alertSummary() {
  const alerts = getAlerts();
  const bySev = getAlertCountsBySeverity();
  const byType: Record<string, number> = {};
  for (const a of alerts) {
    byType[a.type] = (byType[a.type] || 0) + 1;
  }
  return { total: alerts.length, bySeverity: bySev, byType, topAlerts: alerts.slice(0, 5) };
}

function recordStats() {
  const records = getDataRecords();
  const byIface = getRecordCountsByInterface();
  const flagged = records.filter((r) => r.quality_flags.some((f) => f !== "in_spec"));
  const oorCount = records.filter((r) => r.quality_flags.includes("out_of_range")).length;
  const totalComplete = records.filter((r) => {
    const c = computeCompleteness(r);
    return c.score >= 100;
  }).length;

  return {
    total: records.length,
    byInterface: byIface,
    flaggedCount: flagged.length,
    oorCount,
    labeledPct: records.length > 0 ? Math.round((totalComplete / records.length) * 100) : 100,
  };
}

// ── Pattern matching & response generation ──

interface QueryPattern {
  patterns: RegExp[];
  handler: (query: string) => string;
}

const QUERY_PATTERNS: QueryPattern[] = [
  // Process status / overview
  {
    patterns: [/status|overview|state|how.*(?:run|process|reactor)/i, /what.*happening/i, /current.*(?:state|condition)/i],
    handler: () => {
      const statuses = summarizeRunStatus();
      const as = alertSummary();
      let md = "## 📊 Current Process Status\n\n";
      for (const s of statuses) {
        md += `### ${s.run} (Reactor ${s.reactor})\n`;
        md += `- **Cell line:** ${s.cell_line} → ${s.target}\n`;
        md += `- **Elapsed:** ${s.elapsed_h.toFixed(1)} h\n`;
        md += `- **Critical Parameters:**\n`;
        for (const [name, val] of Object.entries(s.params)) {
          md += `  - ${name}: ${val}\n`;
        }
        md += "\n";
      }
      md += `### Alert Summary\n`;
      md += `- **Total alerts:** ${as.total} (🔴 ${as.bySeverity.critical} critical, 🟡 ${as.bySeverity.warning} warnings)\n`;
      if (as.topAlerts.length > 0) {
        md += `- **Recent:** ${as.topAlerts[0].message}\n`;
      }
      md += "\n> 💡 Ask me about specific parameters, trends, or request a detailed report.\n";
      return md;
    },
  },

  // Parameter trend / forecast
  {
    patterns: [/(?:trend|forecast|predict|expect).*(?:ph|temp|do|agit|osmo|viab|vcd|gluc|lact)/i, /(?:ph|temp|do|agit|osmo|viab|vcd|gluc|lact).*(?:trend|forecast|predict)/i],
    handler: (query) => {
      const paramMatch = query.match(/\b(ph|temp|do|agit|osmo|viab|vcd|gluc|lact)/i);
      const paramLookup: Record<string, string> = {
        ph: "PH", temp: "TEMP", do: "DO", agit: "AGIT", osmo: "OSMO",
        viab: "VIAB", vcd: "VCD", gluc: "GLUC", lact: "LACT",
      };
      const paramCode = paramMatch ? paramLookup[paramMatch[1].toLowerCase()] : "PH";

      let md = `## 📈 Parameter Trend Analysis\n\n`;
      for (const run of RUNS) {
        const trend = getParameterTrend(run.run_id, paramCode || "PH");
        if (!trend) continue;

        const inSpec = trend.last >= trend.param.min_value && trend.last <= trend.param.max_value;
        md += `### ${run.bioreactor_run} — ${trend.param.display_name}\n`;
        md += `| Metric | Value |\n|---|---|\n`;
        md += `| Current | ${trend.last.toFixed(2)} ${trend.param.unit} ${inSpec ? "✅" : "⚠️"} |\n`;
        md += `| Range (observed) | ${trend.min.toFixed(2)} – ${trend.max.toFixed(2)} |\n`;
        md += `| Spec limits | ${trend.param.min_value} – ${trend.param.max_value} |\n`;
        md += `| Average | ${trend.avg.toFixed(2)} |\n`;
        md += `| Trend direction | ${trend.trendDir} |\n`;
        md += `| 4h forecast | ${trend.forecast4h.toFixed(2)} ${trend.param.unit} |\n`;
        md += `| Data points | ${trend.totalPoints} |\n\n`;

        if (trend.forecast4h < trend.param.min_value || trend.forecast4h > trend.param.max_value) {
          md += `> ⚠️ **Forecast alert:** ${trend.param.display_name} is projected to go out of range (${trend.forecast4h.toFixed(2)}) within the next 4 hours. Consider preemptive control action.\n\n`;
        }
      }
      md += `> 📝 Based on linear extrapolation of the last 5 data points. For a full report, ask "generate a process report".\n`;
      return md;
    },
  },

  // Alerts / deviations
  {
    patterns: [/alert|deviation|issue|problem|oor|out.of.range/i],
    handler: () => {
      const as = alertSummary();
      let md = "## ⚠️ Alert & Deviation Analysis\n\n";
      md += `| Severity | Count |\n|---|---|\n`;
      md += `| 🔴 Critical | ${as.bySeverity.critical} |\n`;
      md += `| 🟡 Warning | ${as.bySeverity.warning} |\n`;
      md += `| ℹ️ Info | ${as.bySeverity.info} |\n\n`;
      md += `### By Type\n`;
      for (const [type, count] of Object.entries(as.byType)) {
        md += `- **${type.replace(/_/g, " ")}**: ${count}\n`;
      }
      md += "\n### Top Alerts\n";
      for (const a of as.topAlerts) {
        md += `- [${a.severity.toUpperCase()}] ${a.message} *(${a.interface_id})*\n`;
      }
      md += "\n> Use **\"Open Evidence\"** in the Insights tab to navigate to supporting data records.\n";
      return md;
    },
  },

  // Data quality / records
  {
    patterns: [/data.*quality|record|completeness|label|metadata|alcoa/i],
    handler: () => {
      const stats = recordStats();
      let md = "## 🗄️ Data Quality Report\n\n";
      md += `| Metric | Value |\n|---|---|\n`;
      md += `| Total records | ${stats.total} |\n`;
      md += `| Flagged records | ${stats.flaggedCount} |\n`;
      md += `| Out-of-range | ${stats.oorCount} |\n`;
      md += `| Label completeness | ${stats.labeledPct}% |\n\n`;
      md += `### Records by Interface\n`;
      for (const [iface, count] of Object.entries(stats.byInterface)) {
        const name = INTERFACES.find((i) => i.id === iface)?.display_name || iface;
        md += `- **${name}**: ${count} records\n`;
      }
      md += "\n> All records follow ALCOA+ principles. Corrections create linked amendment records, preserving the full audit chain.\n";
      return md;
    },
  },

  // Generate report
  {
    patterns: [/report|generate.*report|full.*report|process.*report|batch.*report/i],
    handler: () => {
      const statuses = summarizeRunStatus();
      const as = alertSummary();
      const stats = recordStats();
      const insights = getInsights();

      let md = "## 📋 Process Analytical Report\n";
      md += `**Generated:** ${new Date().toLocaleString()} | **Report ID:** RPT-${Date.now().toString(36).toUpperCase()}\n\n`;
      md += "---\n\n";

      // 1. Executive summary
      md += "### 1. Executive Summary\n";
      md += `This report covers ${RUNS.length} active bioreactor run(s) across ${INTERFACES.length} monitored interfaces. `;
      md += `The data ledger contains ${stats.total} records with ${stats.oorCount} out-of-range observations. `;
      md += `${as.bySeverity.critical} critical alert(s) require immediate attention.\n\n`;

      // 2. Run status
      md += "### 2. Process Status\n\n";
      for (const s of statuses) {
        md += `**${s.run}** (${s.cell_line} → ${s.target}) — ${s.elapsed_h.toFixed(1)}h elapsed\n\n`;
        md += `| Parameter | Value |\n|---|---|\n`;
        for (const [name, val] of Object.entries(s.params)) {
          md += `| ${name} | ${val} |\n`;
        }
        md += "\n";
      }

      // 3. Critical parameter forecast
      md += "### 3. Critical Parameter Forecast (4h)\n\n";
      md += `| Run | Parameter | Current | 4h Forecast | Trend | Risk |\n|---|---|---|---|---|---|\n`;
      for (const run of RUNS) {
        for (const p of PARAMETERS.filter((p) => p.is_critical)) {
          const t = getParameterTrend(run.run_id, p.parameter_code);
          if (!t) continue;
          const risk = t.forecast4h < t.param.min_value || t.forecast4h > t.param.max_value ? "🔴 High" : "🟢 Low";
          md += `| ${run.bioreactor_run} | ${t.param.display_name} | ${t.last.toFixed(2)} | ${t.forecast4h.toFixed(2)} | ${t.trendDir} | ${risk} |\n`;
        }
      }
      md += "\n";

      // 4. Alerts
      md += "### 4. Active Alerts\n\n";
      if (as.total === 0) {
        md += "✅ No active alerts.\n\n";
      } else {
        md += `| Severity | Type | Interface | Message |\n|---|---|---|---|\n`;
        for (const a of as.topAlerts) {
          md += `| ${a.severity} | ${a.type.replace(/_/g, " ")} | ${a.interface_id} | ${a.message.slice(0, 80)} |\n`;
        }
        md += "\n";
      }

      // 5. AI Insights
      md += "### 5. AI Insights Summary\n\n";
      if (insights.length === 0) {
        md += "No active insights.\n\n";
      } else {
        for (const ins of insights.slice(0, 6)) {
          const icon = ins.severity === "critical" ? "🔴" : ins.severity === "warning" ? "🟡" : ins.severity === "success" ? "🟢" : "ℹ️";
          md += `- ${icon} **${ins.title}** — ${ins.explanation.slice(0, 120)}...\n`;
        }
        md += "\n";
      }

      // 6. Data integrity
      md += "### 6. Data Integrity\n\n";
      md += `| Metric | Value |\n|---|---|\n`;
      md += `| Total records | ${stats.total} |\n`;
      md += `| Label completeness | ${stats.labeledPct}% |\n`;
      md += `| ALCOA compliance | ✅ Audit trail active |\n`;
      md += `| Immutability | ✅ Correction-chain model |\n\n`;

      md += "---\n";
      md += "*This report was generated from the current Data Vest ledger. All evidence records can be verified in Data Storage.*\n";

      return md;
    },
  },

  // Help / capabilities
  {
    patterns: [/help|what.*can.*you|capabilit|how.*work/i],
    handler: () => {
      return `## 🤖 AI Assistant Capabilities

I analyze your bioreactor process data in real-time. Here's what you can ask me:

| Command | Description |
|---|---|
| **"status"** or **"overview"** | Current state of all runs with critical parameters |
| **"pH trend"** / **"temp forecast"** | Trend analysis and 4-hour forecast for any parameter |
| **"alerts"** or **"deviations"** | Alert summary with severity breakdown |
| **"data quality"** / **"records"** | Data integrity and completeness report |
| **"generate report"** | Full analytical report covering all aspects |
| **"forecast"** + parameter name | Predictive analysis with risk assessment |

### Parameters I can analyze:
${PARAMETERS.map((p) => `- **${p.display_name}** (${p.unit})`).join("\n")}

> All analysis is based on the current data in the Data Vest ledger. No external API calls are made.`;
    },
  },
];

// ── Fallback ──
function fallbackResponse(query: string): string {
  return `I understand you're asking about: *"${query}"*

I can help with the following — try asking:
- **"What is the current process status?"**
- **"Show me the pH trend and forecast"**
- **"Are there any alerts or deviations?"**
- **"Generate a full process report"**
- **"Data quality summary"**

> Type **"help"** to see all available commands.`;
}

// ── Public API ──

const _history: ChatMessage[] = [];

export function getChatHistory(): ChatMessage[] {
  return [..._history];
}

export function clearChatHistory(): void {
  _history.length = 0;
}

export function sendMessage(userContent: string): ChatMessage[] {
  const userMsg: ChatMessage = {
    id: msgId(),
    role: "user",
    content: userContent.trim(),
    timestamp: now(),
  };
  _history.push(userMsg);

  // Find matching pattern
  let responseContent = fallbackResponse(userContent);
  for (const qp of QUERY_PATTERNS) {
    if (qp.patterns.some((p) => p.test(userContent))) {
      responseContent = qp.handler(userContent);
      break;
    }
  }

  const assistantMsg: ChatMessage = {
    id: msgId(),
    role: "assistant",
    content: responseContent,
    timestamp: now(),
  };
  _history.push(assistantMsg);

  return [userMsg, assistantMsg];
}

/** Export report content for download */
export function generateReportContent(): string {
  const pattern = QUERY_PATTERNS.find((qp) => qp.patterns.some((p) => p.test("generate report")));
  return pattern ? pattern.handler("generate report") : "";
}
