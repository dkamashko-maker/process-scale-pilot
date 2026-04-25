import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  subtitle?: string;
  className?: string;
  animationDelay?: number;
  Icon?: LucideIcon;
  tone?: "primary" | "active" | "idle" | "warning" | "error";
}

const TONE_CFG: Record<NonNullable<KpiCardProps["tone"]>, { iconBg: string; iconCls: string; ring: string }> = {
  primary: { iconBg: "bg-primary/10",        iconCls: "text-primary",        ring: "hover:border-primary/40" },
  active:  { iconBg: "bg-status-active/15",  iconCls: "text-status-active",  ring: "hover:border-status-active/50" },
  idle:    { iconBg: "bg-status-idle/15",    iconCls: "text-status-idle",    ring: "hover:border-status-idle/40" },
  warning: { iconBg: "bg-status-warning/15", iconCls: "text-status-warning", ring: "hover:border-status-warning/50" },
  error:   { iconBg: "bg-status-error/15",   iconCls: "text-status-error",   ring: "hover:border-status-error/50" },
};

export function KpiCard({
  label, value, trend, trendValue, subtitle, className,
  animationDelay = 0, Icon, tone = "primary",
}: KpiCardProps) {
  const cfg = TONE_CFG[tone];
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-status-active" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-status-error" />;
    if (trend === "neutral") return <Minus className="h-4 w-4 text-muted-foreground" />;
    return null;
  };
  const getTrendColor = () => {
    if (trend === "up") return "text-status-active";
    if (trend === "down") return "text-status-error";
    return "text-muted-foreground";
  };

  return (
    <div
      className={`rounded-lg border bg-card p-5 shadow-tile transition-all opacity-0 animate-fade-in ${cfg.ring} ${className || ""}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className={`h-11 w-11 rounded-md flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
            <Icon className={`h-5 w-5 ${cfg.iconCls}`} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground truncate">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3
              className="text-3xl font-bold tracking-tight tabular-nums opacity-0 animate-count-up"
              style={{ animationDelay: `${animationDelay + 150}ms` }}
            >
              {value}
            </h3>
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                {trendValue && <span>{trendValue}</span>}
              </div>
            )}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
