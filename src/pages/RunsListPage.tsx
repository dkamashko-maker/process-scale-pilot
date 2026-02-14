import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RUNS } from "@/data/runData";
import type { Run } from "@/data/runTypes";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FlaskConical } from "lucide-react";
import { format } from "date-fns";

// In-memory store for created runs (persists across navigations within session)
const createdRuns: Run[] = [];

function getAllRuns(): Run[] {
  return [...RUNS, ...createdRuns];
}

const REACTORS = ["all", "003-p", "004-p", "005-p"] as const;

export default function RunsListPage() {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [reactorFilter, setReactorFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [, setTick] = useState(0); // force re-render after creation

  const runs = useMemo(() => {
    const all = getAllRuns();
    if (reactorFilter === "all") return all;
    return all.filter((r) => r.reactor_id === reactorFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactorFilter, createdRuns.length]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Runs</h1>
          <p className="text-muted-foreground text-sm">All bioprocess runs across reactors</p>
        </div>
        {isManager && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Run
          </Button>
        )}
      </div>

      {/* Reactor filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Reactor:</span>
        <div className="flex gap-2">
          {REACTORS.map((r) => (
            <Badge
              key={r}
              variant={reactorFilter === r ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setReactorFilter(r)}
            >
              {r === "all" ? "All" : r}
            </Badge>
          ))}
        </div>
      </div>

      {/* Runs table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {runs.length} Run{runs.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run ID</TableHead>
                <TableHead>Reactor</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Cell Line</TableHead>
                <TableHead>Target Protein</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow
                  key={run.run_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/experiments/${run.run_id}`)}
                >
                  <TableCell className="font-mono text-xs">{run.run_id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{run.reactor_id}</Badge>
                  </TableCell>
                  <TableCell>{run.operator_id}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{run.cell_line}</TableCell>
                  <TableCell className="text-xs">{run.target_protein}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{run.process_strategy}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(run.start_time), "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell className="text-xs">{run.end_time ? format(new Date(run.end_time), "yyyy-MM-dd HH:mm") : "—"}</TableCell>
                </TableRow>
              ))}
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No runs found for this reactor.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Run Modal */}
      <CreateRunDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(run) => {
          createdRuns.push(run);
          setTick((t) => t + 1);
          setShowCreate(false);
          navigate(`/experiments/${run.run_id}`);
        }}
      />
    </div>
  );
}

function CreateRunDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (run: Run) => void;
}) {
  const [form, setForm] = useState({
    run_id: "",
    reactor_id: "003-p",
    operator_id: "",
    cell_line: "",
    target_protein: "",
    process_strategy: "Fed-Batch",
    basal_medium: "",
    feed_medium: "",
    start_time: "",
  });

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const canSubmit = form.run_id && form.reactor_id && form.operator_id && form.start_time;

  const handleCreate = () => {
    const newRun: Run = {
      run_id: form.run_id,
      batch_id: form.run_id,
      reactor_id: form.reactor_id,
      bioreactor_run: `R-${Date.now() % 10000}`,
      operator_id: form.operator_id,
      cell_line: form.cell_line,
      target_protein: form.target_protein,
      process_strategy: form.process_strategy,
      basal_medium: form.basal_medium,
      feed_medium: form.feed_medium,
      start_time: form.start_time,
      end_time: "",
      sampling_interval_sec: 60,
      timeline_version: "Timeline 2",
      timezone: "Europe/Zurich",
      seed: Date.now() % 100000,
    };
    onCreated(newRun);
    setForm({
      run_id: "",
      reactor_id: "003-p",
      operator_id: "",
      cell_line: "",
      target_protein: "",
      process_strategy: "Fed-Batch",
      basal_medium: "",
      feed_medium: "",
      start_time: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" /> Create New Run
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="run_id">Run ID *</Label>
              <Input id="run_id" value={form.run_id} onChange={(e) => set("run_id", e.target.value)} placeholder="CHO-r-..." />
            </div>
            <div className="space-y-1.5">
              <Label>Reactor *</Label>
              <Select value={form.reactor_id} onValueChange={(v) => set("reactor_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="003-p">003-p</SelectItem>
                  <SelectItem value="004-p">004-p</SelectItem>
                  <SelectItem value="005-p">005-p</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="operator_id">Operator ID *</Label>
              <Input id="operator_id" value={form.operator_id} onChange={(e) => set("operator_id", e.target.value)} placeholder="20-xxx" />
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
            <Label htmlFor="cell_line">Cell Line</Label>
            <Input id="cell_line" value={form.cell_line} onChange={(e) => set("cell_line", e.target.value)} placeholder="CHO-DG44/..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="target_protein">Target Protein</Label>
            <Input id="target_protein" value={form.target_protein} onChange={(e) => set("target_protein", e.target.value)} placeholder="Recombinant..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="basal_medium">Basal Medium</Label>
              <Input id="basal_medium" value={form.basal_medium} onChange={(e) => set("basal_medium", e.target.value)} placeholder="CHO Medium" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="feed_medium">Feed Medium</Label>
              <Input id="feed_medium" value={form.feed_medium} onChange={(e) => set("feed_medium", e.target.value)} placeholder="OneFeed Supplement" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start_time">Start Time *</Label>
            <Input id="start_time" type="datetime-local" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!canSubmit}>Create Run</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
