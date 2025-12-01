import { Badge } from "@/components/ui/badge";

type Status = "Pass" | "Fail" | "At Risk" | "Low" | "Medium" | "High" | "Idle" | "Running" | "Completed" | "Maintenance";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "Pass" || status === "Low" || status === "Completed") return "default";
    if (status === "Fail" || status === "High") return "destructive";
    if (status === "At Risk" || status === "Medium") return "secondary";
    return "outline";
  };

  const getColorClass = () => {
    if (status === "Pass" || status === "Low" || status === "Completed") 
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (status === "Fail" || status === "High") 
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (status === "At Risk" || status === "Medium") 
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    if (status === "Running")
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  };

  return (
    <Badge variant={getVariant()} className={`${getColorClass()} ${className || ""}`}>
      {status.toUpperCase()}
    </Badge>
  );
}
