import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";
import type { SelectionProps } from "./TypePageLayout";
import { SelectionOverlay } from "./SelectionOverlay";

interface PodcastGridProps {
  items: Item[];
  selectionProps?: SelectionProps;
}

export function PodcastGrid({ items, selectionProps }: PodcastGridProps) {
  if (items.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--color-muted)", padding: "20px 0" }}>No podcasts saved yet.</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 14,
      }}
    >
      {items.map((item) => {
        let meta: { episodeCount?: number; publisher?: string } = {};
        try { if (item.metadata) meta = JSON.parse(item.metadata); } catch { /* ignore */ }

        return (
          <Link key={item.id} to="/item/$id" params={{ id: item.id }} style={{ textDecoration: "none" }}>
            <div
              style={{ cursor: "pointer" }}
              className="group"
            >
              {/* Square album art */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "color-mix(in oklch, var(--color-podcast) 20%, var(--color-surface))",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px oklch(0% 0 0 / 0.4)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
              >
                {selectionProps?.isSelectionMode && (
                  <SelectionOverlay 
                    isSelected={selectionProps.selectedIds.has(item.id)} 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      selectionProps.toggleSelection(item.id);
                    }} 
                  />
                )}
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 42 }}>🎙️</span>
                )}

                {/* Hover overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "oklch(0% 0 0 / 0.55)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.15s",
                    padding: 8,
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "1")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "0")}
                >
                  {meta.episodeCount != null && (
                    <div style={{ fontSize: 12, color: "white", fontWeight: 600 }}>{meta.episodeCount} eps</div>
                  )}
                  {meta.publisher && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 2 }}>{meta.publisher}</div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.title}
              </div>
              {item.creator && (
                <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.creator}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
