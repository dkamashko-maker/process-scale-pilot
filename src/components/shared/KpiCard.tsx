import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  subtitle?: string;
  className?: string;
}

export function KpiCard({ label, value, trend, trendValue, subtitle, className }: KpiCardProps) {
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600" />;
    if (trend === "neutral") return <Minus className="h-4 w-4 text-muted-foreground" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === "up") return "text-green-600";
    if (trend === "down") return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <Card className={`p-6 ${className || ""}`}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-3">
          <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
              {getTrendIcon()}
              {trendValue && <span>{trendValue}</span>}
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </Card>
  );
}
