import { createRootRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { authClient } from "../lib/auth-client";
import { AddItemDialog } from "../components/AddItemDialog";
import { NextListPanel } from "../components/NextListPanel";
import { SearchCommand } from "../components/SearchCommand";
import { ItemDetailPanel } from "../components/ItemDetailPanel";
import type { Item } from "../lib/api";

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
  const router = useRouter();
  const context = Route.useRouteContext();
  const user = (context as { user?: { name?: string; email?: string } }).user;

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchSelectedItem, setSearchSelectedItem] = useState<Item | null>(null);

  // Cmd+K / Ctrl+K to open search
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

  async function handleLogout() {
    await authClient.signOut();
    await router.invalidate();
    router.navigate({ to: "/login" });
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-background)", color: "var(--color-foreground)" }}
    >
      {/* Top Navigation */}
      <header
        style={{
          borderBottom: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
        }}
        className="sticky top-0 z-50"
      >
        <div className="mx-auto max-w-screen-xl px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit", flexShrink: 0 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                color: "white",
              }}
            >
              S
            </div>
            <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>
              SirajHub
            </span>
          </Link>

          {/* Search bar (desktop) */}
          {user && (
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                flex: 1,
                maxWidth: 320,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-background)",
                color: "var(--color-muted)",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
              }}
              className="hidden sm:flex"
            >
              <span>🔍</span>
              <span style={{ flex: 1 }}>Search…</span>
              <kbd style={{ fontSize: 10, border: "1px solid var(--color-border)", borderRadius: 4, padding: "1px 5px" }}>
                ⌘K
              </kbd>
            </button>
          )}

          {/* Right side — desktop */}
          {user && (
            <div className="hidden sm:flex items-center gap-2">
              <NextListPanel />
              <button
                onClick={() => setAddItemOpen(true)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: "var(--color-accent)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                + Add
              </button>
              <Link
                to="/settings"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "transparent",
                  color: "var(--color-foreground)",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                ⚙
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "transparent",
                  color: "var(--color-foreground)",
                  cursor: "pointer",
                }}
              >
                Log out
              </button>
            </div>
          )}

          {/* Mobile: search icon + hamburger */}
          {user && (
            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-muted)", padding: "4px 6px" }}
              >
                🔍
              </button>
              <button
                onClick={() => setMobileMenuOpen((o) => !o)}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, color: "var(--color-foreground)", padding: "4px 6px", lineHeight: 1 }}
              >
                {mobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && user && (
          <div
            style={{
              borderTop: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <MobileNavButton onClick={() => { setAddItemOpen(true); setMobileMenuOpen(false); }}>
              + Add Item
            </MobileNavButton>
            <MobileNavButton onClick={() => setMobileMenuOpen(false)}>
              <Link to="/settings" style={{ color: "inherit", textDecoration: "none", display: "block", width: "100%" }}>
                ⚙ Settings
              </Link>
            </MobileNavButton>
            <MobileNavButton onClick={handleLogout}>
              Log out
            </MobileNavButton>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <AddItemDialog open={addItemOpen} onClose={() => setAddItemOpen(false)} />

      <SearchCommand
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(item) => {
          setSearchSelectedItem(item);
          setSearchOpen(false);
        }}
      />

      {/* Item detail panel opened from search */}
      <ItemDetailPanel
        item={searchSelectedItem}
        onClose={() => setSearchSelectedItem(null)}
      />
    </div>
  );
}

function MobileNavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        background: "transparent",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        fontSize: 14,
        color: "var(--color-foreground)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
