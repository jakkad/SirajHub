import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";
import { CONTENT_TYPES } from "../../lib/constants";

interface RecentlyAddedProps {
  items: Item[];
}

export function RecentlyAdded({ items }: RecentlyAddedProps) {
  const recent = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

  if (recent.length === 0) {
    return <EmptyState message="No items added yet." />;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        overflowX: "auto",
        paddingBottom: 4,
      }}
    >
      {recent.map((item) => {
        const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);
        return (
          <Link key={item.id} to="/item/$id" params={{ id: item.id }} style={{ textDecoration: "none", flexShrink: 0 }}>
            <div
              style={{
                width: 110,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                cursor: "pointer",
              }}
            >
              {/* Cover */}
              <div
                style={{
                  width: 110,
                  height: 74,
                  borderRadius: 8,
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
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 24 }}>{ct?.icon ?? "📄"}</span>
                )}
              </div>

              {/* Title + type badge */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-foreground)",
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.title}
                </div>
                {ct && (
                  <span
                    style={{
                      fontSize: 10,
                      color: ct.color,
                      fontWeight: 600,
                      marginTop: 2,
                      display: "block",
                    }}
                  >
                    {ct.label}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ fontSize: 13, color: "var(--color-muted)", padding: "12px 0" }}>{message}</div>
  );
}
