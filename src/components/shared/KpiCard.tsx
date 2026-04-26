import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  /** Optional small caption shown beneath the value (e.g. "+3 vs last week"). */
  subtitle?: string;
  /** Status icon ONLY (per spec, summary tiles do not carry decorative icons). */
  Icon?: LucideIcon;
  /** Tone applies a subtle status-color accent to the optional icon. */
  tone?: "primary" | "active" | "idle" | "warning" | "error";
  className?: string;
  animationDelay?: number;
  /**
   * @deprecated Trend chips are not part of the Summary card anatomy.
   * Kept only so existing call-sites continue to compile; values are ignored.
   */
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

const TONE_ICON: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  primary: "text-primary",
  active:  "text-status-active",
  idle:    "text-text-secondary",
  warning: "text-status-warning",
  error:   "text-status-error",
};

/**
 * Summary card (KPI tile) — Data Vest design system, type 1 of 3.
 * bg-secondary · no border · radius 8px · padding 16px.
 * Label 13/400 muted above, value 24/500 below. Status icon only (optional).
 */
export function KpiCard({
  label,
  value,
  subtitle,
  Icon,
  tone = "primary",
  className,
  animationDelay = 0,
}: KpiCardProps) {
  return (
    <div
      className={`card-summary opacity-0 animate-fade-in ${className || ""}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-normal text-text-secondary">{label}</p>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${TONE_ICON[tone]}`} />}
      </div>
      <p className="text-kpi tabular-nums text-foreground mt-2">{value}</p>
      {subtitle && (
        <p className="text-[11px] text-text-secondary mt-1">{subtitle}</p>
      )}
    </div>
  );
}
