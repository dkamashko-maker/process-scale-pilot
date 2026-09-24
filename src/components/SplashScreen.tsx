import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import dataVestLogo from "@/assets/brand/datavest-logo.png";

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
      <img src={dataVestLogo} alt="DataVest — Interfaces-first lab platform" className="h-auto w-72 animate-fade-in" />
      <div className="w-64 space-y-2">
        <Progress value={Math.min(progress, 100)} className="h-2" />
        <p className="text-xs text-center text-muted-foreground animate-pulse">
          Data Vest Loading…
        </p>
      </div>
    </div>
  );
}
