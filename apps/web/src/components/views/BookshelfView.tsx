import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";
import { STATUSES } from "../../lib/constants";

interface BookshelfViewProps {
  items: Item[];
}

// Deterministic spine color per item
function idToHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

function BookSpine({ item }: { item: Item }) {
  const hue = idToHue(item.id);
  const spineColor = `oklch(38% 0.15 ${hue})`;
  const textColor = `oklch(92% 0.04 ${hue})`;

  return (
    <Link to="/item/$id" params={{ id: item.id }} style={{ textDecoration: "none" }}>
      <div
        title={item.title + (item.creator ? ` — ${item.creator}` : "")}
        style={{
          position: "relative",
          width: 32,
          height: 160,
          flexShrink: 0,
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(-6px)";
          el.style.boxShadow = "0 8px 20px oklch(0% 0 0 / 0.5)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "none";
        }}
      >
        {/* Spine or cover */}
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 3,
              border: "1px solid var(--color-border)",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: spineColor,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: "1px solid oklch(0% 0 0 / 0.2)",
              boxShadow: "inset -3px 0 6px oklch(0% 0 0 / 0.2)",
            }}
          >
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontSize: 9,
                fontWeight: 700,
                color: textColor,
                textAlign: "center",
                padding: "4px 2px",
                lineHeight: 1.2,
                overflow: "hidden",
                maxHeight: "100%",
                letterSpacing: "0.02em",
              }}
            >
              {item.title.length > 28 ? item.title.slice(0, 26) + "…" : item.title}
            </span>
          </div>
        )}

        {/* Rating dot if rated */}
        {item.rating != null && (
          <div
            style={{
              position: "absolute",
              top: 4,
              left: "50%",
              transform: "translateX(-50%)",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "oklch(80% 0.18 80)",
            }}
          />
        )}
      </div>
    </Link>
  );
}

function Shelf({ label, items }: { label: string; items: Item[] }) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Shelf label */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
        {label} · {items.length}
      </div>

      {/* Books row */}
      <div
        style={{
          overflowX: "auto",
          paddingBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 3,
            alignItems: "flex-end",
            minWidth: "min-content",
            paddingBottom: 10,
            borderBottom: "3px solid var(--color-border)",
          }}
        >
          {items.map((item) => (
            <BookSpine key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BookshelfView({ items }: BookshelfViewProps) {
  if (items.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--color-muted)", padding: "20px 0" }}>No books saved yet.</div>;
  }

  const shelves = STATUSES.map((s) => ({
    id: s.id,
    label: s.label,
    items: [...items.filter((i) => i.status === s.id)].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  })).filter((s) => s.items.length > 0);

  return (
    <div>
      {shelves.map((shelf) => (
        <Shelf key={shelf.id} label={shelf.label} items={shelf.items} />
      ))}
    </div>
  );
}
