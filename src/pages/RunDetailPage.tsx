import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { RUNS, PARAMETERS, getTimeseries } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { useAuth } from "@/contexts/AuthContext";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import MonitoringCharts from "@/components/monitoring/MonitoringCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  FlaskConical, Thermometer, User, Dna, Target, Beaker, Utensils,
  Calendar, Pencil, Plus, ExternalLink,
} from "lucide-react";
import type { ParameterDef, ProcessEvent, Run } from "@/data/runTypes";

const EVENT_TYPES = ["FEED", "BASE_ADDITION", "ANTIFOAM", "INDUCER", "ADDITIVE", "HARVEST", "GAS", "SAMPLE", "NOTE"];
const PHASES = ["Inoculation", "Growth", "Transition", "Production", "Harvest"] as const;

// ── Chip definitions ──
interface ChipDef {
  key: string;
  label: string;
  icon: typeof FlaskConical;
  getValue: (r: Run) => string;
  drawerTitle: string;
  fullPageUrl?: (r: Run) => string;
}

const CHIPS: ChipDef[] = [
  { key: "run_id", label: "Run ID", icon: FlaskConical, getValue: (r) => r.run_id, drawerTitle: "Run Details" },
  { key: "reactor_id", label: "Reactor", icon: Thermometer, getValue: (r) => r.reactor_id, drawerTitle: "Reactor Info", fullPageUrl: (r) => `/reactor/${r.reactor_id}` },
  { key: "operator_id", label: "Operator", icon: User, getValue: (r) => r.operator_id, drawerTitle: "Operator Info", fullPageUrl: (r) => `/operator/${r.operator_id}` },
  { key: "cell_line", label: "Cell Line", icon: Dna, getValue: (r) => r.cell_line.split("/")[1] || r.cell_line, drawerTitle: "Cell Line Details", fullPageUrl: (r) => `/cell-line/${encodeURIComponent(r.cell_line)}` },
  { key: "target_protein", label: "Target Protein", icon: Target, getValue: (r) => r.target_protein, drawerTitle: "Target Protein Info", fullPageUrl: (r) => `/protein/${encodeURIComponent(r.target_protein)}` },
  { key: "basal_medium", label: "Basal Medium", icon: Beaker, getValue: (r) => r.basal_medium, drawerTitle: "Basal Medium Details" },
  { key: "feed_medium", label: "Feed Medium", icon: Utensils, getValue: (r) => r.feed_medium, drawerTitle: "Feed Medium Details" },
  { key: "start_time", label: "Start", icon: Calendar, getValue: (r) => format(new Date(r.start_time), "yyyy-MM-dd HH:mm"), drawerTitle: "Run Timeline" },
  { key: "end_time", label: "End", icon: Calendar, getValue: (r) => r.end_time ? format(new Date(r.end_time), "yyyy-MM-dd HH:mm") : "Ongoing", drawerTitle: "Run Timeline" },
];

// ── Drawer content per chip ──
function DrawerBody({ chip, run }: { chip: ChipDef; run: Run }) {
  const fieldMap: Record<string, { label: string; value: string }[]> = {
    run_id: [
      { label: "Run ID", value: run.run_id },
      { label: "Batch ID", value: run.batch_id },
      { label: "Bioreactor Run", value: run.bioreactor_run },
      { label: "Timeline Version", value: run.timeline_version },
      { label: "Sampling Interval", value: `${run.sampling_interval_sec}s` },
      { label: "Timezone", value: run.timezone },
    ],
    reactor_id: [
      { label: "Reactor ID", value: run.reactor_id },
      { label: "Associated Run", value: run.bioreactor_run },
    ],
    operator_id: [
      { label: "Operator ID", value: run.operator_id },
    ],
    cell_line: [
      { label: "Full Cell Line", value: run.cell_line },
    ],
    target_protein: [
      { label: "Target Protein", value: run.target_protein },
      { label: "Process Strategy", value: run.process_strategy },
    ],
    basal_medium: [
      { label: "Basal Medium", value: run.basal_medium },
    ],
    feed_medium: [
      { label: "Feed Medium", value: run.feed_medium },
    ],
    start_time: [
      { label: "Start Time", value: run.start_time },
      { label: "End Time", value: run.end_time || "Ongoing" },
      { label: "Duration", value: run.end_time ? `${Math.round((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 3600000)}h` : "In progress" },
    ],
    end_time: [
      { label: "Start Time", value: run.start_time },
      { label: "End Time", value: run.end_time || "Ongoing" },
    ],
  };

  const fields = fieldMap[chip.key] || [{ label: chip.label, value: chip.getValue(run) }];

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.label}>
          <p className="text-xs text-muted-foreground">{f.label}</p>
          <p className="font-medium text-sm break-all">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──
export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { user, canLogEvents, isManager } = useAuth();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();

  // Find run from both static RUNS and any dynamically created ones
  const run = RUNS.find((r) => r.run_id === runId);

  const timeseries = useMemo(() => (run ? getTimeseries(run.run_id) : []), [run]);
  const runEvents = useMemo(
    () => events.filter((e) => e.run_id === runId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [events, runId]
  );

  const eventMarkers = useMemo(() => {
    if (!run) return [];
    const runStart = new Date(run.start_time).getTime();
    return runEvents.map((e) => ({ ...e, elapsed_h: (new Date(e.timestamp).getTime() - runStart) / 3600000 }));
  }, [runEvents, run]);

  // UI state
  const [activeDrawer, setActiveDrawer] = useState<ChipDef | null>(null);
  const [phase, setPhase] = useState<string>("Growth");
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProcessEvent | null>(null);
  const [showMetadataEdit, setShowMetadataEdit] = useState(false);
  const [eventForm, setEventForm] = useState({
    event_type: "NOTE", subtype: "", amount: "", amount_unit: "", notes: "",
    timestamp: new Date().toISOString().slice(0, 16),
  });

  if (!run) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-2xl font-bold">Run not found</h2>
        <p className="text-muted-foreground">Run ID "{runId}" does not exist in the dataset.</p>
        <Button onClick={() => navigate("/experiments")}>Back to Runs</Button>
      </div>
    );
  }

  // ── Event handlers ──
  const handleSaveEvent = () => {
    const data = {
      run_id: run.run_id,
      timestamp: new Date(eventForm.timestamp).toISOString(),
      event_type: eventForm.event_type,
      subtype: eventForm.subtype,
      amount: eventForm.amount ? parseFloat(eventForm.amount) : null,
      amount_unit: eventForm.amount_unit,
      actor: user?.name || "unknown",
      entry_mode: "manual",
      notes: eventForm.notes,
    };
    if (editingEvent) updateEvent(editingEvent.id, data);
    else addEvent(data);
    setShowEventDialog(false);
    setEditingEvent(null);
  };

  const startEdit = (evt: ProcessEvent) => {
    setEditingEvent(evt);
    setEventForm({
      event_type: evt.event_type, subtype: evt.subtype,
      amount: evt.amount?.toString() || "", amount_unit: evt.amount_unit,
      notes: evt.notes, timestamp: evt.timestamp.slice(0, 16),
    });
    setShowEventDialog(true);
  };

  const openNewEvent = () => {
    setEditingEvent(null);
    setEventForm({ event_type: "NOTE", subtype: "", amount: "", amount_unit: "", notes: "", timestamp: new Date().toISOString().slice(0, 16) });
    setShowEventDialog(true);
  };



  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* ── Metadata Header with Clickable Chips ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{run.bioreactor_run}</h1>
            <Badge variant="secondary">Active</Badge>
          </div>
          {isManager && (
            <Button variant="outline" size="sm" onClick={() => setShowMetadataEdit(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Metadata
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <Badge
              key={chip.key}
              variant="outline"
              className="cursor-pointer hover:bg-accent transition-colors px-3 py-1.5 gap-1.5 text-xs"
              onClick={() => setActiveDrawer(chip)}
            >
              <chip.icon className="h-3 w-3" />
              <span className="text-muted-foreground">{chip.label}:</span>
              <span className="font-medium">{chip.getValue(run)}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* ── Phase Dropdown ── */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium text-muted-foreground">Current Phase:</Label>
        <Select value={phase} onValueChange={setPhase}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHASES.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">UI state only</Badge>
      </div>

      {/* ── Monitoring Charts ── */}
      <MonitoringCharts
        timeseries={timeseries}
        events={eventMarkers}
        runStartTime={run.start_time}
        phase={phase}
      />

      {/* ── Event Log ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Event Log
              <InfoTooltip content="All logged events for this run. Operator and Manager roles can add events." />
            </CardTitle>
            {canLogEvents && (
              <Button size="sm" onClick={openNewEvent}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Log Event
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subtype</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Logged By</TableHead>
                <TableHead>Notes</TableHead>
                {canLogEvents && <TableHead className="w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {runEvents.map((evt) => (
                <TableRow key={evt.id}>
                  <TableCell className="text-xs">{format(new Date(evt.timestamp), "MM-dd HH:mm")}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{evt.event_type}</Badge></TableCell>
                  <TableCell className="text-xs">{evt.subtype}</TableCell>
                  <TableCell className="text-xs">{evt.amount != null ? `${evt.amount} ${evt.amount_unit}` : "—"}</TableCell>
                  <TableCell className="text-xs">{evt.actor}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{evt.notes}</TableCell>
                  {canLogEvents && (
                    <TableCell>
                      <div className="flex gap-1">
                        {isManager && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => startEdit(evt)}>Edit</Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={() => deleteEvent(evt.id)}>Del</Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {runEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canLogEvents ? 7 : 6} className="text-center text-muted-foreground py-8">
                    No events recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Right-side Drawer for Chip Details ── */}
      <Sheet open={!!activeDrawer} onOpenChange={(open) => !open && setActiveDrawer(null)}>
        <SheetContent className="w-[360px] sm:w-[400px]">
          {activeDrawer && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <activeDrawer.icon className="h-4 w-4" />
                  {activeDrawer.drawerTitle}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <DrawerBody chip={activeDrawer} run={run} />
                {activeDrawer.fullPageUrl && (
                  <Link
                    to={activeDrawer.fullPageUrl(run)}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open full page
                  </Link>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Event Dialog ── */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Log New Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Event Type</Label>
                <Select value={eventForm.event_type} onValueChange={(v) => setEventForm((f) => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Timestamp</Label>
                <Input type="datetime-local" value={eventForm.timestamp}
                  onChange={(e) => setEventForm((f) => ({ ...f, timestamp: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Subtype</Label>
                <Input value={eventForm.subtype} placeholder="e.g. NaHCO3"
                  onChange={(e) => setEventForm((f) => ({ ...f, subtype: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={eventForm.amount}
                  onChange={(e) => setEventForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={eventForm.amount_unit} placeholder="mL"
                  onChange={(e) => setEventForm((f) => ({ ...f, amount_unit: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={eventForm.notes} rows={2}
                onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEvent}>{editingEvent ? "Update" : "Log Event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Metadata Edit Dialog (Manager only) ── */}
      <MetadataEditDialog open={showMetadataEdit} onOpenChange={setShowMetadataEdit} run={run} />
    </div>
  );
}

// ── Metadata Edit Dialog ──
function MetadataEditDialog({ open, onOpenChange, run }: { open: boolean; onOpenChange: (v: boolean) => void; run: Run }) {
  // In-memory only edit (since data is static demo data)
  const [form, setForm] = useState({
    operator_id: run.operator_id,
    cell_line: run.cell_line,
    target_protein: run.target_protein,
    process_strategy: run.process_strategy,
    basal_medium: run.basal_medium,
    feed_medium: run.feed_medium,
  });

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Run Metadata</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Changes are in-memory only for this prototype session.</p>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Operator ID</Label>
              <Input value={form.operator_id} onChange={(e) => set("operator_id", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Strategy</Label>
              <Select value={form.process_strategy} onValueChange={(v) => set("process_strategy", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fed-Batch">Fed-Batch</SelectItem>
                  <SelectItem value="Batch">Batch</SelectItem>
                  <SelectItem value="Perfusion">Perfusion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cell Line</Label>
            <Input value={form.cell_line} onChange={(e) => set("cell_line", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Target Protein</Label>
            <Input value={form.target_protein} onChange={(e) => set("target_protein", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Basal Medium</Label>
              <Input value={form.basal_medium} onChange={(e) => set("basal_medium", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Feed Medium</Label>
              <Input value={form.feed_medium} onChange={(e) => set("feed_medium", e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            // In a real app, this would persist. For demo, just close.
            onOpenChange(false);
          }}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
