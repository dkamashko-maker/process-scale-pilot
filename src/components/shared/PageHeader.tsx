import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page header primitives — Data Vest design system.
 * Two and only two header models exist; do not mix them on the same page.
 *
 *   <OverviewHeader>   — list/landing pages
 *   <DetailHeader>     — entity/detail pages with status + ≤5 metadata fields
 *
 * Typography is enforced globally (h1 = 20px / 500, label rows = 11px / 14px).
 */

interface OverviewHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function OverviewHeader({ title, description, actions, className }: OverviewHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between gap-6 mb-8", className)}>
      <div className="min-w-0">
        <h1>{title}</h1>
        {description && (
          <p className="text-[14px] text-text-secondary mt-1.5 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

interface DetailMeta {
  label: string;
  value: ReactNode;
}

interface DetailHeaderProps {
  /** Entity name — rendered as h1 (20px / 500). */
  name: string;
  /** Status pill rendered inline beside the name. */
  status?: ReactNode;
  /** Up to 5 compact metadata pairs (11px label / 14px value). */
  meta?: DetailMeta[];
  /** Primary right-aligned CTA(s). */
  actions?: ReactNode;
  className?: string;
}

export function DetailHeader({ name, status, meta = [], actions, className }: DetailHeaderProps) {
  const fields = meta.slice(0, 5);
  return (
    <header className={cn("mb-8", className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1>{name}</h1>
            {status}
          </div>
          {fields.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
              {fields.map((f) => (
                <div key={f.label} className="flex flex-col gap-0.5 min-w-0">
                  <dt className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                    {f.label}
                  </dt>
                  <dd className="text-[14px] text-foreground font-normal truncate">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
