import { createRootRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { AppSidebar } from "@/components/AppSidebar";
import { AppTopbar } from "@/components/AppTopbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { Item } from "@/lib/api";

const AddItemDialog = lazy(() => import("@/components/AddItemDialog").then((module) => ({ default: module.AddItemDialog })));
const NextListPanel = lazy(() => import("@/components/NextListPanel").then((module) => ({ default: module.NextListPanel })));
const SearchCommand = lazy(() => import("@/components/SearchCommand").then((module) => ({ default: module.SearchCommand })));
const ItemDetailPanel = lazy(() => import("@/components/ItemDetailPanel").then((module) => ({ default: module.ItemDetailPanel })));

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
  const [nextListOpen, setNextListOpen] = useState(false);
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
      <div className="paper-page" style={{ minHeight: "100vh" }}>
        <Outlet />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="paper-page flex min-h-screen w-full text-foreground">
          <AppSidebar />

          <SidebarInset className="min-w-0">
            <div className="flex min-h-screen flex-1 flex-col pl-0 md:pl-4">
              <AppTopbar
                user={user}
                onSearchOpen={() => setSearchOpen(true)}
                onNextListOpen={() => setNextListOpen(true)}
                onAddItem={() => setAddItemOpen(true)}
              />

              <main className="flex-1 overflow-y-auto px-4 pb-8 pt-4 md:px-6">
                <div className="mx-auto max-w-[1400px]">
                  <Outlet />
                </div>
              </main>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>

      {/* ── Global overlays ────────────────────────────────────────────────── */}
      <Suspense fallback={null}>
        <AddItemDialog open={addItemOpen} onClose={() => setAddItemOpen(false)} />
        <NextListPanel open={nextListOpen} onOpenChange={setNextListOpen} showTrigger={false} />

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
      </Suspense>
    </TooltipProvider>
  );
}
