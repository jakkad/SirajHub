import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, BookOpen, Film, Tv, Mic, Play,
  FileText, MessageSquare, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/",         label: "Dashboard",  icon: LayoutDashboard, color: undefined },
  { to: "/books",    label: "Books",      icon: BookOpen,        color: "var(--color-book)"    },
  { to: "/movies",   label: "Movies",     icon: Film,            color: "var(--color-movie)"   },
  { to: "/tv",       label: "TV Shows",   icon: Tv,              color: "var(--color-tv)"      },
  { to: "/podcasts", label: "Podcasts",   icon: Mic,             color: "var(--color-podcast)" },
  { to: "/videos",   label: "Videos",     icon: Play,            color: "var(--color-youtube)" },
  { to: "/articles", label: "Articles",   icon: FileText,        color: "var(--color-article)" },
  { to: "/tweets",   label: "Tweets",     icon: MessageSquare,   color: "var(--color-tweet)"   },
] as const;

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { location } = useRouterState();

  return (
    <nav className="flex flex-col h-full py-3 px-2 gap-0.5">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-2 mb-2">
        <div
          className="flex items-center justify-center rounded-lg text-white font-bold text-sm"
          style={{
            width: 28, height: 28,
            backgroundColor: "var(--color-accent)",
            flexShrink: 0,
          }}
        >
          S
        </div>
        <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--color-foreground)" }}>
          SirajHub
        </span>
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map(({ to, label, icon: Icon, color }) => {
        const isActive = to === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(to);

        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "text-white"
                : "hover:bg-white/5"
            )}
            style={{
              backgroundColor: isActive ? "var(--color-accent-subtle)" : undefined,
              color: isActive ? "var(--color-accent)" : "var(--color-muted)",
            }}
          >
            <Icon
              size={16}
              style={{ color: isActive ? "var(--color-accent)" : (color ?? "var(--color-muted)") }}
              className="shrink-0"
            />
            <span>{label}</span>
            {color && isActive && (
              <span
                className="ml-auto h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
          </Link>
        );
      })}

      {/* Divider */}
      <div className="mt-auto mb-1 mx-3 h-px" style={{ backgroundColor: "var(--color-border)" }} />

      {/* Settings */}
      <Link
        to="/settings"
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
        style={{
          color: location.pathname === "/settings" ? "var(--color-accent)" : "var(--color-muted)",
          backgroundColor: location.pathname === "/settings" ? "var(--color-accent-subtle)" : undefined,
        }}
      >
        <Settings size={16} className="shrink-0" style={{ color: location.pathname === "/settings" ? "var(--color-accent)" : "var(--color-muted)" }} />
        <span>Settings</span>
      </Link>
    </nav>
  );
}
