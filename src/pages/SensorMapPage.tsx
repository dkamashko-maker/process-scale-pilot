import WorkflowVisualization from "@/components/workflow/WorkflowVisualization";

export default function SensorMapPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sensor Map</h1>
        <p className="text-sm text-muted-foreground">Interactive equipment pipeline visualization</p>
      </div>
      <WorkflowVisualization />
    </div>
  );
}
