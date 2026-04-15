import { useState, useEffect, useRef } from "react";
import type { Item } from "../lib/api";
import { CONTENT_TYPES, STATUSES } from "../lib/constants";
import type { StatusId } from "../lib/constants";
import { useUpdateItem } from "../hooks/useItems";
import { useTags, useItemTags, useAddTagToItem, useRemoveTagFromItem, useCreateTag, TAG_COLORS } from "../hooks/useTags";
import type { Tag } from "../hooks/useTags";
import { useCategorizeItem } from "../hooks/useAI";

interface Props {
  item: Item | null;
  onClose: () => void;
}

export function ItemDetailPanel({ item, onClose }: Props) {
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]?.value ?? "#6366f1");
  const [aiTagSuggestions, setAiTagSuggestions] = useState<string[] | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: updateItem } = useUpdateItem();
  const { data: allTags = [] } = useTags();
  const { data: itemTags = [] } = useItemTags(item?.id ?? null);
  const { mutate: addTag } = useAddTagToItem(item?.id ?? "");
  const { mutate: removeTag } = useRemoveTagFromItem(item?.id ?? "");
  const { mutate: createTag, isPending: creatingTag } = useCreateTag();
  const { mutate: categorize, isPending: suggestingTags } = useCategorizeItem();

  // Sync notes when item changes
  useEffect(() => {
    setNotes(item?.notes ?? "");
    setTagPickerOpen(false);
    setAiTagSuggestions(null);
  }, [item?.id]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;

  const contentType = CONTENT_TYPES.find((t) => t.id === item.contentType);
  const itemTagIds = new Set(itemTags.map((t) => t.id));

  function saveNotes() {
    if (notes !== (item?.notes ?? "")) {
      updateItem({ id: item!.id, notes: notes || null });
    }
  }

  function handleCreateTag() {
    if (!newTagName.trim()) return;
    createTag(
      { name: newTagName.trim(), color: newTagColor },
      {
        onSuccess(tag) {
          addTag(tag.id);
          setNewTagName("");
        },
      }
    );
  }

  function handleSuggestTags() {
    if (!item) return;
    setAiTagSuggestions(null);
    categorize(
      {
        title: item.title,
        description: item.description,
        sourceUrl: item.sourceUrl,
        contentType: item.contentType,
      },
      {
        onSuccess(result) {
          // Filter out tags already applied to this item (case-insensitive)
          const existing = new Set(itemTags.map((t) => t.name.toLowerCase()));
          const fresh = result.suggested_tags.filter((s) => !existing.has(s.toLowerCase()));
          setAiTagSuggestions(fresh.length > 0 ? fresh : []);
        },
      }
    );
  }

  function handleApplySuggestedTag(name: string) {
    // If a tag with this name already exists, add it; otherwise create + add
    const match = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (match) {
      addTag(match.id);
    } else {
      createTag(
        { name, color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]?.value ?? "#6366f1" },
        { onSuccess: (tag) => addTag(tag.id) }
      );
    }
    // Remove from suggestions list
    setAiTagSuggestions((prev) => prev?.filter((s) => s !== name) ?? null);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "oklch(0% 0 0 / 0.4)",
          zIndex: 150,
        }}
      />

      {/* Slide-over panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          zIndex: 151,
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px oklch(0% 0 0 / 0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {contentType && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: `color-mix(in oklch, ${contentType.color} 18%, transparent)`,
                  color: contentType.color,
                }}
              >
                {contentType.icon} {contentType.label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-muted)",
              fontSize: 22,
              lineHeight: 1,
              padding: "2px 6px",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>

          {/* Cover + Title */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {item.coverUrl ? (
              <img
                src={item.coverUrl}
                alt={item.title}
                style={{
                  width: 80,
                  height: 110,
                  objectFit: "cover",
                  borderRadius: 8,
                  flexShrink: 0,
                  border: "1px solid var(--color-border)",
                }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 110,
                  borderRadius: 8,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  background: "var(--color-surface-hover)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {contentType?.icon}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>
                {item.title}
              </h2>
              {item.creator && (
                <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-muted)" }}>
                  {item.creator}
                </p>
              )}
              {item.releaseDate && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--color-muted)" }}>
                  {item.releaseDate.slice(0, 4)}
                  {item.durationMins ? ` · ${item.durationMins} min` : ""}
                </p>
              )}
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11,
                    color: "var(--color-accent)",
                    textDecoration: "none",
                    display: "block",
                    marginTop: 6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  ↗ {item.sourceUrl}
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <Label>Description</Label>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-muted)", lineHeight: 1.6 }}>
                {item.description}
              </p>
            </div>
          )}

          <Divider />

          {/* Status */}
          <div>
            <Label>Status</Label>
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

          {/* Rating */}
          <div>
            <Label>Rating</Label>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => updateItem({ id: item.id, rating: item.rating === n ? null : n })}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 22,
                    padding: "2px",
                    color: (item.rating ?? 0) >= n ? "oklch(80% 0.18 80)" : "var(--color-border)",
                    lineHeight: 1,
                  }}
                >
                  ★
                </button>
              ))}
              {item.rating && (
                <button
                  onClick={() => updateItem({ id: item.id, rating: null })}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "var(--color-muted)",
                    marginLeft: 4,
                    padding: "2px 4px",
                  }}
                >
                  clear
                </button>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {itemTags.map((tag) => (
                <span
                  key={tag.id}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: `${tag.color}28`,
                    color: tag.color,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {tag.name}
                  <button
                    onClick={() => removeTag(tag.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: tag.color,
                      fontSize: 14,
                      lineHeight: 1,
                      padding: 0,
                      opacity: 0.7,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => setTagPickerOpen((o) => !o)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px dashed var(--color-border)",
                  background: "transparent",
                  color: "var(--color-muted)",
                  cursor: "pointer",
                }}
              >
                + Add tag
              </button>
              <button
                onClick={handleSuggestTags}
                disabled={suggestingTags}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px dashed var(--color-accent)",
                  background: "transparent",
                  color: "var(--color-accent)",
                  cursor: suggestingTags ? "not-allowed" : "pointer",
                  opacity: suggestingTags ? 0.6 : 1,
                }}
              >
                {suggestingTags ? "…" : "✨ Suggest"}
              </button>
            </div>

            {/* AI-suggested tags */}
            {aiTagSuggestions !== null && (
              <div style={{ marginBottom: 8 }}>
                {aiTagSuggestions.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--color-muted)", marginRight: 2 }}>AI suggests:</span>
                    {aiTagSuggestions.map((name) => (
                      <button
                        key={name}
                        onClick={() => handleApplySuggestedTag(name)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 9px",
                          borderRadius: 999,
                          border: "1px solid var(--color-accent)",
                          background: "transparent",
                          color: "var(--color-accent)",
                          cursor: "pointer",
                        }}
                      >
                        + {name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: "var(--color-muted)", margin: 0 }}>No tag suggestions</p>
                )}
              </div>
            )}

            {tagPickerOpen && (
              <div
                style={{
                  background: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {/* Existing tags to pick from */}
                {allTags.filter((t) => !itemTagIds.has(t.id)).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {allTags
                      .filter((t) => !itemTagIds.has(t.id))
                      .map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => addTag(tag.id)}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 9px",
                            borderRadius: 999,
                            border: "none",
                            background: `${tag.color}28`,
                            color: tag.color,
                            cursor: "pointer",
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                  </div>
                )}

                {/* Create new tag */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag(); }}
                    placeholder="New tag name…"
                    style={{
                      flex: 1,
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 6,
                      padding: "5px 9px",
                      fontSize: 12,
                      color: "var(--color-foreground)",
                      outline: "none",
                    }}
                  />
                  {/* Color picker */}
                  <div style={{ display: "flex", gap: 3 }}>
                    {TAG_COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setNewTagColor(c.value)}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: c.value,
                          border: newTagColor === c.value ? "2px solid white" : "2px solid transparent",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || creatingTag}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: "var(--color-accent)",
                      color: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: !newTagName.trim() || creatingTag ? "not-allowed" : "pointer",
                      opacity: !newTagName.trim() || creatingTag ? 0.5 : 1,
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>

          <Divider />

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Private notes… (auto-saved)"
              rows={4}
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
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-muted)" }}>
              Auto-saved when you click away
            </p>
          </div>

          {/* Timestamps */}
          <div style={{ fontSize: 11, color: "var(--color-muted)", paddingBottom: 8, lineHeight: 1.8 }}>
            Added {new Date(item.createdAt).toLocaleDateString()}
            {item.updatedAt !== item.createdAt && (
              <> · Updated {new Date(item.updatedAt).toLocaleDateString()}</>
            )}
            {item.startedAt && (
              <> · Started {new Date(item.startedAt).toLocaleDateString()}</>
            )}
            {item.finishedAt && (
              <> · Finished {new Date(item.finishedAt).toLocaleDateString()}</>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--color-border)" }} />;
}

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
