import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Database, Construction, Brain, Activity, FileText,
  Map, ChevronDown, ChevronRight, Workflow, Boxes, GitBranch, ClipboardList,
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

/**
 * Active state — Data Vest design system.
 * 3px primary left border + very-light primary bg tint (no full blue fill).
 * Inactive items: no border, transparent bg.
 */
const NAV_BASE =
  "flex items-center gap-3 pl-3 pr-3 py-2 text-[13px] font-normal rounded-md " +
  "border-l-[3px] border-transparent transition-colors hover:bg-accent/40";
const NAV_ACTIVE =
  "bg-[hsl(var(--nav-active-bg))] border-primary text-foreground font-medium";
const SUB_BASE =
  "flex items-center gap-2.5 pl-5 pr-3 py-1.5 text-[13px] font-normal rounded-md " +
  "border-l-[3px] border-transparent ml-3 text-text-secondary " +
  "transition-colors hover:bg-accent/40 hover:text-foreground";
const SUB_ACTIVE =
  "bg-[hsl(var(--nav-active-bg))] border-primary text-foreground font-medium";

const navItems = [
  { title: "Data Storage", url: "/data-storage", icon: Database },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Insights", url: "/ai", icon: Brain },
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-6">
            <h2 className={`text-section text-foreground ${collapsed ? "text-center" : ""}`}>
              {collapsed ? "DV" : "Data Vest"}
            </h2>
            {!collapsed && (
              <p className="text-[11px] text-text-secondary mt-1">
                Instrumental Data Collection &amp; Analytics
              </p>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Equipment Dashboard — collapsible parent */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <div
                    className={`${NAV_BASE} cursor-pointer ${isActive("/equipment") ? NAV_ACTIVE : ""}`}
                    onClick={() => {
                      if (!isActive("/equipment")) navigate("/equipment");
                      setEquipmentOpen((o) => !o);
                    }}
                  >
                    <Boxes className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Equipment Dashboard</span>
                        {equipmentOpen
                          ? <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
                          : <ChevronRight className="h-3.5 w-3.5 text-text-secondary opacity-0 group-hover:opacity-100" />}
                      </>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!collapsed && equipmentOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={`${SUB_BASE} cursor-pointer ${isActive("/equipment/sensor-map") ? SUB_ACTIVE : ""}`}
                      onClick={() => navigate("/equipment/sensor-map")}
                    >
                      <Map className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Sensor Map</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={`${SUB_BASE} cursor-pointer ${isActive("/equipment/material-flow") ? SUB_ACTIVE : ""}`}
                      onClick={() => navigate("/equipment/material-flow")}
                    >
                      <GitBranch className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Material Flow</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {/* Metadata Constructor — collapsible parent */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <div
                    className={`${NAV_BASE} cursor-pointer ${isMetadata ? NAV_ACTIVE : ""}`}
                    onClick={() => {
                      if (!isMetadata) navigate("/metadata");
                      setMetadataOpen((o) => !o);
                    }}
                  >
                    <Construction className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Metadata Constructor</span>
                        {metadataOpen
                          ? <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
                          : <ChevronRight className="h-3.5 w-3.5 text-text-secondary opacity-0 group-hover:opacity-100" />}
                      </>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!collapsed && metadataOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={`${SUB_BASE} cursor-pointer ${isActive("/metadata/rebuild") ? SUB_ACTIVE : ""}`}
                      onClick={() => navigate("/metadata/rebuild")}
                    >
                      <Workflow className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Workflow Canvas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={`${SUB_BASE} cursor-pointer ${isActive("/metadata/configurator") ? SUB_ACTIVE : ""}`}
                      onClick={() => navigate("/metadata/configurator")}
                    >
                      <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Metadata Configurator</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {/* Top-level destinations */}
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={NAV_BASE}
                      activeClassName={NAV_ACTIVE}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
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
          <SidebarGroupLabel
            className={`${collapsed ? "sr-only" : ""} text-[11px] uppercase tracking-wide text-text-secondary font-medium`}
          >
            Active Runs
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {RUNS.map((run) => (
                <SidebarMenuItem key={run.run_id}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={`/run/${run.run_id}`}
                      className={NAV_BASE}
                      activeClassName={NAV_ACTIVE}
                    >
                      <Activity className="h-3.5 w-3.5 flex-shrink-0" />
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
