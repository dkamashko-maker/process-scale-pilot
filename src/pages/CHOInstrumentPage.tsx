import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { DetailHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RunMetadataPanel } from "@/components/cho/RunMetadataPanel";
import { PhaseTimeline } from "@/components/cho/PhaseTimeline";
import { MonitoringCharts } from "@/components/cho/MonitoringCharts";

type InstrumentSpec = {
  id: string;
  name: string;
  equipmentClass: string;
  stage: string;
  status: "Active" | "Complete";
  meta: { label: string; value: string }[];
};

interface Props {
  spec: InstrumentSpec;
}

export default function CHOInstrumentPage({ spec }: Props) {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 h-8 text-text-secondary"
        onClick={() => navigate("/cho-production-line")}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        CHO Production Line
      </Button>

      <DetailHeader
        name={spec.name}
        status={
          <Badge variant={spec.status === "Active" ? "success" : "neutral"}>
            {spec.status}
          </Badge>
        }
        meta={spec.meta}
      />

      {spec.id === "BR-003-p" && (
        <div className="mb-6">
          <PhaseTimeline />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card kind="operational" className="p-6">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
              Process Stage
            </div>
            <div className="text-[15px] text-foreground mt-1">{spec.stage}</div>
            <div className="mt-4 text-[13px] text-text-secondary">
              Detailed monitoring, metadata, and ledger views for {spec.equipmentClass.toLowerCase()}{" "}
              <span className="text-foreground">{spec.id}</span> will appear here once data
              ingestion is connected.
            </div>
          </Card>
          {spec.id === "BR-003-p" && <MonitoringCharts />}
        </div>
        {spec.id === "BR-003-p" && <RunMetadataPanel />}
      </div>
    </div>
  );
}

export const BIOREACTOR_SPEC: InstrumentSpec = {
  id: "BR-003-p",
  name: "Bioreactor BR-003-p",
  equipmentClass: "Stirred-Tank Bioreactor",
  stage: "Upstream — Fed-Batch Cultivation",
  status: "Active",
  meta: [
    { label: "Equipment Class", value: "Stirred-Tank Bioreactor" },
    { label: "Stage", value: "Upstream" },
    { label: "Strategy", value: "Fed-Batch" },
    { label: "Cell Line", value: "CHO-DG44 / r-hFSHβ" },
    { label: "Product", value: "rhFSH" },
  ],
};

export const CENTRIFUGE_SPEC: InstrumentSpec = {
  id: "CFG-003",
  name: "Centrifuge CFG-003",
  equipmentClass: "Disc-Stack Centrifuge",
  stage: "Downstream — Cell Removal",
  status: "Complete",
  meta: [
    { label: "Equipment Class", value: "Disc-Stack Centrifuge" },
    { label: "Stage", value: "Downstream" },
    { label: "Operation", value: "Cell Removal / Clarification" },
    { label: "Feed Source", value: "BR-003-p" },
    { label: "Product", value: "rhFSH" },
  ],
};

export const UF_SPEC: InstrumentSpec = {
  id: "UF-03",
  name: "UF Skid UF-03",
  equipmentClass: "Tangential Flow Filtration Skid",
  stage: "Downstream — Concentration / Diafiltration",
  status: "Complete",
  meta: [
    { label: "Equipment Class", value: "TFF Skid" },
    { label: "Stage", value: "Downstream" },
    { label: "Operation", value: "Concentration / Diafiltration" },
    { label: "Feed Source", value: "CFG-003" },
    { label: "Product", value: "rhFSH" },
  ],
};
