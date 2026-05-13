import { Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  name: string;
  result: string;
  spec?: string;
  method: string;
  status?: "PASS" | "INFO";
}

/**
 * Visual style for qualitative (text-based) QC outcomes. Uses a quote-card
 * format to clearly distinguish from numeric pass/fail results.
 */
export function QualitativeResultCard({
  name, result, spec, method, status = "PASS",
}: Props) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
          {name}
        </span>
        <Badge variant="neutral" className="ml-1">Qualitative</Badge>
      </div>

      <blockquote className="mt-2 relative rounded-md border border-border-tertiary bg-muted/30 px-3 py-2.5 pl-7">
        <Quote
          className="absolute left-2 top-2 h-3.5 w-3.5 text-text-secondary opacity-70"
          aria-hidden
        />
        <p className="text-[13px] italic text-foreground leading-snug">{result}</p>
      </blockquote>

      <dl className="mt-3 grid grid-cols-[90px_1fr] gap-y-1 text-[12px]">
        {spec && <>
          <dt className="text-text-secondary">Spec</dt>
          <dd className="text-foreground">{spec}</dd>
        </>}
        <dt className="text-text-secondary">Method</dt>
        <dd className="text-foreground">{method}</dd>
        <dt className="text-text-secondary">Status</dt>
        <dd>
          {status === "PASS"
            ? <Badge variant="success">PASS</Badge>
            : <Badge variant="neutral">Info</Badge>}
        </dd>
      </dl>
    </div>
  );
}
