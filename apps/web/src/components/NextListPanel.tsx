import { useState } from "react";
import { useItems } from "../hooks/useItems";
import { useNextList, useRefreshNextList } from "../hooks/useAI";
import { useQueryClient } from "@tanstack/react-query";

export function NextListPanel() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: items = [] } = useItems();
  const suggestionsCount = items.filter((i) => i.status === "suggestions").length;

  const { data, isFetching, error, refetch } = useNextList();
  const { mutate: refresh, isPending: refreshing } = useRefreshNextList();

  const ranked = data?.result ?? [];

  // Map item id → item for display
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));

  function handleOpen() {
    setOpen(true);
    if (!data) refetch();
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px",
          borderRadius: 8,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-foreground)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)")
        }
      >
        <span>✨</span>
        <span>Next to Consume</span>
        {suggestionsCount > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 999,
              background: "color-mix(in oklch, var(--color-accent) 18%, transparent)",
              color: "var(--color-accent)",
            }}
          >
            {suggestionsCount}
          </span>
        )}
      </button>

      {/* Panel modal */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "oklch(0% 0 0 / 0.55)",
              zIndex: 100,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 101,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "24px 28px",
              width: "min(520px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 64px)",
              overflowY: "auto",
              boxShadow: "0 16px 48px oklch(0% 0 0 / 0.5)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                  ✨ Next to Consume
                </h2>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--color-muted)" }}>
                  AI-ranked from your {suggestionsCount} suggestions
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => refresh()}
                  disabled={refreshing || isFetching}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--color-border)",
                    background: "transparent",
                    color: "var(--color-muted)",
                    fontSize: 12,
                    cursor: refreshing || isFetching ? "not-allowed" : "pointer",
                  }}
                >
                  {refreshing || isFetching ? "Ranking…" : "Refresh"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-muted)",
                    fontSize: 20,
                    lineHeight: 1,
                    padding: "2px 6px",
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            {(isFetching || refreshing) && ranked.length === 0 && (
              <div style={{ padding: "32px 0", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
                  Asking AI to rank your suggestions…
                </p>
              </div>
            )}

            {error && (
              <p style={{ fontSize: 13, color: "oklch(65% 0.2 25)" }}>
                {(error as Error).message}
              </p>
            )}

            {suggestionsCount === 0 && !isFetching && (
              <p style={{ fontSize: 13, color: "var(--color-muted)", textAlign: "center", padding: "24px 0" }}>
                No items in Suggestions yet. Add some to get AI recommendations.
              </p>
            )}

            {ranked.length > 0 && (
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {[...ranked]
                  .sort((a, b) => a.rank - b.rank)
                  .map((entry) => {
                    const item = itemById[entry.id];
                    if (!item) return null;
                    return (
                      <li
                        key={entry.id}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-background)",
                        }}
                      >
                        {/* Rank number */}
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: entry.rank <= 3 ? "var(--color-accent)" : "var(--color-muted)",
                            minWidth: 22,
                            paddingTop: 1,
                          }}
                        >
                          #{entry.rank}
                        </span>

                        {/* Cover thumbnail */}
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            style={{
                              width: 36,
                              height: 50,
                              objectFit: "cover",
                              borderRadius: 4,
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 50,
                              borderRadius: 4,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 18,
                              background: "var(--color-surface-hover)",
                            }}
                          >
                            {/* icon from content type */}
                          </div>
                        )}

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
                            {item.title}
                          </div>
                          {item.creator && (
                            <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 4 }}>
                              {item.creator}
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: "var(--color-muted)", lineHeight: 1.4, fontStyle: "italic" }}>
                            {entry.reason}
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ol>
            )}

            {data?.cached && (
              <p style={{ fontSize: 11, color: "var(--color-muted)", textAlign: "right", marginTop: 12 }}>
                Cached result · hit Refresh for a fresh ranking
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
