import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  animationDelay?: number;
}

export function ChartCard({ title, subtitle, children, className, animationDelay = 0 }: ChartCardProps) {
  return (
    <Card 
      className={`opacity-0 animate-fade-in-scale transition-shadow hover:shadow-md ${className || ""}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
