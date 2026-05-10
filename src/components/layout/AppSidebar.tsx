import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Database, Construction, Brain, Activity, FileText,
  Map, ChevronDown, ChevronRight, Workflow, Boxes, GitBranch, ClipboardList,
  Factory, FlaskConical, Filter as FilterIcon, Droplets, Bell, BarChart3,
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
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "GenAI", url: "/ai", icon: Brain },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const isEquipment = location.pathname.startsWith("/equipment");
  const isMetadata = location.pathname.startsWith("/metadata");
  const isCho = location.pathname.startsWith("/cho-production-line");
  const [equipmentOpen, setEquipmentOpen] = useState(isEquipment);
  const [metadataOpen, setMetadataOpen] = useState(isMetadata);
  const [choOpen, setChoOpen] = useState(isCho);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div
            className={collapsed ? "h-14 border-b border-sidebar-border" : "px-4 py-4 border-b border-sidebar-border"}
          >
            {!collapsed && (
              <>
                <h2 className="text-section text-foreground">Data Vest</h2>
                <p className="text-[11px] text-text-secondary mt-1">
                  Instrumental Data Collection &amp; Analytics
                </p>
              </>
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

              {/* CHO Production Line — collapsible parent */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <div
                    className={`${NAV_BASE} cursor-pointer ${isCho && location.pathname === "/cho-production-line" ? NAV_ACTIVE : ""}`}
                    onClick={() => {
                      if (location.pathname !== "/cho-production-line") navigate("/cho-production-line");
                      setChoOpen((o) => !o);
                    }}
                  >
                    <Factory className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">CHO Production Line</span>
                        {choOpen
                          ? <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
                          : <ChevronRight className="h-3.5 w-3.5 text-text-secondary opacity-0 group-hover:opacity-100" />}
                      </>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!collapsed && choOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={`${SUB_BASE} cursor-pointer ${isActive("/cho-production-line") ? SUB_ACTIVE : ""}`}
                      onClick={() => navigate("/cho-production-line")}
                    >
                      <Factory className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="flex-1">Campaign Overview</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={`${SUB_BASE} cursor-pointer ${isActive("/cho-production-line/bioreactor") ? SUB_ACTIVE : ""}`}
                      onClick={() => navigate("/cho-production-line/bioreactor")}
                    >
                      <FlaskConical className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="flex-1 truncate min-w-0">Bioreactor BR-003-p</span>
                      <span className="flex-shrink-0 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded text-[9px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        1
                      </span>
                      <span className="flex-shrink-0 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded text-[9px] font-medium bg-destructive/15 text-destructive">
                        OOS
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={`${SUB_BASE} cursor-pointer ${isActive("/cho-production-line/centrifuge") ? SUB_ACTIVE : ""}`}
                      onClick={() => navigate("/cho-production-line/centrifuge")}
                    >
                      <FilterIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="flex-1">Centrifuge CFG-003</span>
                      <span className="ml-auto inline-flex items-center justify-center min-w-4 h-4 px-1 rounded text-[9px] font-medium bg-secondary text-text-secondary">
                        0
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={`${SUB_BASE} cursor-pointer ${isActive("/cho-production-line/ultrafiltration") ? SUB_ACTIVE : ""}`}
                      onClick={() => navigate("/cho-production-line/ultrafiltration")}
                    >
                      <Droplets className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="flex-1">UF Skid UF-03</span>
                      <span className="ml-auto inline-flex items-center justify-center min-w-4 h-4 px-1 rounded text-[9px] font-medium bg-secondary text-text-secondary">
                        0
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={`${SUB_BASE} cursor-pointer ${isActive("/cho-production-line/campaign-analytics") ? SUB_ACTIVE : ""}`}
                      onClick={() => navigate("/cho-production-line/campaign-analytics")}
                    >
                      <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Campaign Analytics</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={`${SUB_BASE} cursor-pointer ${location.pathname === "/reports" ? SUB_ACTIVE : ""}`}
                      onClick={() => navigate("/reports")}
                    >
                      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Campaign Report</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}


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
