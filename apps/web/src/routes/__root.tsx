import { createRootRoute, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { AddItemDialog } from "@/components/AddItemDialog";
import { NextListPanel } from "@/components/NextListPanel";
import { SearchCommand } from "@/components/SearchCommand";
import { ItemDetailPanel } from "@/components/ItemDetailPanel";
import { AppSidebar } from "@/components/AppSidebar";
import { AppTopbar } from "@/components/AppTopbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Item } from "@/lib/api";

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/login") return;

    const { data: session } = await authClient.getSession();
    if (!session) throw redirect({ to: "/login" });

    return { user: session.user };
  },
  component: RootLayout,
});

function RootLayout() {
  const context = Route.useRouteContext();
  const user = (context as { user?: { name?: string; email?: string } }).user;
  const { location } = useRouterState();
  const isLoginPage = location.pathname === "/login";

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSelectedItem, setSearchSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!user || isLoginPage) {
    return (
      <div style={{ backgroundColor: "var(--color-background)", minHeight: "100vh" }}>
        <Outlet />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className="flex h-screen overflow-hidden"
        style={{ backgroundColor: "var(--color-background)", color: "var(--color-foreground)" }}
      >
        {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
        <aside
          className="hidden md:flex flex-col w-56 shrink-0 border-r overflow-y-auto"
          style={{
            backgroundColor: "var(--color-background)",
            borderColor: "var(--color-border)",
          }}
        >
          <AppSidebar />

          {/* Next-to-consume button at bottom of sidebar */}
          <div className="px-2 pb-3">
            <NextListPanel />
          </div>
        </aside>

        {/* ── Main column ─────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <AppTopbar
            user={user}
            onSearchOpen={() => setSearchOpen(true)}
            onAddItem={() => setAddItemOpen(true)}
          />

          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ── Global overlays ────────────────────────────────────────────────── */}
      <AddItemDialog open={addItemOpen} onClose={() => setAddItemOpen(false)} />

      <SearchCommand
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(item) => {
          setSearchSelectedItem(item);
          setSearchOpen(false);
        }}
      />

      <ItemDetailPanel
        item={searchSelectedItem}
        onClose={() => setSearchSelectedItem(null)}
      />
    </TooltipProvider>
  );
}
