import { useNavigate } from "react-router-dom";
import { ArrowRight, FlaskConical, Filter, Droplets } from "lucide-react";
import { OverviewHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Stage = {
  id: string;
  name: string;
  equipmentClass: string;
  stageLabel: string;
  status: "Active" | "Complete";
  route: string;
  icon: typeof FlaskConical;
};

const STAGES: Stage[] = [
  {
    id: "BR-003-p",
    name: "Bioreactor BR-003-p",
    equipmentClass: "Stirred-Tank Bioreactor",
    stageLabel: "Upstream — Fed-Batch Cultivation",
    status: "Active",
    route: "/cho-production-line/bioreactor",
    icon: FlaskConical,
  },
  {
    id: "CFG-003",
    name: "Centrifuge CFG-003",
    equipmentClass: "Disc-Stack Centrifuge",
    stageLabel: "Downstream — Cell Removal",
    status: "Complete",
    route: "/cho-production-line/centrifuge",
    icon: Filter,
  },
  {
    id: "UF-03",
    name: "UF Skid UF-03",
    equipmentClass: "Tangential Flow Filtration Skid",
    stageLabel: "Downstream — Concentration / Diafiltration",
    status: "Complete",
    route: "/cho-production-line/ultrafiltration",
    icon: Droplets,
  },
];

export default function CHOProductionLinePage() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <OverviewHeader
        title="CHO Production Line"
        description="End-to-end recombinant protein production chain — upstream cultivation through downstream purification."
      />

      {/* Campaign banner */}
      <div className="mb-8 rounded-md border border-border-tertiary bg-[hsl(var(--nav-active-bg))] px-5 py-4 flex items-center flex-wrap gap-x-8 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">Campaign ID</span>
          <span className="text-[14px] text-foreground">FSH-Campaign-042</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">Product</span>
          <span className="text-[14px] text-foreground">rhFSH</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">Status</span>
          <span><Badge variant="warning">In Progress</Badge></span>
        </div>
      </div>

      {/* Process chain */}
      <section>
        <h2 className="text-section text-foreground mb-4">Process Chain</h2>
        <div className="flex items-stretch gap-3 flex-wrap lg:flex-nowrap">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="flex items-stretch gap-3 flex-1 min-w-[260px]">
                <Card
                  kind="operational"
                  onClick={() => navigate(stage.route)}
                  className="flex-1 cursor-pointer hover:border-primary/60 transition-colors p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-9 w-9 rounded-md bg-[hsl(var(--nav-active-bg))] text-primary flex items-center justify-center">
                      <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                    </div>
                    <Badge variant={stage.status === "Active" ? "success" : "neutral"}>
                      {stage.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                      Step {idx + 1}
                    </div>
                    <div className="text-[15px] text-foreground font-medium mt-0.5">{stage.id}</div>
                    <div className="text-[12px] text-text-secondary mt-0.5">{stage.equipmentClass}</div>
                  </div>
                  <div className="text-[12px] text-foreground/80 border-t border-border-tertiary pt-2 mt-auto">
                    {stage.stageLabel}
                  </div>
                </Card>
                {idx < STAGES.length - 1 && (
                  <div className="flex items-center text-text-secondary shrink-0">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
