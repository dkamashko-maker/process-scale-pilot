import { ReactNode, useEffect } from "react";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";

function SidebarAutoCollapse() {
  const location = useLocation();
  const { setOpen } = useSidebar();
  const isMonitorPage = location.pathname.startsWith("/run/") || location.pathname.startsWith("/experiments/");

  useEffect(() => {
    if (isMonitorPage) {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitorPage]);

  return null;
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const defaultOpen = !location.pathname.startsWith("/run/") && !location.pathname.match(/^\/experiments\//);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SidebarAutoCollapse />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background flex items-center px-4 gap-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Data Vest</h1>
            <div className="ml-auto flex items-center gap-3">
              {user && (
                <>
                  <Badge variant="outline" className="capitalize">{user.role}</Badge>
                  <span className="text-sm text-muted-foreground">{user.name}</span>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
