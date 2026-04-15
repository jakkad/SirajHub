import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";

interface MoviePosterGridProps {
  items: Item[];
}

// Generate a deterministic gradient from an item id
function idToGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, oklch(25% 0.1 ${hue}), oklch(15% 0.05 ${(hue + 40) % 360}))`;
}

export function MoviePosterGrid({ items }: MoviePosterGridProps) {
  if (items.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--color-muted)", padding: "20px 0" }}>No movies saved yet.</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 12,
      }}
    >
      {items.map((item) => {
        const year = item.releaseDate?.slice(0, 4);
        return (
          <Link key={item.id} to="/item/$id" params={{ id: item.id }} style={{ textDecoration: "none" }}>
            <div
              style={{ cursor: "pointer", position: "relative" }}
              onMouseEnter={(e) => {
                const overlay = e.currentTarget.querySelector(".poster-overlay") as HTMLElement | null;
                if (overlay) overlay.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                const overlay = e.currentTarget.querySelector(".poster-overlay") as HTMLElement | null;
                if (overlay) overlay.style.opacity = "0";
              }}
            >
              {/* 2:3 poster */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "2/3",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: item.coverUrl ? "var(--color-surface)" : idToGradient(item.id),
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  transition: "box-shadow 0.15s",
                }}
              >
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 36 }}>🎬</span>
                )}

                {/* Hover overlay slides up from bottom */}
                <div
                  className="poster-overlay"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "28px 10px 10px",
                    background: "linear-gradient(to top, oklch(0% 0 0 / 0.85) 0%, transparent 100%)",
                    opacity: 0,
                    transition: "opacity 0.2s",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "white", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {item.title}
                  </div>
                  {year && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>
                      {year}
                      {item.rating && ` · ${"★".repeat(item.rating)}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
