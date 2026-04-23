import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Database, Construction, Brain, Activity, FileText,
  Map, ChevronDown, ChevronRight, Workflow, Boxes,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { RUNS } from "@/data/runData";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Data Storage", url: "/data-storage", icon: Database },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "AI", url: "/ai", icon: Brain },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const isEquipment = location.pathname.startsWith("/equipment");
  const isMetadata = location.pathname.startsWith("/metadata");
  const [equipmentOpen, setEquipmentOpen] = useState(isEquipment);
  const [metadataOpen, setMetadataOpen] = useState(isMetadata);

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-6">
            <h2 className={`font-bold text-lg ${collapsed ? "text-center" : ""}`}>
              {collapsed ? "DV" : "Data Vest"}
            </h2>
            {!collapsed && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Instrumental Data Collection & Analytics</p>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Equipment Dashboard with expandable sub-items */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer hover:bg-accent ${location.pathname === "/equipment" ? "bg-accent text-accent-foreground" : ""}`}
                    onClick={() => {
                      if (location.pathname !== "/equipment") navigate("/equipment");
                      setEquipmentOpen((o) => !o);
                    }}
                  >
                    <Boxes className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Equipment Dashboard</span>
                        {equipmentOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!collapsed && equipmentOpen && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className={`flex items-center gap-3 pl-8 pr-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer hover:bg-accent ${location.pathname === "/equipment/sensor-map" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => navigate("/equipment/sensor-map")}
                  >
                    <Map className="h-4 w-4 flex-shrink-0" />
                    <span>Sensor Map</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Metadata Constructor with expandable sub-items */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer hover:bg-accent ${isMetadata ? "bg-accent text-accent-foreground" : ""}`}
                    onClick={() => {
                      if (!isMetadata) navigate("/metadata");
                      setMetadataOpen((o) => !o);
                    }}
                  >
                    <Construction className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Metadata Constructor</span>
                        {metadataOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!collapsed && metadataOpen && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className={`flex items-center gap-3 pl-8 pr-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer hover:bg-accent ${location.pathname === "/metadata/rebuild" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => navigate("/metadata/rebuild")}
                  >
                    <Workflow className="h-4 w-4 flex-shrink-0" />
                    <span>Workflow Canvas</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Other nav items */}
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Active Runs */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Active Runs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {RUNS.map((run) => (
                <SidebarMenuItem key={run.run_id}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={`/run/${run.run_id}`}
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground"
                    >
                      <Activity className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{run.bioreactor_run}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
