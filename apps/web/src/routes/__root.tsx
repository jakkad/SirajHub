import { createRootRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // Login page is always accessible
    if (location.pathname === "/login") return;

    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }

    return { user: session.user };
  },
  component: RootLayout,
});

function RootLayout() {
  const router = useRouter();
  const context = Route.useRouteContext();
  const user = (context as { user?: { name?: string; email?: string } }).user;

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
      {/* Top Navigation Bar */}
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

          {/* Right side — user menu */}
          {user && (
            <div className="flex items-center gap-3">
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

      {/* Page content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
