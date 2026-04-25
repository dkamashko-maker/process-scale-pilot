/**
 * Shared hover tooltip for equipment tiles.
 *
 * Content is category-aware:
 *   - Bioreactors (upstream): richest metadata + runtime + alerts +
 *     process duration + phase + recent event summary
 *   - Other operational (downstream): runtime, alerts, current state,
 *     process duration / last operation
 *   - Analytical: last data received, method, batch, upload mode
 */

import { format, formatDistanceToNow } from "date-fns";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle, Activity, Cable, Clock, FlaskConical, Hash,
  Layers, ListChecks, Stethoscope, Timer, UploadCloud,
} from "lucide-react";
import type { Equipment } from "@/data/equipment";
import { getRecentAlertsForEquipment } from "@/data/equipment";
import { getMetadataDisplayFor } from "@/data/metadataModel";

interface Props {
  equipment: Equipment;
  children: React.ReactNode;
  /** Tooltip side, defaults to "right" */
  side?: "top" | "right" | "bottom" | "left";
}

function fmtDuration(min: number | null | undefined): string {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function Row({
  Icon, label, value,
}: { Icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <Icon className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground leading-tight">{label}</div>
        <div className="text-foreground font-medium leading-tight truncate">{value}</div>
      </div>
    </div>
  );
}

export function EquipmentTooltip({ equipment, children, side = "right" }: Props) {
  const cat = equipment.equipmentCategory;
  const meta = getMetadataDisplayFor(equipment.equipmentId);
  const alerts = getRecentAlertsForEquipment(equipment.equipmentId);
  const recentAlert = alerts[0];

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align="start"
          sideOffset={8}
          className="w-[280px] p-3 bg-popover text-popover-foreground border shadow-lg"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold truncate">{equipment.equipmentName}</div>
              <div className="text-[10px] font-mono text-muted-foreground">{equipment.equipmentId}</div>
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
              {cat === "upstream" ? "Bioreactor" : cat === "downstream" ? "Operational" : "Analytical"}
            </div>
          </div>

          {/* Common: alerts + status */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Row
              Icon={Activity}
              label="Status"
              value={<span className="capitalize">{equipment.status}</span>}
            />
            <Row
              Icon={AlertTriangle}
              label="Alerts"
              value={
                equipment.alertCount === 0
                  ? "No alerts"
                  : `${equipment.alertCount}${equipment.criticalAlert ? " (critical)" : ""}`
              }
            />
          </div>

          {/* Category-specific block */}
          {cat === "upstream" && (
            <div className="space-y-1.5">
              <Row Icon={Layers} label="Phase" value={equipment.processPhase || "—"} />
              <Row
                Icon={Hash}
                label="Current batch"
                value={<span className="font-mono">{equipment.currentBatch ?? "—"}</span>}
              />
              <Row
                Icon={Timer}
                label="Process duration"
                value={
                  equipment.status === "active"
                    ? fmtDuration(equipment.processDuration?.currentMin ?? null)
                    : `Last: ${fmtDuration(equipment.processDuration?.lastCompletedMin ?? null)}`
                }
              />
              <Row
                Icon={Stethoscope}
                label="Runtime"
                value={
                  equipment.runtime
                    ? `${equipment.runtime.totalHours.toLocaleString()} h total · ${equipment.runtime.sinceLastServiceHours} h since service`
                    : "—"
                }
              />
              {meta.length > 0 && (
                <div className="pt-1.5 mt-1.5 border-t">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Process metadata
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
                    {meta.slice(0, 6).map((m) => (
                      <div key={m.key} className="truncate">
                        <span className="text-muted-foreground">{m.label}: </span>
                        <span className="font-medium">
                          {String(m.value)}
                          {m.unit ? ` ${m.unit}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {recentAlert && (
                <div className="pt-1.5 mt-1.5 border-t">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Recent event
                  </div>
                  <div className="text-[11px] leading-snug">{recentAlert.message}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {format(new Date(recentAlert.timestamp), "MMM d, HH:mm")}
                  </div>
                </div>
              )}
            </div>
          )}

          {cat === "downstream" && (
            <div className="space-y-1.5">
              <Row Icon={Layers} label="Current state" value={equipment.processPhase || "—"} />
              <Row
                Icon={Hash}
                label="Batch"
                value={<span className="font-mono">{equipment.currentBatch ?? "—"}</span>}
              />
              <Row
                Icon={Timer}
                label={equipment.status === "active" ? "Process duration" : "Last operation"}
                value={
                  equipment.status === "active"
                    ? fmtDuration(equipment.processDuration?.currentMin ?? null)
                    : format(new Date(equipment.lastOperationAt), "MMM d, HH:mm")
                }
              />
              <Row
                Icon={Stethoscope}
                label="Runtime"
                value={
                  equipment.runtime
                    ? `${equipment.runtime.totalHours.toLocaleString()} h total · ${equipment.runtime.sinceLastServiceHours} h since service`
                    : "—"
                }
              />
              {equipment.notes && (
                <div className="pt-1.5 mt-1.5 border-t text-[11px] text-muted-foreground italic leading-snug">
                  {equipment.notes}
                </div>
              )}
            </div>
          )}

          {cat === "analytical" && (
            <div className="space-y-1.5">
              <Row
                Icon={Clock}
                label="Last data received"
                value={
                  <>
                    {format(new Date(equipment.lastDataReceivedAt), "MMM d, HH:mm")}
                    <span className="text-muted-foreground font-normal ml-1">
                      ({formatDistanceToNow(new Date(equipment.lastDataReceivedAt), { addSuffix: true })})
                    </span>
                  </>
                }
              />
              <Row Icon={FlaskConical} label="Method" value={equipment.methodName ?? "—"} />
              <Row
                Icon={Hash}
                label="Linked batch"
                value={<span className="font-mono">{equipment.currentBatch ?? "—"}</span>}
              />
              <Row
                Icon={equipment.integrationMode === "manual" ? UploadCloud : Cable}
                label="Upload mode"
                value={equipment.integrationMode === "manual" ? "Manual load" : "Online-integrated"}
              />
              {meta.length > 0 && (
                <div className="pt-1.5 mt-1.5 border-t">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                    <ListChecks className="h-3 w-3" /> Method config
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
                    {meta.slice(0, 4).map((m) => (
                      <div key={m.key} className="truncate">
                        <span className="text-muted-foreground">{m.label}: </span>
                        <span className="font-medium">
                          {String(m.value)}
                          {m.unit ? ` ${m.unit}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
