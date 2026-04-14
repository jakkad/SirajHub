import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const CONTENT_TYPES = [
  { id: "book",    label: "Books",     color: "var(--color-book)",    icon: "📚" },
  { id: "movie",   label: "Movies",    color: "var(--color-movie)",   icon: "🎬" },
  { id: "tv",      label: "TV Shows",  color: "var(--color-tv)",      icon: "📺" },
  { id: "podcast", label: "Podcasts",  color: "var(--color-podcast)", icon: "🎙️" },
  { id: "youtube", label: "YouTube",   color: "var(--color-youtube)", icon: "▶️" },
  { id: "article", label: "Articles",  color: "var(--color-article)", icon: "📄" },
  { id: "tweet",   label: "Tweets",    color: "var(--color-tweet)",   icon: "𝕏" },
] as const;

const STATUSES = [
  { id: "suggestions", label: "Suggestions",  color: "var(--color-suggestions)" },
  { id: "in_progress", label: "In Progress",  color: "var(--color-in-progress)" },
  { id: "finished",    label: "Finished",     color: "var(--color-finished)"    },
  { id: "archived",    label: "Archived",     color: "var(--color-archived)"    },
] as const;

function HomePage() {
  const [healthStatus, setHealthStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: unknown) => {
        setHealthStatus((data as { ok?: boolean })?.ok ? "ok" : "error");
      })
      .catch(() => setHealthStatus("error"));
  }, []);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12">
      {/* Hero */}
      <div className="mb-16 text-center">
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "1rem",
          }}
        >
          Your personal{" "}
          <span style={{ color: "var(--color-accent)" }}>content universe</span>
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: 18, maxWidth: 520, margin: "0 auto 2rem" }}>
          Track everything you read, watch, and listen to — in one place.
        </p>

        {/* API health badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor:
                healthStatus === "ok"
                  ? "var(--color-finished)"
                  : healthStatus === "error"
                  ? "var(--color-podcast)"
                  : "var(--color-in-progress)",
              boxShadow:
                healthStatus === "ok"
                  ? "0 0 0 3px oklch(68% 0.15 150 / 0.2)"
                  : undefined,
            }}
          />
          <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
            {healthStatus === "loading" && "Checking Worker API…"}
            {healthStatus === "ok" && "Worker API online"}
            {healthStatus === "error" && "Worker API unreachable"}
          </span>
        </div>
      </div>

      {/* Content type grid */}
      <section className="mb-12">
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-muted)",
            marginBottom: "1rem",
          }}
        >
          Content types
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {CONTENT_TYPES.map((type) => (
            <div
              key={type.id}
              style={{
                padding: "16px",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                cursor: "default",
                transition: "background-color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--color-surface-hover)";
                (e.currentTarget as HTMLDivElement).style.borderColor = type.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--color-surface)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)";
              }}
            >
              <span style={{ fontSize: 24 }}>{type.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: type.color }}>
                {type.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Status columns preview */}
      <section>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-muted)",
            marginBottom: "1rem",
          }}
        >
          Status board
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {STATUSES.map((status) => (
            <div
              key={status.id}
              style={{
                padding: "16px",
                borderRadius: "var(--radius-lg)",
                border: `1px solid var(--color-border)`,
                borderTop: `3px solid ${status.color}`,
                backgroundColor: "var(--color-surface)",
                minHeight: 120,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{status.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    backgroundColor: `color-mix(in oklch, ${status.color} 15%, transparent)`,
                    color: status.color,
                  }}
                >
                  0
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0 }}>
                No items yet
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
