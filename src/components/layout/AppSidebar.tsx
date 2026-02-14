import { LayoutDashboard, ClipboardList, Settings, Activity } from "lucide-react";
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
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Event Log", url: "/events", icon: ClipboardList },
  { title: "Admin", url: "/admin", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-6">
            <h2 className={`font-bold text-lg ${collapsed ? "text-center" : ""}`}>
              {collapsed ? "BP" : "BioProcess"}
            </h2>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
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
