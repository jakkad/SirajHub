import { useNextList, useRefreshNextList } from "../../hooks/useAI";
import { useItems } from "../../hooks/useItems";
import { CONTENT_TYPES } from "../../lib/constants";
import { Link } from "@tanstack/react-router";

export function NextToConsume() {
  const { data: aiData, isLoading, isFetched } = useNextList();
  const { data: allItems = [] } = useItems();
  const { mutate: refresh, isPending: refreshing } = useRefreshNextList();

  const ranked = aiData?.result ?? [];
  const itemMap = Object.fromEntries(allItems.map((i) => [i.id, i]));

  function handleLoad() {
    refresh();
  }

  return (
    <div>
      {!isFetched && !isLoading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0 }}>
            AI-ranked list of your Suggestions.
          </p>
          <button
            onClick={handleLoad}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-foreground)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Load ranking
          </button>
        </div>
      )}

      {(isLoading || refreshing) && (
        <div style={{ fontSize: 12, color: "var(--color-muted)" }}>Ranking…</div>
      )}

      {isFetched && !isLoading && ranked.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--color-muted)" }}>No suggestions to rank yet.</div>
      )}

      {ranked.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ranked.slice(0, 5).map((r, idx) => {
              const item = itemMap[r.id];
              if (!item) return null;
              const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);
              return (
                <Link key={r.id} to="/item/$id" params={{ id: r.id }} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      cursor: "pointer",
                      transition: "border-color 0.12s",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-accent)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)")}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", minWidth: 16, marginTop: 2 }}>
                      {idx + 1}
                    </span>
                    {item.coverUrl && (
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
                      />
                    )}
                    {!item.coverUrl && ct && (
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{ct.icon}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.reason}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <button
            onClick={() => refresh()}
            disabled={refreshing}
            style={{
              marginTop: 8,
              padding: "5px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-muted)",
              fontSize: 11,
              cursor: refreshing ? "not-allowed" : "pointer",
            }}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </>
      )}
    </div>
  );
}
