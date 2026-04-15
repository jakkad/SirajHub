import { useState } from "react";
import { useItems } from "../../hooks/useItems";
import type { ContentTypeId, StatusId } from "../../lib/constants";
import { STATUSES } from "../../lib/constants";
import type { Item } from "../../lib/api";

interface TypePageLayoutProps {
  contentType: ContentTypeId;
  title: string;
  color: string;
  icon: string;
  children: (items: Item[]) => React.ReactNode;
}

const STATUS_FILTERS: Array<{ id: StatusId | "all"; label: string }> = [
  { id: "all", label: "All" },
  ...STATUSES.map((s) => ({ id: s.id, label: s.label })),
];

export function TypePageLayout({ contentType, title, color, icon, children }: TypePageLayoutProps) {
  const [statusFilter, setStatusFilter] = useState<StatusId | "all">("all");
  const { data: allItems = [], isLoading } = useItems({ content_type: contentType });

  const filtered = statusFilter === "all"
    ? allItems
    : allItems.filter((i) => i.status === statusFilter);

  const countByStatus = (id: StatusId | "all") =>
    id === "all" ? allItems.length : allItems.filter((i) => i.status === id).length;

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8">
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <span style={{ fontSize: 26 }}>{icon}</span>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color }}>{title}</h1>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: "2px 10px",
            borderRadius: 999,
            background: `color-mix(in oklch, ${color} 15%, transparent)`,
            color,
            marginLeft: 2,
          }}
        >
          {allItems.length}
        </span>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((sf) => {
          const count = countByStatus(sf.id);
          if (sf.id !== "all" && count === 0) return null;
          const active = statusFilter === sf.id;
          return (
            <button
              key={sf.id}
              onClick={() => setStatusFilter(sf.id)}
              style={{
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                padding: "5px 13px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: active ? `color-mix(in oklch, ${color} 22%, transparent)` : "var(--color-surface)",
                color: active ? color : "var(--color-muted)",
                outline: active ? `1px solid color-mix(in oklch, ${color} 45%, transparent)` : "none",
                transition: "background 0.12s, color 0.12s",
              }}
            >
              {sf.label}
              <span style={{ opacity: 0.7, marginLeft: 4 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ height: 120, borderRadius: 12, background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
      ) : (
        children(filtered)
      )}
    </div>
  );
}
