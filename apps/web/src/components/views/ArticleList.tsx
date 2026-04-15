import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";

interface ArticleListProps {
  items: Item[];
}

function getFavicon(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    return `https://www.google.com/s2/favicons?sz=16&domain=${url.hostname}`;
  } catch {
    return null;
  }
}

function getDomain(sourceUrl: string | null): string {
  if (!sourceUrl) return "";
  try {
    return new URL(sourceUrl).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

export function ArticleList({ items }: ArticleListProps) {
  if (items.length === 0) {
    return <EmptyState message="No articles yet." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((item, idx) => {
        const favicon = getFavicon(item.sourceUrl);
        const domain = getDomain(item.sourceUrl);
        const readingTime = item.durationMins ? `${item.durationMins} min read` : null;

        return (
          <Link key={item.id} to="/item/$id" params={{ id: item.id }} style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: idx < items.length - 1 ? "1px solid var(--color-border)" : "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.paddingLeft = "8px")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.paddingLeft = "0")}
            >
              {/* Domain favicon pill */}
              {domain && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    fontSize: 11,
                    color: "var(--color-muted)",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    minWidth: 80,
                  }}
                >
                  {favicon && <img src={favicon} alt="" style={{ width: 12, height: 12 }} />}
                  {domain}
                </div>
              )}

              {/* Title */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title}
                </div>
                {item.creator && (
                  <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 1 }}>
                    {item.creator}
                  </div>
                )}
              </div>

              {/* Reading time + date */}
              <div style={{ fontSize: 11, color: "var(--color-muted)", flexShrink: 0, textAlign: "right", lineHeight: 1.6 }}>
                {readingTime && <div>{readingTime}</div>}
                <div>{new Date(item.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div style={{ fontSize: 13, color: "var(--color-muted)", padding: "20px 0" }}>{message}</div>;
}
