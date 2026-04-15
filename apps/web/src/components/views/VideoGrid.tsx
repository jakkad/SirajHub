import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";

interface VideoGridProps {
  items: Item[];
}

function formatDuration(mins: number | null): string {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}`;
  return `${m}:00`;
}

export function VideoGrid({ items }: VideoGridProps) {
  if (items.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--color-muted)", padding: "20px 0" }}>No videos saved yet.</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 16,
      }}
    >
      {items.map((item) => (
        <Link key={item.id} to="/item/$id" params={{ id: item.id }} style={{ textDecoration: "none" }}>
          <div style={{ cursor: "pointer" }}>
            {/* 16:9 thumbnail */}
            <div
              style={{
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: 8,
                overflow: "hidden",
                background: "color-mix(in oklch, var(--color-youtube) 20%, var(--color-surface))",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                const overlay = e.currentTarget.querySelector(".play-overlay") as HTMLElement | null;
                if (overlay) overlay.style.opacity = "1";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px oklch(0% 0 0 / 0.4)";
              }}
              onMouseLeave={(e) => {
                const overlay = e.currentTarget.querySelector(".play-overlay") as HTMLElement | null;
                if (overlay) overlay.style.opacity = "0";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              {item.coverUrl ? (
                <img src={item.coverUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 36 }}>▶️</span>
              )}

              {/* Play button overlay */}
              <div
                className="play-overlay"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "oklch(0% 0 0 / 0.4)",
                  opacity: 0,
                  transition: "opacity 0.15s",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "oklch(0% 0 0 / 0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: "white",
                  }}
                >
                  ▶
                </div>
              </div>

              {/* Duration badge */}
              {item.durationMins && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    right: 6,
                    background: "oklch(0% 0 0 / 0.8)",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 5px",
                    borderRadius: 4,
                  }}
                >
                  {formatDuration(item.durationMins)}
                </div>
              )}
            </div>

            {/* Title (2-line clamp) + channel */}
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {item.title}
              </div>
              {item.creator && (
                <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.creator}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
