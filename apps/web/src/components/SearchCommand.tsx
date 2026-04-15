import { useState, useEffect, useRef } from "react";
import { useItems } from "../hooks/useItems";
import { CONTENT_TYPES } from "../lib/constants";
import type { Item } from "../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (item: Item) => void;
}

export function SearchCommand({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: allItems = [] } = useItems();

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();

  // Client-side filter over the already-cached items list — instant, no API call
  const results = q.length < 1
    ? []
    : allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.creator ?? "").toLowerCase().includes(q) ||
          (item.description ?? "").toLowerCase().includes(q)
      ).slice(0, 20);

  // Group by content type for nicer display
  const grouped: Record<string, Item[]> = {};
  for (const item of results) {
    if (!grouped[item.contentType]) grouped[item.contentType] = [];
    grouped[item.contentType]!.push(item);
  }

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "oklch(0% 0 0 / 0.6)", zIndex: 200 }}
      />
      <div
        style={{
          position: "fixed",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 201,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          width: "min(580px, calc(100vw - 32px))",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px oklch(0% 0 0 / 0.6)",
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <span style={{ fontSize: 16, color: "var(--color-muted)", flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, creators, descriptions…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              color: "var(--color-foreground)",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-muted)",
                fontSize: 18,
                lineHeight: 1,
                padding: "0 2px",
              }}
            >
              ×
            </button>
          )}
          <kbd
            style={{
              fontSize: 11,
              color: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: 4,
              padding: "2px 6px",
              flexShrink: 0,
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {q.length === 0 && (
            <p style={{ padding: "24px 16px", fontSize: 13, color: "var(--color-muted)", margin: 0, textAlign: "center" }}>
              Start typing to search your {allItems.length} items
            </p>
          )}

          {q.length > 0 && results.length === 0 && (
            <p style={{ padding: "24px 16px", fontSize: 13, color: "var(--color-muted)", margin: 0, textAlign: "center" }}>
              No results for "{query}"
            </p>
          )}

          {Object.entries(grouped).map(([type, typeItems]) => {
            const ct = CONTENT_TYPES.find((t) => t.id === type);
            return (
              <div key={type}>
                <div
                  style={{
                    padding: "6px 16px 4px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: ct?.color ?? "var(--color-muted)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {ct?.icon} {ct?.label}
                </div>
                {typeItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { onSelect(item); onClose(); }}
                    style={{
                      display: "flex",
                      width: "100%",
                      gap: 12,
                      alignItems: "center",
                      padding: "8px 16px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "var(--color-foreground)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--color-surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt=""
                        style={{ width: 28, height: 38, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
                      />
                    ) : (
                      <span style={{ width: 28, textAlign: "center", fontSize: 20, flexShrink: 0 }}>
                        {ct?.icon}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </div>
                      {item.creator && (
                        <div style={{ fontSize: 11, color: "var(--color-muted)" }}>
                          {item.creator}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 999,
                        background: "var(--color-surface-hover)",
                        color: "var(--color-muted)",
                        flexShrink: 0,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {results.length > 0 && (
          <div
            style={{
              padding: "8px 16px",
              fontSize: 11,
              color: "var(--color-muted)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            {results.length} result{results.length !== 1 ? "s" : ""} · click to open
          </div>
        )}
      </div>
    </>
  );
}
