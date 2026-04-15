import { LogOut, Plus, Search, Settings } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppTopbarProps {
  user?: { name?: string; email?: string } | null;
  onSearchOpen: () => void;
  onAddItem: () => void;
}

export function AppTopbar({ user, onSearchOpen, onAddItem }: AppTopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    await router.invalidate();
    router.navigate({ to: "/login" });
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-30 border-b-2 border-[hsl(var(--border-strong))] bg-[hsl(var(--background)/0.86)] px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />

        <div className="hidden md:flex items-center gap-2">
          <Badge variant="outline" className="bg-card text-foreground">
            running live
          </Badge>
        </div>

        <Button
          variant="outline"
          className="ml-0 flex h-11 min-w-0 flex-1 items-center justify-between gap-3 px-4 sm:max-w-sm"
          onClick={onSearchOpen}
        >
          <span className="flex items-center gap-2 truncate">
            <Search data-icon="inline-start" />
            Search your library
          </span>
          <kbd className="hidden rounded-full border border-[hsl(var(--border-strong))] bg-background px-2 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-flex">
            CMD K
          </kbd>
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={onAddItem}
            variant="secondary"
            className="gap-2"
          >
            <Plus data-icon="inline-start" />
            Add
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <Avatar className="size-11 cursor-pointer border-2 border-[hsl(var(--border-strong))] shadow-[3px_3px_0_hsl(var(--shadow-ink))]">
                    <AvatarFallback
                      className="bg-primary text-sm font-semibold text-primary-foreground"
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="font-display text-xl truncate">{user.name ?? "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
