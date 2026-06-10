import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, FlaskConical, Filter, Droplets, Beaker,
  Sparkles, Flame, Syringe, Snowflake, Tag, AlertTriangle,
} from "lucide-react";
import { OverviewHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Status = "Complete" | "In Progress" | "Not Started";

type Node = {
  id: string;
  step: string;
  route: string;
  icon: typeof FlaskConical;
  status: Status;
};

const DS_STAGE: Node[] = [
  { id: "BR-003-p", step: "Cultivation",            route: "/cho-production-line/bioreactor",      icon: FlaskConical, status: "Complete" },
  { id: "CFG-003",  step: "Cell Removal",           route: "/cho-production-line/centrifuge",      icon: Filter,       status: "Complete" },
  { id: "UF-03",    step: "Concentration / DF",     route: "/cho-production-line/ultrafiltration", icon: Droplets,     status: "Complete" },
  { id: "FPLC-01",  step: "Anion Exchange",         route: "/cho-production-line/fplc",            icon: Beaker,       status: "Complete" },
];

const CP_STAGE: Node[] = [
  { id: "VW-03",  step: "Vial Washing",      route: "/cho-production-line/vial-washer",    icon: Sparkles, status: "Complete" },
  { id: "DPY-01", step: "Depyrogenation",    route: "/cho-production-line/depyrogenation", icon: Flame,    status: "Complete" },
];

const FF_STAGE: Node[] = [
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

function StageRow({ nodes, onSelect }: { nodes: Node[]; onSelect: (n: Node) => void }) {
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

  const processChainRef = useRef<HTMLElement>(null);
  const materialBalanceRef = useRef<HTMLElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <OverviewHeader
        title="CHO Production Line"
        description="End-to-end recombinant protein production chain — upstream cultivation through downstream purification, container preparation, and fill-finish."
      />

      {/* Local section navigation */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="outline" size="sm" onClick={() => scrollTo(processChainRef)}>
          Process Chain
        </Button>
        <Button variant="outline" size="sm" onClick={() => scrollTo(materialBalanceRef)}>
          Material Balance
        </Button>
      </div>

      {/* Data quality notice */}
      <div className="mb-4 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-300 shrink-0" />
        <div className="text-[12px] text-foreground leading-relaxed">
          <span className="font-medium">2 equipment ID data entry errors detected:</span>{" "}
          FPLC source file shows <span className="font-mono">UF-03</span>{" "}
          (corrected to <span className="font-mono">FPLC-01</span>);{" "}
          Depyrogenation Oven shows <span className="font-mono">VW-03</span>{" "}
          (corrected to <span className="font-mono">DPY-01</span>).
        </div>
      </div>

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

      {/* Process chain — two process stages converging at fill-finish */}
      <section ref={processChainRef}>
        <h2 className="text-section text-foreground mb-4">Process Chain</h2>

        <div className="space-y-6">
          {/* Drug Substance stage */}
          <div className="rounded-md border border-border-tertiary p-5">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-3">
              Drug Substance Stage
            </div>
            <StageRow nodes={DS_STAGE} onSelect={go} />
          </div>

          {/* Container Preparation stage */}
          <div className="rounded-md border border-border-tertiary p-5">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-3">
              Container Preparation Stage
            </div>
            <StageRow nodes={CP_STAGE} onSelect={go} />
          </div>

          {/* Convergence indicator */}
          <div className="flex items-center justify-center gap-3 text-text-secondary text-[12px]">
            <div className="flex-1 border-t border-dashed border-border-tertiary" />
            <span className="uppercase tracking-wide text-[11px] font-medium">
              Streams converge → Fill-Finish
            </span>
            <div className="flex-1 border-t border-dashed border-border-tertiary" />
          </div>

          {/* Fill-Finish stage */}
          <div className="rounded-md border border-border-tertiary p-5 bg-[hsl(var(--nav-active-bg))]/40">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-3">
              Fill-Finish Stage
            </div>
            <StageRow nodes={FF_STAGE} onSelect={go} />
          </div>
        </div>
      </section>

      {/* Material Balance mini-widget */}
      <section className="mt-8" ref={materialBalanceRef}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-section text-foreground">Material Balance — Vial Counts</h2>
          <Badge variant="neutral" className="font-mono text-[11px]">
            Completed batch B-250318-FF07
          </Badge>
        </div>
        <Card kind="operational" className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              { id: "VW-03", label: "Processed", count: "12,000", note: "Cleaned" },
              { id: "DPY-01", label: "Depyrogenated", count: "12,000", note: "Sterile vials" },
              { id: "FP-02", label: "Filled", count: "11,940", note: "60 fill rejects" },
              { id: "LPZ-03", label: "Lyophilised", count: "11,928", note: "12 cake defects" },
              { id: "CAP-01", label: "Released", count: "11,902", note: "26 cap/label rejects" },
            ].map((s, i, arr) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex-1 rounded-md border border-border-tertiary bg-background p-3">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="neutral" className="font-mono text-[10px]">{s.id}</Badge>
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-text-secondary mt-1">
                    {s.label}
                  </div>
                  <div className="text-[20px] tabular-nums text-foreground">
                    {s.count}
                  </div>
                  <div className="text-[10px] text-text-secondary">{s.note}</div>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="hidden lg:block h-4 w-4 text-text-secondary shrink-0" />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-text-secondary">
            Reconciled material balance for completed batch{" "}
            <span className="font-mono">B-250318-FF07</span>: each stage is consistent with
            upstream counts. Total yield <span className="font-medium text-foreground">11,902 / 12,000 (99.2 %)</span>,
            98 vials accounted for as in-process rejects.
          </p>

          {/* Detailed downstream product balance */}
          <div className="mt-5">
            <h3 className="text-[12px] font-medium text-foreground mb-2">
              Downstream Product Balance — Batch B-250318-FF07
            </h3>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Process Step & Equipment</TableHead>
                    <TableHead className="text-[11px]">Input</TableHead>
                    <TableHead className="text-[11px]">Yield / Output</TableHead>
                    <TableHead className="text-[11px]">Losses / Waste</TableHead>
                    <TableHead className="text-[11px]">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { step: "Cell Culture Harvest", eq: "BR-003-p", input: "5,000 g", output: "4,990 g", loss: "10 g", remark: "Cell retention, in-process samples" },
                    { step: "Centrifugation", eq: "CFG-003", input: "4,990 g", output: "4,920 g", loss: "70 g", remark: "Cell pellet and debris discarded" },
                    { step: "UF / Diafiltration", eq: "UF-03", input: "4,920 g", output: "4,770 g", loss: "150 g", remark: "Permeate and buffer exchange losses" },
                    { step: "Anion Exchange", eq: "FPLC-01", input: "4,770 g", output: "4,400 g", loss: "370 g", remark: "Flow-through and strip/wash fractions" },
                    { step: "Aseptic Filling", eq: "FP-02", input: "4,400 g", output: "4,380 g", loss: "20 g", remark: "Hold-up volume, 60 fill rejects" },
                    { step: "Lyophilization", eq: "LPZ-03", input: "4,380 g", output: "4,380 g", loss: "—", remark: "Mass conserved; water removed as vapor" },
                    { step: "Capping & Labelling", eq: "CAP-01", input: "4,380 g", output: "4,372 g", loss: "8 g", remark: "26 cap/label rejects" },
                  ].map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-[11px]">
                        <div className="font-medium">{row.step}</div>
                        <div className="text-text-secondary font-mono">{row.eq}</div>
                      </TableCell>
                      <TableCell className="text-[11px] tabular-nums">{row.input}</TableCell>
                      <TableCell className="text-[11px] tabular-nums">{row.output}</TableCell>
                      <TableCell className="text-[11px] tabular-nums">{row.loss}</TableCell>
                      <TableCell className="text-[11px] text-text-secondary">{row.remark}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 text-[11px] text-text-secondary">
              Overall protein recovery: <span className="font-medium text-foreground">4,372 g / 5,000 g (87.4 %)</span>. Losses are within expected ranges for a 4-step downstream train with UF/DF and AEX polishing.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
