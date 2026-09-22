import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { GlobalCampaignBanner } from "./GlobalCampaignBanner";

const SIDEBAR_COOKIE_NAME = "sidebar:state";

function readSidebarCookie(): boolean | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
  if (!match) return null;
  return match.split("=")[1] === "true";
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <SidebarProvider defaultOpen={readSidebarCookie() ?? true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background flex items-center px-4 gap-4">
            <SidebarTrigger />
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
            {location.pathname !== "/equipment" && <GlobalCampaignBanner />}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
