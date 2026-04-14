import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BoardView } from "../components/BoardView";
import { GridView } from "../components/GridView";
import { ItemDetailPanel } from "../components/ItemDetailPanel";
import { useItems } from "../hooks/useItems";
import { useTags, useItemTags } from "../hooks/useTags";
import type { Item } from "../lib/api";
import type { Tag } from "../hooks/useTags";
import { CONTENT_TYPES } from "../lib/constants";
import type { ContentTypeId } from "../lib/constants";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

type ViewMode = "board" | "grid";

function IndexPage() {
  const [view, setView] = useState<ViewMode>(() => {
    return (localStorage.getItem("sirajhub-view") as ViewMode) ?? "board";
  });
  const [activeTypeFilter, setActiveTypeFilter] = useState<ContentTypeId | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Item | null>(null);

  const { data: allItems = [] } = useItems();
  const { data: allTags = [] } = useTags();

  // Pre-fetch item tags for the detail panel — only when an item is selected
  const { data: detailItemTags = [] } = useItemTags(detailItem?.id ?? null);

  // Build a map of itemId → tags for display in cards (only for items with tags)
  // Fetch all item-tag associations by checking which tags exist per item
  // For performance, we show tags on cards only when a tag filter is active or we have
  // a small enough set — for now just pass tags to GridView/BoardView and they'll use the global list

  function toggleView(v: ViewMode) {
    setView(v);
    localStorage.setItem("sirajhub-view", v);
  }

  // Apply filters
  const filteredItems = allItems.filter((item) => {
    if (activeTypeFilter && item.contentType !== activeTypeFilter) return false;
    return true;
  });

  // Count items by type for the filter pills
  const countByType = CONTENT_TYPES.map((ct) => ({
    ...ct,
    count: allItems.filter((i) => i.contentType === ct.id).length,
  })).filter((ct) => ct.count > 0);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6">

      {/* ── Filter + View bar ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        {/* Content type filter pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTypeFilter(null)}
            style={filterPillStyle(activeTypeFilter === null, "var(--color-accent)")}
          >
            All <span style={{ opacity: 0.7 }}>{allItems.length}</span>
          </button>
          {countByType.map((ct) => (
            <button
              key={ct.id}
              onClick={() => setActiveTypeFilter(activeTypeFilter === ct.id ? null : ct.id)}
              style={filterPillStyle(activeTypeFilter === ct.id, ct.color)}
            >
              {ct.icon} {ct.label} <span style={{ opacity: 0.7 }}>{ct.count}</span>
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {(["board", "grid"] as const).map((v) => (
            <button
              key={v}
              onClick={() => toggleView(v)}
              style={{
                padding: "6px 12px",
                background: view === v ? "var(--color-accent)" : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                color: view === v ? "white" : "var(--color-muted)",
                fontWeight: view === v ? 600 : 400,
                transition: "background 0.12s, color 0.12s",
              }}
            >
              {v === "board" ? "⊞ Board" : "⊟ Grid"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tag filter row (shown when tags exist) ──────────────────────────── */}
      {allTags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Tags:
          </span>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setActiveTagFilter(activeTagFilter === tag.id ? null : tag.id)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 9px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: activeTagFilter === tag.id
                  ? tag.color
                  : `${tag.color}28`,
                color: activeTagFilter === tag.id ? "white" : tag.color,
              }}
            >
              {tag.name}
            </button>
          ))}
          {activeTagFilter && (
            <button
              onClick={() => setActiveTagFilter(null)}
              style={{
                fontSize: 11,
                color: "var(--color-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                textDecoration: "underline",
              }}
            >
              clear
            </button>
          )}
        </div>
      )}

      {/* ── Board or Grid ───────────────────────────────────────────────────── */}
      {view === "board" ? (
        <BoardView
          filteredItems={filteredItems}
          allTags={allTags}
          onItemClick={setDetailItem}
        />
      ) : (
        <GridView
          items={filteredItems}
          allTags={allTags}
          onItemClick={setDetailItem}
        />
      )}

      {/* ── Item Detail Panel ───────────────────────────────────────────────── */}
      <ItemDetailPanel
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}

function filterPillStyle(active: boolean, color: string): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    padding: "4px 11px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: active
      ? `color-mix(in oklch, ${color} 22%, transparent)`
      : "var(--color-surface)",
    color: active ? color : "var(--color-muted)",
    outline: active ? `1px solid color-mix(in oklch, ${color} 45%, transparent)` : "none",
    transition: "background 0.12s, color 0.12s",
  };
}
