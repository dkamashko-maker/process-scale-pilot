import { ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Field = {
  label: string;
  value: string;
  link?: boolean;
};

const FIELDS: Field[] = [
  { label: "Batch No:", value: "CHO-r-hFSG-456-250308-2" },
  { label: "Cell Line (link):", value: "CHO-DG44/r-hFSHβ-α-clone_127", link: true },
  { label: "Target Protein:", value: "Recombinant human FSH (rhFSH)" },
  { label: "Bioreactor No (link)", value: "BR-003-p" },
  { label: "Bioreactor Run", value: "R-456" },
  { label: "Operator: (link)", value: "20-456", link: true },
  { label: "Supervisor: (link)", value: "10-032", link: true },
  { label: "Start Time:", value: "2025-03-08 06:00 UTC" },
  { label: "End Time:", value: "2025-03-22 14:30 UTC" },
  { label: "Total time:", value: "14 days 8 hours 30 minutes" },
  { label: "Cultivation Strategy:", value: "Fed-Batch" },
  { label: "Basal Growth Medium (link):", value: "Gibco Dynamis Medium", link: true },
  { label: "Feed Medium (link):", value: "Gibco EfficientFeed C+", link: true },
  { label: "Initial volume:", value: "1.0 L" },
  { label: "Initial seed (VCD)", value: "0.5 × 10⁶ cells/mL" },
  { label: "Current Phase:", value: "Production Phase" },
  { label: "SOP Version", value: "SOP-CULT-03.9" },
  { label: "Cleaning Status", value: "Clean (validated)" },
];

export function RunMetadataPanel() {
  return (
    <Card kind="operational" className="p-0">
      <CardHeader className="border-b border-border-tertiary">
        <CardTitle>Run Metadata</CardTitle>
        <p className="text-[12px] text-text-secondary">Read-only · Source: Meta sheet</p>
      </CardHeader>
      <CardContent className="p-0">
        <dl className="divide-y divide-border-tertiary">
          {FIELDS.map((f) => (
            <div key={f.label} className="px-4 py-2.5 flex flex-col gap-0.5">
              <dt className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                {f.label}
              </dt>
              <dd className="text-[13px] text-foreground">
                {f.link ? (
                  <span className="inline-flex items-center gap-1 underline underline-offset-2 decoration-border-secondary hover:decoration-foreground cursor-default">
                    {f.value}
                    <ExternalLink className="h-3 w-3 text-text-secondary" />
                  </span>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
