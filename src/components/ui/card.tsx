import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card — Data Vest design system.
 * Two of the three official card types render through this component:
 *   - "data"        (default) — white bg, 0.5px border-tertiary, radius 8px
 *   - "operational"           — white bg, 0.5px border-tertiary, radius 12px, pad 16px
 * The third type — Summary — is the dedicated <KpiCard /> component.
 */
type CardKind = "data" | "operational";

const CardImpl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { kind?: CardKind }
>(({ className, kind = "data", ...props }, ref) => (
  <div
    ref={ref}
    data-card-kind={kind}
    className={cn(
      kind === "operational" ? "card-operational" : "card-data text-card-foreground",
      className,
    )}
    {...props}
  />
));
CardImpl.displayName = "Card";

const Card = CardImpl;

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // Section heading: 16px / 500
    <h3 ref={ref} className={cn("text-section text-foreground", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-[13px] text-text-secondary", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-4 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
