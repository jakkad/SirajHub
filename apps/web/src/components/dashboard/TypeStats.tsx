import { Link } from "@tanstack/react-router";
import { CONTENT_TYPES } from "../../lib/constants";
import type { Item } from "../../lib/api";

interface TypeStatsProps {
  items: Item[];
}

const TYPE_ROUTES: Record<string, string> = {
  book: "/books",
  movie: "/movies",
  tv: "/tv",
  podcast: "/podcasts",
  youtube: "/videos",
  article: "/articles",
  tweet: "/tweets",
};

export function TypeStats({ items }: TypeStatsProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 10,
      }}
    >
      {CONTENT_TYPES.map((ct) => {
        const count = items.filter((i) => i.contentType === ct.id).length;
        const route = TYPE_ROUTES[ct.id] ?? "/";
        return (
          <Link
            key={ct.id}
            to={route as "/"}
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "16px 8px",
                borderRadius: 12,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = ct.color;
                (e.currentTarget as HTMLDivElement).style.background = `color-mix(in oklch, ${ct.color} 8%, var(--color-surface))`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)";
                (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface)";
              }}
            >
              <span style={{ fontSize: 22 }}>{ct.icon}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: ct.color, lineHeight: 1 }}>
                {count}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500, textAlign: "center" }}>
                {ct.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
