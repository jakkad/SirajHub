import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";
import { parseTVMetadata } from "../../lib/tv";
import type { SelectionProps } from "./TypePageLayout";
import { CoverOverlay, useFinishedYear } from "./CoverOverlay";
import { SelectionOverlay } from "./SelectionOverlay";

interface TVPosterGridProps {
  items: Item[];
  selectionProps?: SelectionProps;
}

function idToGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, oklch(25% 0.1 ${hue}), oklch(15% 0.05 ${(hue + 60) % 360}))`;
}

export function TVPosterGrid({ items, selectionProps }: TVPosterGridProps) {
  const getFinishedYear = useFinishedYear();

  if (items.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--color-muted)", padding: "20px 0" }}>No TV shows saved yet.</div>;
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
        const tvMetadata = parseTVMetadata(item.metadata);
        const seasons = tvMetadata?.seasonCount ?? tvMetadata?.seasons.length;

        return (
          <Link key={item.id} to="/item/$id" params={{ id: item.id }} className="group" style={{ textDecoration: "none" }}>
            <div style={{ cursor: "pointer", position: "relative" }}>
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
                  <span style={{ fontSize: 36 }}>📺</span>
                )}

                {/* Season count badge top-right */}
                {seasons != null && (
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      background: "oklch(0% 0 0 / 0.75)",
                      color: "white",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {seasons} Seasons
                  </div>
                )}

                <CoverOverlay item={item} year={getFinishedYear(item.finishedAt)} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
