import { createRootRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { AddItemDialog } from "../components/AddItemDialog";

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
        <div className="mx-auto max-w-screen-xl px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
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
          </div>

          {/* Right side */}
          {user && (
            <div className="flex items-center gap-3">
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
                + Add Item
              </button>
              <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
                {user.name ?? user.email}
              </span>
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
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <AddItemDialog open={addItemOpen} onClose={() => setAddItemOpen(false)} />
    </div>
  );
}
