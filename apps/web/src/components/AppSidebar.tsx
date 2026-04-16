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

import { Badge } from "@/components/ui/badge";
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

  return (
    <Sidebar collapsible="offcanvas" className="border-none">
      <SidebarHeader className="gap-3 p-4">
        <div className="rounded-[24px] border border-sidebar-border bg-sidebar-accent/80 px-4 py-4 shadow-[var(--shadow-subtle)]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[14px] bg-sidebar text-sidebar-primary ring-1 ring-sidebar-border shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]">
              <span className="text-sm font-semibold">S</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[1.25rem] font-semibold tracking-[-0.05em] text-sidebar-foreground">SirajHub</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/40">Personal media dashboard</p>
            </div>
          </div>
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
        <div className="flex flex-col gap-3 rounded-[22px] border border-sidebar-border bg-sidebar-accent/75 px-4 py-3.5 shadow-[var(--shadow-subtle)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold tracking-[-0.04em] text-sidebar-foreground">Workspace</p>
            <Badge variant="secondary" className="bg-primary/12 text-primary">
              live
            </Badge>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/settings"}>
                <Link to="/settings" onClick={onNavigate}>
                  <Settings />
                  <span>Preferences</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
