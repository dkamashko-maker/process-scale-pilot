import { useFilters } from "@/contexts/FilterContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRODUCTS = ["mAb-01", "mAb-02", "mAb-03"];
const STAGES = ["Lab", "Pilot", "Manufacturing"] as const;

export function FilterBar() {
  const { filters, setFilters } = useFilters();

  const toggleProduct = (product: string) => {
    const newProducts = filters.products.includes(product)
      ? filters.products.filter((p) => p !== product)
      : [...filters.products, product];
    setFilters({ products: newProducts });
  };

  const toggleStage = (stage: typeof STAGES[number]) => {
    const newStages = filters.stages.includes(stage)
      ? filters.stages.filter((s) => s !== stage)
      : [...filters.stages, stage];
    setFilters({ stages: newStages });
  };

  return (
    <div className="border-b bg-card">
      <div className="px-6 py-4 space-y-4">
        {/* Row 1: Product and Stage chips */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Product:</span>
            <div className="flex gap-2">
              {PRODUCTS.map((product) => (
                <Badge
                  key={product}
                  variant={filters.products.includes(product) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleProduct(product)}
                >
                  {product}
                  {filters.products.includes(product) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Stage:</span>
            <div className="flex gap-2">
              {STAGES.map((stage) => (
                <Badge
                  key={stage}
                  variant={filters.stages.includes(stage) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleStage(stage)}
                >
                  {stage}
                  {filters.stages.includes(stage) && <X className="ml-1 h-3 w-3" />}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Date range and Scenario */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
            <Select
              value={filters.dateRange}
              onValueChange={(value: any) => setFilters({ dateRange: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 months</SelectItem>
                <SelectItem value="6months">Last 6 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Scenario:</span>
            <Select
              value={filters.scenario}
              onValueChange={(value: any) => setFilters({ scenario: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scenarios</SelectItem>
                <SelectItem value="baseline">Baseline</SelectItem>
                <SelectItem value="optimized">Optimized</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(filters.products.length > 0 || filters.stages.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ products: [], stages: [] })}
              className="ml-auto"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
