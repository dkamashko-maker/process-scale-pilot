import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Status pill — Data Vest design system.
 * Exactly four semantic variants are permitted across the product:
 *   success | warning | danger | neutral
 * Legacy variants (default/secondary/destructive/outline) are mapped onto
 * these four so older call-sites keep working without visual drift.
 *
 * Spec: 11px / weight 500 / uppercase / 20px radius / 8px horizontal pad / 22px height.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 h-[22px] px-2 rounded-pill text-pill uppercase whitespace-nowrap border-0 transition-colors",
  {
    variants: {
      variant: {
        // Canonical 4
        success: "bg-[hsl(var(--pill-success-bg))] text-[hsl(var(--pill-success-fg))]",
        warning: "bg-[hsl(var(--pill-warning-bg))] text-[hsl(var(--pill-warning-fg))]",
        danger:  "bg-[hsl(var(--pill-danger-bg))]  text-[hsl(var(--pill-danger-fg))]",
        neutral: "bg-[hsl(var(--pill-neutral-bg))] text-[hsl(var(--pill-neutral-fg))]",

        // Legacy aliases — mapped to canonical variants
        default:     "bg-[hsl(var(--pill-neutral-bg))] text-[hsl(var(--pill-neutral-fg))]",
        secondary:   "bg-[hsl(var(--pill-neutral-bg))] text-[hsl(var(--pill-neutral-fg))]",
        destructive: "bg-[hsl(var(--pill-danger-bg))]  text-[hsl(var(--pill-danger-fg))]",
        outline:     "bg-transparent text-text-secondary border border-border-tertiary",
      },
      withDot: {
        true: "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:inline-block",
        false: "",
      },
    },
    defaultVariants: {
      variant: "neutral",
      withDot: false,
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, withDot, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, withDot }), className)} {...props} />;
}

export { Badge, badgeVariants };
