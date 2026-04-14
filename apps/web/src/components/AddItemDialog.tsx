import { useState } from "react";
import { CONTENT_TYPES, STATUSES } from "../lib/constants";
import type { ContentTypeId, StatusId } from "../lib/constants";
import { useCreateItem, useIngest } from "../hooks/useItems";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_FORM = {
  title: "",
  contentType: "book" as ContentTypeId,
  status: "suggestions" as StatusId,
  creator: "",
  description: "",
  coverUrl: "",
  releaseDate: "",
  rating: "",
  notes: "",
  sourceUrl: "",
};

export function AddItemDialog({ open, onClose }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [searchType, setSearchType] = useState<ContentTypeId>("book");
  const [mode, setMode] = useState<"url" | "search" | "manual">("url");
  const [form, setForm] = useState(DEFAULT_FORM);

  const { mutate: createItem, isPending: saving, error: saveError } = useCreateItem();
  const { mutate: fetchMeta, isPending: fetching, error: fetchError } = useIngest();

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleFetch() {
    const isUrl = mode === "url";
    fetchMeta(
      isUrl
        ? { url: urlInput.trim() }
        : { query: queryInput.trim(), content_type: searchType },
      {
        onSuccess(meta) {
          setForm({
            title: meta.title ?? "",
            contentType: (meta.contentType as ContentTypeId) ?? searchType,
            status: "suggestions",
            creator: meta.creator ?? "",
            description: meta.description ?? "",
            coverUrl: meta.coverUrl ?? "",
            releaseDate: meta.releaseDate ?? "",
            rating: "",
            notes: "",
            sourceUrl: meta.sourceUrl ?? (isUrl ? urlInput.trim() : ""),
          });
        },
      }
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createItem(
      {
        title: form.title.trim(),
        contentType: form.contentType,
        status: form.status,
        creator: form.creator.trim() || undefined,
        description: form.description.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        releaseDate: form.releaseDate || undefined,
        rating: form.rating ? parseInt(form.rating, 10) : undefined,
        notes: form.notes.trim() || undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  }

  function handleClose() {
    setUrlInput("");
    setQueryInput("");
    setMode("url");
    setForm(DEFAULT_FORM);
    onClose();
  }

  const error = fetchError ?? saveError;
  const formReady = form.title !== "";

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "oklch(0% 0 0 / 0.6)",
          zIndex: 100,
        }}
      />

      {/* Dialog */}
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
          padding: "28px 32px",
          width: "min(560px, calc(100vw - 32px))",
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
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Item</h2>
          <button
            onClick={handleClose}
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

        {/* ── Fetch / Search section ─────────────────────────────────────────── */}
        {mode !== "manual" && (
          <div
            style={{
              background: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              padding: "16px",
              marginBottom: 20,
            }}
          >
            {/* Mode tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {(["url", "search"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: mode === m ? "var(--color-accent)" : "transparent",
                    color: mode === m ? "white" : "var(--color-muted)",
                  }}
                >
                  {m === "url" ? "Paste URL" : "Search by name"}
                </button>
              ))}
            </div>

            {mode === "url" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…  or any URL"
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); if (urlInput.trim()) handleFetch(); }
                  }}
                />
                <button
                  onClick={handleFetch}
                  disabled={!urlInput.trim() || fetching}
                  style={primaryBtnStyle(!urlInput.trim() || fetching)}
                >
                  {fetching ? "Fetching…" : "Fetch"}
                </button>
              </div>
            )}

            {mode === "search" && (
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as ContentTypeId)}
                  style={{ ...inputStyle, flexShrink: 0, width: "auto" }}
                >
                  {CONTENT_TYPES.filter(
                    (t) => t.id !== "article" && t.id !== "tweet" && t.id !== "youtube"
                  ).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
                <input
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Title to search…"
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); if (queryInput.trim()) handleFetch(); }
                  }}
                />
                <button
                  onClick={handleFetch}
                  disabled={!queryInput.trim() || fetching}
                  style={primaryBtnStyle(!queryInput.trim() || fetching)}
                >
                  {fetching ? "…" : "Search"}
                </button>
              </div>
            )}

            {fetchError && (
              <p style={{ fontSize: 12, color: "oklch(65% 0.2 25)", margin: "8px 0 0" }}>
                {(fetchError as Error).message}
              </p>
            )}

            <button
              onClick={() => setMode("manual")}
              style={{
                marginTop: 10,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--color-muted)",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              Skip — fill in manually
            </button>
          </div>
        )}

        {/* ── Form ──────────────────────────────────────────────────────────── */}
        {(formReady || mode === "manual") && (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Pre-populated cover preview */}
            {form.coverUrl && (
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <img
                  src={form.coverUrl}
                  alt="Cover"
                  style={{
                    width: 72,
                    height: 100,
                    objectFit: "cover",
                    borderRadius: 6,
                    flexShrink: 0,
                    border: "1px solid var(--color-border)",
                  }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Field label="Title *">
                    <input required value={form.title} onChange={(e) => setField("title", e.target.value)} style={inputStyle} />
                  </Field>
                </div>
              </div>
            )}

            {!form.coverUrl && (
              <Field label="Title *">
                <input required value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. Dune" style={inputStyle} />
              </Field>
            )}

            {/* Type + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Type *">
                <select value={form.contentType} onChange={(e) => setField("contentType", e.target.value)} style={inputStyle}>
                  {CONTENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => setField("status", e.target.value)} style={inputStyle}>
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Creator */}
            <Field label="Creator">
              <input value={form.creator} onChange={(e) => setField("creator", e.target.value)} placeholder="Author, director, channel…" style={inputStyle} />
            </Field>

            {/* Description */}
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Brief description…" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            {/* Cover URL + Release Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Cover URL">
                <input type="url" value={form.coverUrl} onChange={(e) => setField("coverUrl", e.target.value)} placeholder="https://…" style={inputStyle} />
              </Field>
              <Field label="Release Date">
                <input type="date" value={form.releaseDate} onChange={(e) => setField("releaseDate", e.target.value)} style={inputStyle} />
              </Field>
            </div>

            {/* Rating + Source URL */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Rating (1–5)">
                <select value={form.rating} onChange={(e) => setField("rating", e.target.value)} style={inputStyle}>
                  <option value="">No rating</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{"★".repeat(n)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Source URL">
                <input type="url" value={form.sourceUrl} onChange={(e) => setField("sourceUrl", e.target.value)} placeholder="https://…" style={inputStyle} />
              </Field>
            </div>

            {/* Notes */}
            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Private notes…" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            {saveError && (
              <p style={{ fontSize: 13, color: "oklch(65% 0.2 25)", margin: 0 }}>
                {(saveError as Error).message}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
              <button type="button" onClick={handleClose} style={secondaryBtnStyle}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={primaryBtnStyle(saving)}>
                {saving ? "Adding…" : "Add Item"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--color-background)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--color-foreground)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-foreground)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "8px 18px",
  borderRadius: 8,
  border: "none",
  background: disabled ? "var(--color-muted)" : "var(--color-accent)",
  color: "white",
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
});
