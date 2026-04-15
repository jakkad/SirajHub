import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useItems, useUpdateItem, useDeleteItem } from "../hooks/useItems";
import { CONTENT_TYPES, STATUSES } from "../lib/constants";
import type { StatusId } from "../lib/constants";
import { AIPanel } from "../components/AIPanel";
import { InlineTagManager } from "../components/InlineTagManager";

export const Route = createFileRoute("/item/$id")({
  component: ItemDetailPage,
});

function ItemDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: allItems = [], isLoading } = useItems();
  const { mutate: updateItem } = useUpdateItem();
  const { mutate: deleteItem, isPending: deleting } = useDeleteItem();

  const item = allItems.find((i) => i.id === id);

  // Editable field state
  const [notes, setNotes] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<string[] | null>(null);

  useEffect(() => {
    if (item) setNotes(item.notes ?? "");
  }, [item?.id]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-24" style={{ color: "var(--color-muted)" }}>Loading…</div>;
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color: "var(--color-muted)" }}>
        <div style={{ fontSize: 15 }}>Item not found.</div>
        <button onClick={() => navigate({ to: "/" })} style={backBtnStyle}>← Back to dashboard</button>
      </div>
    );
  }

  const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);

  function saveNotes() {
    const current = notes;
    if (current !== (item?.notes ?? "")) {
      updateItem({ id: item!.id, notes: current || null });
    }
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    deleteItem(item.id, { onSuccess: () => navigate({ to: "/" }) });
  }

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8">
      {/* Back nav */}
      <button
        onClick={() => window.history.back()}
        style={backBtnStyle}
      >
        ← Back
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 32, marginTop: 24 }}>
        {/* ── Left column: cover + core metadata ──────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Cover */}
          <div
            style={{
              width: "100%",
              aspectRatio: item.contentType === "book" ? "2/3" : item.contentType === "article" || item.contentType === "tweet" ? "16/9" : "2/3",
              borderRadius: 12,
              overflow: "hidden",
              background: ct ? `color-mix(in oklch, ${ct.color} 20%, var(--color-surface))` : "var(--color-surface)",
              border: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.coverUrl ? (
              <img
                src={item.coverUrl}
                alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <span style={{ fontSize: 52 }}>{ct?.icon ?? "📄"}</span>
            )}
          </div>

          {/* Type badge */}
          {ct && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: `color-mix(in oklch, ${ct.color} 18%, transparent)`,
                  color: ct.color,
                }}
              >
                {ct.icon} {ct.label}
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", lineHeight: 1.3 }}>
              {item.title}
            </h1>
            {item.subtitle && (
              <p style={{ margin: "0 0 4px", fontSize: 14, color: "var(--color-muted)", fontStyle: "italic" }}>
                {item.subtitle}
              </p>
            )}
            {item.creator && (
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-muted)" }}>
                {item.creator}
              </p>
            )}
          </div>

          {/* Meta details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--color-muted)" }}>
            {item.releaseDate && <div>Released: {item.releaseDate.slice(0, 4)}</div>}
            {item.durationMins && <div>Duration: {item.durationMins} min</div>}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-accent)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                ↗ {item.sourceUrl}
              </a>
            )}
          </div>

          {/* Status select */}
          <div>
            <FieldLabel>Status</FieldLabel>
            <select
              value={item.status}
              onChange={(e) => updateItem({ id: item.id, status: e.target.value as StatusId })}
              style={selectStyle}
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Star rating */}
          <div>
            <FieldLabel>Rating</FieldLabel>
            <div style={{ display: "flex", gap: 3 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => updateItem({ id: item.id, rating: item.rating === n ? null : n })}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 24,
                    padding: "2px",
                    color: (item.rating ?? 0) >= n ? "oklch(80% 0.18 80)" : "var(--color-border)",
                    lineHeight: 1,
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div style={{ fontSize: 11, color: "var(--color-muted)", lineHeight: 1.9 }}>
            <div>Added {new Date(item.createdAt).toLocaleDateString()}</div>
            {item.startedAt && <div>Started {new Date(item.startedAt).toLocaleDateString()}</div>}
            {item.finishedAt && <div>Finished {new Date(item.finishedAt).toLocaleDateString()}</div>}
          </div>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid oklch(35% 0.1 25)",
              background: "transparent",
              color: "oklch(65% 0.2 25)",
              fontSize: 12,
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? "Deleting…" : "Delete item"}
          </button>
        </div>

        {/* ── Right column: edit + AI + tags + notes ───────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Description */}
          {item.description && (
            <Card title="Description">
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-muted)", lineHeight: 1.7 }}>
                {item.description}
              </p>
            </Card>
          )}

          {/* Tags */}
          <Card title="Tags">
            <InlineTagManager
              itemId={item.id}
              suggestedTags={suggestedTags}
              onSuggestionsApplied={() => setSuggestedTags(null)}
            />
          </Card>

          {/* Notes */}
          <Card title="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Private notes… (auto-saved on blur)"
              rows={5}
              style={{
                width: "100%",
                background: "var(--color-background)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "var(--color-foreground)",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
                lineHeight: 1.6,
              }}
            />
          </Card>

          {/* AI Panel */}
          <Card title="AI Analysis">
            <AIPanel
              item={item}
              onSuggestTags={(tags) => setSuggestedTags(tags)}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: "16px 20px",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", marginBottom: 12, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  color: "var(--color-muted)",
  padding: "4px 0",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const selectStyle: React.CSSProperties = {
  background: "var(--color-background)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--color-foreground)",
  outline: "none",
  width: "100%",
  cursor: "pointer",
};
