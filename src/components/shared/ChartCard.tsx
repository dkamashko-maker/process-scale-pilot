import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
