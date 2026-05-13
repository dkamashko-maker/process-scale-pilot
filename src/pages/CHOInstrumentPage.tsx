import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { DetailHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RunMetadataPanel } from "@/components/cho/RunMetadataPanel";
import { PhaseTimeline } from "@/components/cho/PhaseTimeline";
import { MonitoringCharts } from "@/components/cho/MonitoringCharts";
import { OfflineMeasurements } from "@/components/cho/OfflineMeasurements";
import { QCReport } from "@/components/cho/QCReport";
import { CentrifugeView } from "@/components/cho/CentrifugeView";
import { UltrafiltrationView } from "@/components/cho/UltrafiltrationView";
import { FPLCView } from "@/components/cho/FPLCView";
import { DepyrogenationView } from "@/components/cho/DepyrogenationView";
import { CampaignBreadcrumb } from "@/components/cho/CampaignBreadcrumb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type InstrumentSpec = {
  id: string;
  name: string;
  equipmentClass: string;
  stage: string;
  status: "Active" | "Complete";
  meta: { label: string; value: string }[];
  /** Persistent campaign-banner refs */
  refs: { primary: string; secondary?: string }[];
  oos?: boolean;
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

      <CampaignBreadcrumb
        instrument={spec.id}
        refs={spec.refs}
        status={spec.status === "Active" ? "in-progress" : "complete"}
      />

      <DetailHeader
        name={spec.name}
        status={
          <div className="flex items-center gap-2">
            <Badge variant={spec.status === "Active" ? "success" : "neutral"}>
              {spec.status}
            </Badge>
            {spec.oos && <Badge variant="danger">OOS</Badge>}
          </div>
        }
        meta={spec.meta}
      />

      {spec.id === "BR-003-p" ? (
        <Tabs defaultValue="monitoring" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="offline">Offline Measurements</TabsTrigger>
            <TabsTrigger value="qc">QC Report</TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring" className="mt-0">
            <div className="mb-6">
              <PhaseTimeline />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
              <div className="space-y-6 min-w-0">
                <MonitoringCharts />
              </div>
              <RunMetadataPanel />
            </div>
          </TabsContent>

          <TabsContent value="offline" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
              <div className="min-w-0">
                <OfflineMeasurements />
              </div>
              <RunMetadataPanel />
            </div>
          </TabsContent>

          <TabsContent value="qc" className="mt-0">
            <QCReport />
          </TabsContent>
        </Tabs>
      ) : spec.id === "CFG-003" ? (
        <Tabs defaultValue="monitoring" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          </TabsList>
          <TabsContent value="monitoring" className="mt-0">
            <CentrifugeView tab="monitoring" />
          </TabsContent>
          <TabsContent value="quality" className="mt-0">
            <CentrifugeView tab="quality" />
          </TabsContent>
        </Tabs>
      ) : spec.id === "UF-03" ? (
        <Tabs defaultValue="monitoring" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="offline">Offline QC Results</TabsTrigger>
          </TabsList>
          <TabsContent value="monitoring" className="mt-0">
            <UltrafiltrationView tab="monitoring" />
          </TabsContent>
          <TabsContent value="offline" className="mt-0">
            <UltrafiltrationView tab="offline" />
          </TabsContent>
        </Tabs>
      ) : spec.id === "FPLC-01" ? (
        <FPLCView />
      ) : (
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
      )}
    </div>
  );
}

export const BIOREACTOR_SPEC: InstrumentSpec = {
  id: "BR-003-p",
  name: "Bioreactor BR-003-p",
  equipmentClass: "Stirred-Tank Bioreactor",
  stage: "Upstream — Fed-Batch Cultivation",
  status: "Active",
  oos: true,
  refs: [{ primary: "CHO-r-hFSG-456-250308-2", secondary: "Run R-456" }],
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
  refs: [{ primary: "FSH-B042-24", secondary: "Run FSH-B042-24-C1" }],
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
  refs: [{ primary: "FSH-2025-042" }],
  meta: [
    { label: "Equipment Class", value: "TFF Skid" },
    { label: "Stage", value: "Downstream" },
    { label: "Operation", value: "Concentration / Diafiltration" },
    { label: "Feed Source", value: "CFG-003" },
    { label: "Product", value: "rhFSH" },
  ],
};

export const FPLC_SPEC: InstrumentSpec = {
  id: "FPLC-01",
  name: "Chromatography FPLC-01",
  equipmentClass: "FPLC — Anion Exchange Chromatography",
  stage: "Downstream — Anion Exchange Purification",
  status: "Complete",
  refs: [{ primary: "FSH-2025-042-FPLC" }],
  meta: [
    { label: "Equipment Class", value: "FPLC System" },
    { label: "Stage", value: "Downstream" },
    { label: "Operation", value: "Anion Exchange Purification" },
    { label: "Feed Source", value: "UF-03" },
    { label: "Product", value: "rhFSH" },
  ],
};

export const VW_SPEC: InstrumentSpec = {
  id: "VW-03",
  name: "Vial Washer VW-03",
  equipmentClass: "Automated Vial Washer",
  stage: "Container Preparation — Vial Washing",
  status: "Complete",
  refs: [{ primary: "FSH-2025-042-VW" }],
  meta: [
    { label: "Equipment Class", value: "Vial Washer" },
    { label: "Stage", value: "Container Preparation" },
    { label: "Operation", value: "WFI Rinse / Cleaning" },
    { label: "Feed Source", value: "Empty Vials" },
    { label: "Product", value: "Cleaned Vials" },
  ],
};

export const DPY_SPEC: InstrumentSpec = {
  id: "DPY-01",
  name: "Depyrogenation Oven DPY-01",
  equipmentClass: "Tunnel Depyrogenation Oven",
  stage: "Container Preparation — Depyrogenation",
  status: "Complete",
  refs: [{ primary: "FSH-2025-042-DPY" }],
  meta: [
    { label: "Equipment Class", value: "Depyrogenation Oven" },
    { label: "Stage", value: "Container Preparation" },
    { label: "Operation", value: "Dry-Heat Sterilization" },
    { label: "Feed Source", value: "VW-03" },
    { label: "Product", value: "Sterile Vials" },
  ],
};

export const FP_SPEC: InstrumentSpec = {
  id: "FP-02",
  name: "Filling Pump FP-02",
  equipmentClass: "Aseptic Filling Pump",
  stage: "Fill-Finish — Aseptic Filling",
  status: "Complete",
  refs: [{ primary: "FSH-2025-042-FILL" }],
  meta: [
    { label: "Equipment Class", value: "Filling Pump" },
    { label: "Stage", value: "Fill-Finish" },
    { label: "Operation", value: "Aseptic Filling" },
    { label: "Feed Source", value: "FPLC-01 + DPY-01" },
    { label: "Product", value: "Filled Vials" },
  ],
};

export const LPZ_SPEC: InstrumentSpec = {
  id: "LPZ-03",
  name: "Lyophilizer LPZ-03",
  equipmentClass: "Freeze Dryer",
  stage: "Fill-Finish — Lyophilization",
  status: "Complete",
  refs: [{ primary: "FSH-2025-042-LYO" }],
  meta: [
    { label: "Equipment Class", value: "Lyophilizer" },
    { label: "Stage", value: "Fill-Finish" },
    { label: "Operation", value: "Freeze Drying" },
    { label: "Feed Source", value: "FP-02" },
    { label: "Product", value: "Lyophilized Vials" },
  ],
};

export const CAP_SPEC: InstrumentSpec = {
  id: "CAP-01",
  name: "Capping & Labelling CAP-01",
  equipmentClass: "Capping & Labelling Line",
  stage: "Fill-Finish — Capping & Labelling",
  status: "Complete",
  refs: [{ primary: "FSH-2025-042-CAP" }],
  meta: [
    { label: "Equipment Class", value: "Capping & Labelling Line" },
    { label: "Stage", value: "Fill-Finish" },
    { label: "Operation", value: "Sealing & Labelling" },
    { label: "Feed Source", value: "LPZ-03" },
    { label: "Product", value: "Final Drug Product" },
  ],
};
