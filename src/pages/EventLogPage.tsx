import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RUNS } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/shared/DataTable";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import type { ProcessEvent } from "@/data/runTypes";

const EVENT_TYPES = ["ALL", "FEED", "BASE_ADDITION", "ANTIFOAM", "INDUCER", "ADDITIVE", "HARVEST", "SAMPLE", "NOTE"];

export default function EventLogPage() {
  const navigate = useNavigate();
  const { user, canLogEvents, isManager } = useAuth();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();

  const [runFilter, setRunFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProcessEvent | null>(null);
  const [form, setForm] = useState({
    run_id: RUNS[0].run_id, event_type: "NOTE", subtype: "",
    amount: "", amount_unit: "", notes: "",
    timestamp: new Date().toISOString().slice(0, 16),
  });

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (runFilter !== "ALL" && e.run_id !== runFilter) return false;
      if (typeFilter !== "ALL" && e.event_type !== typeFilter) return false;
      return true;
    });
  }, [events, runFilter, typeFilter]);

  const startEdit = (e: ProcessEvent) => {
    setEditingEvent(e);
    setForm({
      run_id: e.run_id, event_type: e.event_type, subtype: e.subtype,
      amount: e.amount?.toString() || "", amount_unit: e.amount_unit,
      notes: e.notes, timestamp: e.timestamp.slice(0, 16),
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const data = {
      run_id: form.run_id,
      timestamp: new Date(form.timestamp).toISOString(),
      event_type: form.event_type, subtype: form.subtype,
      amount: form.amount ? parseFloat(form.amount) : null,
      amount_unit: form.amount_unit,
      actor: user?.name || "unknown", entry_mode: "manual",
      notes: form.notes,
    };
    if (editingEvent) updateEvent(editingEvent.id, data);
    else addEvent(data);
    setShowDialog(false);
    setEditingEvent(null);
  };

  const openNew = () => {
    setEditingEvent(null);
    setForm({
      run_id: RUNS[0].run_id, event_type: "NOTE", subtype: "",
      amount: "", amount_unit: "", notes: "",
      timestamp: new Date().toISOString().slice(0, 16),
    });
    setShowDialog(true);
  };

  const columns = [
    { key: "timestamp", label: "Time", sortable: true as const,
      render: (e: ProcessEvent) => format(new Date(e.timestamp), "yyyy-MM-dd HH:mm") },
    { key: "run_id", label: "Run", sortable: true as const,
      render: (e: ProcessEvent) => {
        const r = RUNS.find((run) => run.run_id === e.run_id);
        return (
          <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate(`/run/${e.run_id}`)}>
            {r?.bioreactor_run || e.run_id}
          </Button>
        );
      },
    },
    { key: "event_type", label: "Type", sortable: true as const,
      render: (e: ProcessEvent) => <Badge variant="outline" className="text-xs">{e.event_type}</Badge> },
    { key: "subtype", label: "Subtype" },
    { key: "amount", label: "Amount",
      render: (e: ProcessEvent) => (e.amount != null ? `${e.amount} ${e.amount_unit}` : "—") },
    { key: "actor", label: "Logged By", sortable: true as const },
    { key: "notes", label: "Notes" },
    ...(isManager
      ? [{
          key: "actions", label: "",
          render: (e: ProcessEvent) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => startEdit(e)}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteEvent(e.id)}>
                Delete
              </Button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Event Log</h2>
          <InfoTooltip content="Complete record of all process events across runs. Events include feeds, base additions, sampling, and operator notes." />
        </div>
        {canLogEvents && <Button onClick={openNew}>Log New Event</Button>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Run:</span>
          <Select value={runFilter} onValueChange={setRunFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Runs</SelectItem>
              {RUNS.map((r) => <SelectItem key={r.run_id} value={r.run_id}>{r.bioreactor_run}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Type:</span>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t === "ALL" ? "All Types" : t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="self-center">{filtered.length} events</Badge>
      </div>

      <DataTable data={filtered} columns={columns} />

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Log New Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Run</label>
                <Select value={form.run_id} onValueChange={(v) => setForm((f) => ({ ...f, run_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RUNS.map((r) => <SelectItem key={r.run_id} value={r.run_id}>{r.bioreactor_run}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Event Type</label>
                <Select value={form.event_type} onValueChange={(v) => setForm((f) => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.filter((t) => t !== "ALL").map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Timestamp</label>
                <Input type="datetime-local" value={form.timestamp}
                  onChange={(e) => setForm((f) => ({ ...f, timestamp: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Subtype</label>
                <Input value={form.subtype} onChange={(e) => setForm((f) => ({ ...f, subtype: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" step="0.01" value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Unit</label>
                <Input value={form.amount_unit} onChange={(e) => setForm((f) => ({ ...f, amount_unit: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={form.notes} rows={2}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingEvent ? "Update" : "Log Event"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
