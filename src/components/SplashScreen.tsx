import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <Database className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Vest</h1>
          <p className="text-xs text-muted-foreground">Integrated Instrumental Data Collection & Analytics</p>
        </div>
      </div>
      <div className="w-64 space-y-2">
        <Progress value={Math.min(progress, 100)} className="h-2" />
        <p className="text-xs text-center text-muted-foreground animate-pulse">
          Data Vest Loading…
        </p>
      </div>
    </div>
  );
}
