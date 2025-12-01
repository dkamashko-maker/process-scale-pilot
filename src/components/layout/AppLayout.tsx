import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { FilterBar } from "./FilterBar";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  
  // Show filter bar on overview, analytics, and experiments pages
  const showFilterBar = ["/overview", "/analytics", "/experiments"].some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Top bar with trigger */}
          <header className="h-14 border-b bg-background flex items-center px-4 gap-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">BioProcess Analytics Platform</h1>
          </header>

          {/* Filter bar (conditional) */}
          {showFilterBar && <FilterBar />}

          {/* Main content */}
          <main className="flex-1 overflow-auto bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
