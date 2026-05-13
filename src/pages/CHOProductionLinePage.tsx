import { useNavigate } from "react-router-dom";
import {
  ArrowRight, FlaskConical, Filter, Droplets, Beaker,
  Sparkles, Flame, Syringe, Snowflake, Tag, AlertTriangle,
} from "lucide-react";
import { OverviewHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = "Complete" | "In Progress" | "Not Started";

type Node = {
  id: string;
  step: string;
  route: string;
  icon: typeof FlaskConical;
  status: Status;
};

const DS_LANE: Node[] = [
  { id: "BR-003-p", step: "Cultivation",            route: "/cho-production-line/bioreactor",      icon: FlaskConical, status: "Complete" },
  { id: "CFG-003",  step: "Cell Removal",           route: "/cho-production-line/centrifuge",      icon: Filter,       status: "Complete" },
  { id: "UF-03",    step: "Concentration / DF",     route: "/cho-production-line/ultrafiltration", icon: Droplets,     status: "Complete" },
  { id: "FPLC-01",  step: "Anion Exchange",         route: "/cho-production-line/fplc",            icon: Beaker,       status: "Complete" },
];

const CP_LANE: Node[] = [
  { id: "VW-03",  step: "Vial Washing",      route: "/cho-production-line/vial-washer",    icon: Sparkles, status: "Complete" },
  { id: "DPY-01", step: "Depyrogenation",    route: "/cho-production-line/depyrogenation", icon: Flame,    status: "Complete" },
];

const FF_LANE: Node[] = [
  { id: "FP-02",  step: "Aseptic Filling",       route: "/cho-production-line/filling-pump", icon: Syringe,   status: "Complete" },
  { id: "LPZ-03", step: "Lyophilization",        route: "/cho-production-line/lyophilizer",  icon: Snowflake, status: "Complete" },
  { id: "CAP-01", step: "Capping & Labelling",   route: "/cho-production-line/capping",      icon: Tag,       status: "Complete" },
];

function statusBadge(status: Status) {
  if (status === "Complete")   return <Badge variant="success">Complete</Badge>;
  if (status === "In Progress") return <Badge variant="warning">In Progress</Badge>;
  return <Badge variant="neutral">Not Started</Badge>;
}

function NodeCard({ node, onClick }: { node: Node; onClick: () => void }) {
  const Icon = node.icon;
  return (
    <Card
      kind="operational"
      onClick={onClick}
      className="cursor-pointer hover:border-primary/60 transition-colors p-3 w-[180px] flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="h-8 w-8 rounded-md bg-[hsl(var(--nav-active-bg))] text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        {statusBadge(node.status)}
      </div>
      <div>
        <div className="text-[13px] text-foreground font-medium">{node.id}</div>
        <div className="text-[11px] text-text-secondary mt-0.5">{node.step}</div>
      </div>
    </Card>
  );
}

function LaneRow({ nodes, onSelect }: { nodes: Node[]; onSelect: (n: Node) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {nodes.map((n, i) => (
        <div key={n.id} className="flex items-center gap-2">
          <NodeCard node={n} onClick={() => onSelect(n)} />
          {i < nodes.length - 1 && <ArrowRight className="h-4 w-4 text-text-secondary shrink-0" />}
        </div>
      ))}
    </div>
  );
}

export default function CHOProductionLinePage() {
  const navigate = useNavigate();
  const go = (n: Node) => navigate(n.route);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <OverviewHeader
        title="CHO Production Line"
        description="End-to-end recombinant protein production chain — upstream cultivation through downstream purification, container preparation, and fill-finish."
      />

      {/* Campaign banner */}
      <div className="mb-4 rounded-md border border-border-tertiary bg-[hsl(var(--nav-active-bg))] px-5 py-4 flex items-center flex-wrap gap-x-8 gap-y-2">
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

      {/* Data quality notice */}
      <div className="mb-8 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-300 shrink-0" />
        <div className="text-[12px] text-foreground leading-relaxed">
          <span className="font-medium">2 equipment ID data entry errors detected:</span>{" "}
          FPLC source file shows <span className="font-mono">UF-03</span>{" "}
          (corrected to <span className="font-mono">FPLC-01</span>);{" "}
          Depyrogenation Oven shows <span className="font-mono">VW-03</span>{" "}
          (corrected to <span className="font-mono">DPY-01</span>).
        </div>
      </div>

      {/* Process chain — two swim lanes converging at fill-finish */}
      <section>
        <h2 className="text-section text-foreground mb-4">Process Chain</h2>

        <div className="space-y-6">
          {/* Drug Substance lane */}
          <div className="rounded-md border border-border-tertiary p-5">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-3">
              Drug Substance Lane
            </div>
            <LaneRow nodes={DS_LANE} onSelect={go} />
          </div>

          {/* Container Preparation lane */}
          <div className="rounded-md border border-border-tertiary p-5">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-3">
              Container Preparation Lane
            </div>
            <LaneRow nodes={CP_LANE} onSelect={go} />
          </div>

          {/* Convergence indicator */}
          <div className="flex items-center justify-center gap-3 text-text-secondary text-[12px]">
            <div className="flex-1 border-t border-dashed border-border-tertiary" />
            <span className="uppercase tracking-wide text-[11px] font-medium">
              Streams converge → Fill-Finish
            </span>
            <div className="flex-1 border-t border-dashed border-border-tertiary" />
          </div>

          {/* Fill-Finish lane */}
          <div className="rounded-md border border-border-tertiary p-5 bg-[hsl(var(--nav-active-bg))]/40">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-3">
              Fill-Finish Lane
            </div>
            <LaneRow nodes={FF_LANE} onSelect={go} />
          </div>
        </div>
      </section>
    </div>
  );
}
