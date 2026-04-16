import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  FileText,
  Film,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Play,
  Settings,
  Tv,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, color: undefined },
  { to: "/books", label: "Books", icon: BookOpen, color: "var(--color-book)" },
  { to: "/movies", label: "Movies", icon: Film, color: "var(--color-movie)" },
  { to: "/tv", label: "TV Shows", icon: Tv, color: "var(--color-tv)" },
  { to: "/podcasts", label: "Podcasts", icon: Mic, color: "var(--color-podcast)" },
  { to: "/videos", label: "Videos", icon: Play, color: "var(--color-youtube)" },
  { to: "/articles", label: "Articles", icon: FileText, color: "var(--color-article)" },
  { to: "/tweets", label: "Tweets", icon: MessageSquare, color: "var(--color-tweet)" },
] as const;

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { location } = useRouterState();
  const isSettings = location.pathname === "/settings";

  return (
    <Sidebar collapsible="offcanvas" className="border-none">
      <SidebarHeader className="px-4 pb-2 pt-5">
        <div className="px-2">
          <p className="truncate text-[1.45rem] font-semibold tracking-[-0.05em] text-sidebar-foreground">SirajHub</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-4">
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ to, label, icon: Icon, color }) => {
                const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label} className="font-medium">
                      <Link to={to} onClick={onNavigate}>
                        <Icon style={color ? { color } : undefined} />
                        <span>{label}</span>
                        {color ? (
                          <span
                            className="ml-auto size-2.5 rounded-full border border-sidebar-border/70"
                            style={{ backgroundColor: color }}
                          />
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 pt-2">
        <SidebarSeparator />
        <div className="flex items-center justify-between px-2 pt-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isSettings} tooltip="Settings" className="size-11 justify-center p-0">
                <Link to="/settings" onClick={onNavigate} aria-label="Settings">
                  <Settings />
                  <span className="sr-only">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <span
            className="size-2.5 rounded-full border border-sidebar-border/70 bg-emerald-500 shadow-[0_0_0_4px_hsl(var(--sidebar-accent)/0.55)]"
            aria-label="Live status"
            title="Live"
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
