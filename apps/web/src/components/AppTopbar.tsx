import { useState } from "react";
import { Menu, Search, Plus, LogOut, Settings } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { AppSidebar } from "@/components/AppSidebar";

interface AppTopbarProps {
  user?: { name?: string; email?: string } | null;
  onSearchOpen: () => void;
  onAddItem: () => void;
}

export function AppTopbar({ user, onSearchOpen, onAddItem }: AppTopbarProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await authClient.signOut();
    await router.invalidate();
    router.navigate({ to: "/login" });
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <header
        className="sticky top-0 z-40 flex h-14 items-center gap-3 px-4 border-b"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={() => setMobileOpen(true)}
          style={{ color: "var(--color-muted)" }}
        >
          <Menu size={18} />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Search */}
        <button
          onClick={onSearchOpen}
          className="flex flex-1 max-w-xs items-center gap-2 px-3 h-8 rounded-lg border text-sm transition-colors hover:border-opacity-80"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-background)",
            color: "var(--color-muted)",
          }}
        >
          <Search size={13} />
          <span className="flex-1 text-left">Search…</span>
          <kbd
            className="hidden sm:inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Add button */}
          <Button
            onClick={onAddItem}
            size="sm"
            className="gap-1.5 font-semibold"
            style={{ backgroundColor: "var(--color-accent)", color: "white", border: "none" }}
          >
            <Plus size={14} />
            Add
          </Button>

          {/* User menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <Avatar className="h-7 w-7 cursor-pointer">
                    <AvatarFallback
                      className="text-xs font-semibold"
                      style={{ backgroundColor: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user.name ?? "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings size={14} />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut size={14} />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0" style={{ backgroundColor: "var(--color-background)" }}>
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
