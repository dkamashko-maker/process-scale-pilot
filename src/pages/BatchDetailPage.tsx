import { useParams } from "react-router-dom";

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Batch Detail: {batchId}</h2>
      <p className="text-muted-foreground">Batch detail content coming soon...</p>
    </div>
  );
}
