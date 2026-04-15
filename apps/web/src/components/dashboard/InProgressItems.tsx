import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";
import { CONTENT_TYPES } from "../../lib/constants";

interface InProgressItemsProps {
  items: Item[];
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function InProgressItems({ items }: InProgressItemsProps) {
  const inProgress = items.filter((i) => i.status === "in_progress");

  if (inProgress.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--color-muted)", padding: "4px 0" }}>Nothing in progress.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {inProgress.map((item) => {
        const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);
        return (
          <Link key={item.id} to="/item/$id" params={{ id: item.id }} style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                cursor: "pointer",
                transition: "border-color 0.12s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = ct?.color ?? "var(--color-accent)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)")}
            >
              {/* Cover / icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  overflow: "hidden",
                  background: ct ? `color-mix(in oklch, ${ct.color} 20%, var(--color-surface))` : "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 18 }}>{ct?.icon ?? "📄"}</span>
                )}
              </div>

              {/* Title + creator */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title}
                </div>
                {item.creator && (
                  <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.creator}
                  </div>
                )}
              </div>

              {/* Started date */}
              <div style={{ fontSize: 11, color: "var(--color-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                {item.startedAt ? `Started ${timeAgo(item.startedAt)}` : ""}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
