import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RUNS, PARAMETERS, getTimeseries } from "@/data/runData";
import { FileText } from "lucide-react";
import { useEvents } from "@/contexts/EventsContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProcessChart, colorFor } from "@/components/monitoring/ProcessChart";
import { ControlActionsPanel } from "@/components/monitoring/ControlActionsPanel";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { DetailHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createReportFromRun } from "@/data/reportsStore";
import { format } from "date-fns";
import type { ParameterDef, ProcessEvent } from "@/data/runTypes";

/** Cluster order matches the spec exactly so the visual rhythm is enforced. */
const CLUSTER_ORDER: { id: ParameterDef["type_priority"]; label: string }[] = [
  { id: "Critical",  label: "Critical" },
  { id: "Important", label: "Important" },
  { id: "Monitored", label: "Monitored" },
];

const EVENT_TYPES = ["FEED", "BASE_ADDITION", "ANTIFOAM", "INDUCER", "ADDITIVE", "HARVEST", "SAMPLE", "NOTE"];

export default function RunMonitorPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { user, canLogEvents, isManager } = useAuth();
  const { toast } = useToast();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();

  const run = RUNS.find((r) => r.run_id === runId);
  const timeseries = useMemo(() => (run ? getTimeseries(run.run_id) : []), [run]);
  const runEvents = useMemo(
    () => events.filter((e) => e.run_id === runId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [events, runId]
  );

  const [selectedParams, setSelectedParams] = useState<string[]>(
    PARAMETERS.filter((p) => p.is_critical).map((p) => p.parameter_code)
  );
  const [showRangeBands, setShowRangeBands] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProcessEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    event_type: "NOTE", subtype: "", amount: "", amount_unit: "", notes: "",
    timestamp: new Date().toISOString().slice(0, 16),
  });

  const eventMarkers = useMemo(() => {
    if (!run) return [];
    const runStart = new Date(run.start_time).getTime();
    return runEvents.map((e) => ({
      ...e,
      elapsed_h: (new Date(e.timestamp).getTime() - runStart) / 3600000,
    }));
  }, [runEvents, run]);

  const highlightedEventH = useMemo(() => {
    if (!selectedEventId) return null;
    const marker = eventMarkers.find((m) => m.id === selectedEventId);
    return marker ? marker.elapsed_h : null;
  }, [selectedEventId, eventMarkers]);

  const paramGroups = useMemo(() => {
    const groups: Record<string, ParameterDef[]> = {};
    PARAMETERS.forEach((p) => {
      if (!groups[p.type_priority]) groups[p.type_priority] = [];
      groups[p.type_priority].push(p);
    });
    return groups;
  }, []);

  if (!run) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Run not found</h2>
        <Button onClick={() => navigate("/equipment")}>Back to Equipment Dashboard</Button>
      </div>
    );
  }

  const toggleParam = (code: string) => {
    setSelectedParams((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const handleSaveEvent = () => {
    const data = {
      run_id: run.run_id,
      timestamp: new Date(eventForm.timestamp).toISOString(),
      event_type: eventForm.event_type,
      subtype: eventForm.subtype,
      amount: eventForm.amount ? parseFloat(eventForm.amount) : null,
      amount_unit: eventForm.amount_unit,
      actor: user?.name || "unknown",
      entry_mode: "manual",
      notes: eventForm.notes,
    };
    if (editingEvent) {
      updateEvent(editingEvent.id, data);
    } else {
      addEvent(data);
    }
    setShowEventDialog(false);
    setEditingEvent(null);
  };

  const startEdit = (evt: ProcessEvent) => {
    setEditingEvent(evt);
    setEventForm({
      event_type: evt.event_type, subtype: evt.subtype,
      amount: evt.amount?.toString() || "", amount_unit: evt.amount_unit,
      notes: evt.notes, timestamp: evt.timestamp.slice(0, 16),
    });
    setShowEventDialog(true);
  };

  const openNewEvent = () => {
    setEditingEvent(null);
    setEventForm({ event_type: "NOTE", subtype: "", amount: "", amount_unit: "", notes: "", timestamp: new Date().toISOString().slice(0, 16) });
    setShowEventDialog(true);
  };


  const eventColumns = [
    { key: "timestamp", label: "Time", sortable: true as const,
      render: (e: ProcessEvent) => format(new Date(e.timestamp), "MM-dd HH:mm") },
    { key: "event_type", label: "Type", sortable: true as const,
      render: (e: ProcessEvent) => <Badge variant="outline" className="text-xs">{e.event_type}</Badge> },
    { key: "subtype", label: "Subtype" },
    { key: "amount", label: "Amount",
      render: (e: ProcessEvent) => (e.amount != null ? `${e.amount} ${e.amount_unit}` : "—") },
    { key: "actor", label: "Logged By" },
    { key: "notes", label: "Notes" },
    ...(canLogEvents ? [{
      key: "actions", label: "",
      render: (e: ProcessEvent) => (
        <div className="flex gap-1">
          {isManager && (
            <>
              <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); startEdit(e); }}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={(ev) => { ev.stopPropagation(); deleteEvent(e.id); }}>Delete</Button>
            </>
          )}
        </div>
      ),
    }] : []),
  ];

  // Critical-only shortcut — keep just the parameters flagged is_critical.
  const handleCriticalOnly = () => {
    setSelectedParams(PARAMETERS.filter((p) => p.is_critical).map((p) => p.parameter_code));
  };

  return (
    <div className="p-6 stack-page">
      {/* ── Detail Page Header ── */}
      <DetailHeader
        name={run.bioreactor_run}
        status={<Badge variant="success" withDot>Active</Badge>}
        meta={[
          { label: "Reactor ID",  value: run.reactor_id },
          { label: "Cell Line",   value: run.cell_line.split("/")[1] || run.cell_line },
          { label: "Protein",     value: <span className="truncate inline-block max-w-[180px] align-bottom">{run.target_protein}</span> },
          { label: "Strategy",    value: run.process_strategy },
          { label: "Operator",    value: run.operator_id },
        ]}
        actions={
          isManager && (
            <Button
              className="gap-1.5"
              onClick={() => {
                const report = createReportFromRun(run.run_id, user?.name || "Manager");
                toast({
                  title: "Report generated",
                  description: `${report.report_no} created with ${report.alert_ids.length} alerts, ${report.insight_ids.length} insights, and ${report.qc_rows.length} QC parameters.`,
                });
                navigate(`/reports?active=${report.report_id}`);
              }}
            >
              <FileText className="h-4 w-4" /> Generate Report
            </Button>
          )
        }
      />

      {/* ── Parameter Picker — three labelled clusters with vertical rules ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-stretch gap-0 flex-wrap">
            {CLUSTER_ORDER.map((cluster, idx) => {
              const params = paramGroups[cluster.id] || [];
              if (params.length === 0) return null;
              return (
                <div
                  key={cluster.id}
                  className={
                    "flex flex-col gap-2 px-5 first:pl-0 " +
                    (idx > 0 ? "border-l border-[hsl(var(--border-tertiary))]" : "")
                  }
                >
                  <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                    {cluster.label}
                  </span>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {params.map((p) => {
                      const checked = selectedParams.includes(p.parameter_code);
                      const color = colorFor(p.parameter_code);
                      return (
                        <label
                          key={p.parameter_code}
                          className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer whitespace-nowrap select-none"
                        >
                          <span
                            className="relative inline-flex h-4 w-4 items-center justify-center rounded-[3px] border transition-colors"
                            style={{
                              borderColor: color,
                              backgroundColor: checked ? color : "transparent",
                            }}
                            aria-hidden
                          >
                            {checked && (
                              <svg
                                viewBox="0 0 12 12"
                                className="h-3 w-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path d="M2 6.5 L5 9 L10 3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParam(p.parameter_code)}
                            className="sr-only"
                          />
                          {p.display_name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Right-aligned controls cluster */}
            <div className="ml-auto flex items-center gap-5 pl-5 border-l border-[hsl(var(--border-tertiary))]">
              <button
                type="button"
                onClick={handleCriticalOnly}
                className="text-[13px] text-primary hover:underline whitespace-nowrap"
              >
                Critical only
              </button>
              <label className="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer whitespace-nowrap">
                <Switch checked={showRangeBands} onCheckedChange={setShowRangeBands} className="h-4 w-7" />
                Range bands
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Chart + Control Actions Side Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <ChartCard
          title="Process Monitoring"
          subtitle="Normalised % of operating range"
        >
          <ProcessChart
            timeseries={timeseries}
            selectedParams={selectedParams}
            parameters={PARAMETERS}
            eventMarkers={eventMarkers}
            highlightedEventH={highlightedEventH}
            showRangeBands={showRangeBands}
          />
        </ChartCard>

        <Card kind="operational" className="overflow-hidden p-0">
          <ControlActionsPanel
            events={runEvents}
            runStartTime={run.start_time}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
            canLogEvents={canLogEvents}
            onLogEvent={openNewEvent}
          />
        </Card>
      </div>

      {/* ── Event Log ── */}
      <ChartCard
        title="Event Log"
        subtitle={
          <div className="flex items-center justify-between w-full">
            <span>Recorded events for this run</span>
            {canLogEvents && (
              <Button size="sm" onClick={openNewEvent}>Log Event</Button>
            )}
          </div>
        }
      >
        <DataTable data={runEvents} columns={eventColumns} />
      </ChartCard>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Log New Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Event Type</label>
                <Select value={eventForm.event_type} onValueChange={(v) => setEventForm((f) => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Timestamp</label>
                <Input type="datetime-local" value={eventForm.timestamp}
                  onChange={(e) => setEventForm((f) => ({ ...f, timestamp: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Subtype</label>
                <Input value={eventForm.subtype} placeholder="e.g. NaHCO3"
                  onChange={(e) => setEventForm((f) => ({ ...f, subtype: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" step="0.01" value={eventForm.amount}
                  onChange={(e) => setEventForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Unit</label>
                <Input value={eventForm.amount_unit} placeholder="mL"
                  onChange={(e) => setEventForm((f) => ({ ...f, amount_unit: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={eventForm.notes} rows={2}
                onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveEvent}>{editingEvent ? "Update" : "Log Event"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
