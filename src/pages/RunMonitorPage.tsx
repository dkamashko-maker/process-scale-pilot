import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RUNS, PARAMETERS, getTimeseries } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProcessChart } from "@/components/monitoring/ProcessChart";
import { ControlActionsPanel } from "@/components/monitoring/ControlActionsPanel";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import type { ParameterDef, ProcessEvent } from "@/data/runTypes";

const EVENT_TYPES = ["FEED", "BASE_ADDITION", "ANTIFOAM", "INDUCER", "ADDITIVE", "HARVEST", "SAMPLE", "NOTE"];

export default function RunMonitorPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { user, canLogEvents, isManager } = useAuth();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();

  const run = RUNS.find((r) => r.run_id === runId);
  const timeseries = useMemo(() => (run ? getTimeseries(run.run_id) : []), [run]);
  const runEvents = useMemo(
    () => events.filter((e) => e.run_id === runId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [events, runId]
  );

  const [selectedParams, setSelectedParams] = useState<string[]>(
    PARAMETERS.filter((p) => p.is_critical).map((p) => p.parameter_code)
  );
  const [showRangeBands, setShowRangeBands] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProcessEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    event_type: "NOTE", subtype: "", amount: "", amount_unit: "", notes: "",
    timestamp: new Date().toISOString().slice(0, 16),
  });

  const eventMarkers = useMemo(() => {
    if (!run) return [];
    const runStart = new Date(run.start_time).getTime();
    return runEvents.map((e) => ({
      ...e,
      elapsed_h: (new Date(e.timestamp).getTime() - runStart) / 3600000,
    }));
  }, [runEvents, run]);

  const highlightedEventH = useMemo(() => {
    if (!selectedEventId) return null;
    const marker = eventMarkers.find((m) => m.id === selectedEventId);
    return marker ? marker.elapsed_h : null;
  }, [selectedEventId, eventMarkers]);

  const paramGroups = useMemo(() => {
    const groups: Record<string, ParameterDef[]> = {};
    PARAMETERS.forEach((p) => {
      if (!groups[p.type_priority]) groups[p.type_priority] = [];
      groups[p.type_priority].push(p);
    });
    return groups;
  }, []);

  if (!run) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Run not found</h2>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const toggleParam = (code: string) => {
    setSelectedParams((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

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
    if (editingEvent) {
      updateEvent(editingEvent.id, data);
    } else {
      addEvent(data);
    }
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


  const eventColumns = [
    { key: "timestamp", label: "Time", sortable: true as const,
      render: (e: ProcessEvent) => format(new Date(e.timestamp), "MM-dd HH:mm") },
    { key: "event_type", label: "Type", sortable: true as const,
      render: (e: ProcessEvent) => <Badge variant="outline" className="text-xs">{e.event_type}</Badge> },
    { key: "subtype", label: "Subtype" },
    { key: "amount", label: "Amount",
      render: (e: ProcessEvent) => (e.amount != null ? `${e.amount} ${e.amount_unit}` : "—") },
    { key: "actor", label: "Logged By" },
    { key: "notes", label: "Notes" },
    ...(canLogEvents ? [{
      key: "actions", label: "",
      render: (e: ProcessEvent) => (
        <div className="flex gap-1">
          {isManager && (
            <>
              <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); startEdit(e); }}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={(ev) => { ev.stopPropagation(); deleteEvent(e.id); }}>Delete</Button>
            </>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <Card className="animate-fade-in">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold">{run.bioreactor_run}</h1>
                <p className="text-xs text-muted-foreground font-mono">{run.run_id}</p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-1 text-sm">
              <div><span className="text-muted-foreground">Reactor</span><p className="font-medium">{run.reactor_id}</p></div>
              <div><span className="text-muted-foreground">Cell Line</span><p className="font-medium text-xs">{run.cell_line.split("/")[1] || run.cell_line}</p></div>
              <div><span className="text-muted-foreground">Protein</span><p className="font-medium text-xs truncate max-w-[180px]">{run.target_protein}</p></div>
              <div><span className="text-muted-foreground">Strategy</span><p className="font-medium">{run.process_strategy}</p></div>
              <div><span className="text-muted-foreground">Operator</span><p className="font-medium">{run.operator_id}</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parameter Selector */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Parameters</span>
              <InfoTooltip content="Select parameters to overlay on the monitoring chart. Values are normalized to % of operating range." />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Switch checked={showRangeBands} onCheckedChange={setShowRangeBands} className="h-4 w-7" />
              Range Bands
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            {Object.entries(paramGroups).map(([group, params]) => (
              <div key={group} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground min-w-fit">{group}:</span>
                {params.map((p) => (
                  <label key={p.parameter_code} className="flex items-center gap-1 text-xs cursor-pointer whitespace-nowrap">
                    <Checkbox
                      checked={selectedParams.includes(p.parameter_code)}
                      onCheckedChange={() => toggleParam(p.parameter_code)}
                      className="h-3.5 w-3.5"
                    />
                    {p.display_name}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart + Control Actions Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <ChartCard
          title="Process Monitoring"
          subtitle={
            <span className="flex items-center gap-1">
              Parameter readings over time (% of operating range)
              <InfoTooltip content="Each parameter is normalized to its operating range. Hover for actual values. Shaded band = acceptable range. Vertical markers = logged events." />
            </span>
          }
        >
          <ProcessChart
            timeseries={timeseries}
            selectedParams={selectedParams}
            parameters={PARAMETERS}
            eventMarkers={eventMarkers}
            highlightedEventH={highlightedEventH}
            showRangeBands={showRangeBands}
          />
        </ChartCard>

        <Card className="overflow-hidden">
          <ControlActionsPanel
            events={runEvents}
            runStartTime={run.start_time}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
            canLogEvents={canLogEvents}
            onLogEvent={openNewEvent}
          />
        </Card>
      </div>

      {/* Event Log */}
      <ChartCard
        title="Event Log"
        subtitle={
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1">
              Recorded events for this run
              <InfoTooltip content="All logged events including feeds, base additions, and operator notes. Read-only for Viewer role." />
            </span>
            {canLogEvents && (
              <Button size="sm" onClick={openNewEvent}>Log Event</Button>
            )}
          </div>
        }
      >
        <DataTable data={runEvents} columns={eventColumns} />
      </ChartCard>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Log New Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Event Type</label>
                <Select value={eventForm.event_type} onValueChange={(v) => setEventForm((f) => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Timestamp</label>
                <Input type="datetime-local" value={eventForm.timestamp}
                  onChange={(e) => setEventForm((f) => ({ ...f, timestamp: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Subtype</label>
                <Input value={eventForm.subtype} placeholder="e.g. NaHCO3"
                  onChange={(e) => setEventForm((f) => ({ ...f, subtype: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" step="0.01" value={eventForm.amount}
                  onChange={(e) => setEventForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Unit</label>
                <Input value={eventForm.amount_unit} placeholder="mL"
                  onChange={(e) => setEventForm((f) => ({ ...f, amount_unit: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={eventForm.notes} rows={2}
                onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveEvent}>{editingEvent ? "Update" : "Log Event"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
