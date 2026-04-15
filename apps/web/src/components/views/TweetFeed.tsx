import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";

interface TweetFeedProps {
  items: Item[];
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function TweetFeed({ items }: TweetFeedProps) {
  if (items.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--color-muted)", padding: "20px 0" }}>No tweets saved yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600, margin: "0 auto" }}>
      {items.map((item) => (
        <Link key={item.id} to="/item/$id" params={{ id: item.id }} style={{ textDecoration: "none" }}>
          <div
            style={{
              padding: "16px",
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              cursor: "pointer",
              transition: "border-color 0.12s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-tweet, #1d9bf0)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)")}
          >
            {/* Author row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              {/* Avatar circle */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--color-tweet, #1d9bf0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {getInitials(item.creator)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.creator ?? "Unknown"}
                </div>
                {item.title && item.title !== item.creator && (
                  <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                    {item.title}
                  </div>
                )}
              </div>
              {/* X icon */}
              <span style={{ fontSize: 16, color: "var(--color-muted)", flexShrink: 0 }}>𝕏</span>
            </div>

            {/* Tweet text */}
            <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.6, color: "var(--color-foreground)" }}>
              {item.description ?? item.title}
            </p>

            {/* Footer: date + link */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "var(--color-muted)" }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 11, color: "var(--color-accent)", textDecoration: "none" }}
                >
                  ↗ View
                </a>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
