import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { Stage, Scenario } from "@/data/types";

export interface FilterState {
  products: string[];
  stages: Stage[];
  dateRange: "3months" | "6months" | "all";
  scenario: Scenario | "all";
}

interface FilterContextType {
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  products: [],
  stages: [],
  dateRange: "3months",
  scenario: "optimized", // Default to optimized for demo
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  
  const getInitialFilters = (): FilterState => {
    const scenarioParam = searchParams.get("scenario");
    const validScenarios: (Scenario | "all")[] = ["baseline", "optimized", "all"];
    
    return {
      ...defaultFilters,
      scenario: validScenarios.includes(scenarioParam as Scenario | "all") 
        ? (scenarioParam as Scenario | "all")
        : "optimized",
    };
  };

  const [filters, setFiltersState] = useState<FilterState>(getInitialFilters);

  useEffect(() => {
    const scenarioParam = searchParams.get("scenario");
    if (scenarioParam === "baseline" || scenarioParam === "optimized" || scenarioParam === "all") {
      setFiltersState(prev => ({ ...prev, scenario: scenarioParam }));
    }
  }, [searchParams]);

  const setFilters = (newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFiltersState(defaultFilters);
  };

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be used within FilterProvider");
  }
  return context;
}
