import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-background)", color: "var(--color-foreground)" }}>
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

          {/* Right side — placeholder for Phase 2 (auth) + Phase 3 (add button) */}
          <div style={{ color: "var(--color-muted)", fontSize: 13 }}>
            Phase 1 — Foundation
          </div>
        </div>
      </header>

      {/* Page content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
