import { useState } from "react";
import { useTags, useItemTags, useAddTagToItem, useRemoveTagFromItem, useCreateTag, TAG_COLORS } from "../hooks/useTags";

interface InlineTagManagerProps {
  itemId: string;
  suggestedTags?: string[] | null;
  onSuggestionsApplied?: () => void;
}

export function InlineTagManager({ itemId, suggestedTags, onSuggestionsApplied }: InlineTagManagerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]?.value ?? "#6366f1");

  const { data: allTags = [] } = useTags();
  const { data: itemTags = [] } = useItemTags(itemId);
  const { mutate: addTag } = useAddTagToItem(itemId);
  const { mutate: removeTag } = useRemoveTagFromItem(itemId);
  const { mutate: createTag, isPending: creatingTag } = useCreateTag();

  const itemTagIds = new Set(itemTags.map((t) => t.id));

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

  function handleApplySuggested(name: string) {
    const match = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (match) {
      addTag(match.id);
    } else {
      createTag(
        { name, color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]?.value ?? "#6366f1" },
        { onSuccess: (tag) => addTag(tag.id) }
      );
    }
    if (onSuggestionsApplied) onSuggestionsApplied();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Applied tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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
              style={{ background: "transparent", border: "none", cursor: "pointer", color: tag.color, fontSize: 14, lineHeight: 1, padding: 0, opacity: 0.7 }}
            >
              ×
            </button>
          </span>
        ))}
        <button
          onClick={() => setPickerOpen((o) => !o)}
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
      </div>

      {/* AI-suggested tags */}
      {suggestedTags && suggestedTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--color-muted)", marginRight: 2 }}>AI suggests:</span>
          {suggestedTags
            .filter((name) => !itemTags.some((t) => t.name.toLowerCase() === name.toLowerCase()))
            .map((name) => (
              <button
                key={name}
                onClick={() => handleApplySuggested(name)}
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
      )}

      {/* Tag picker */}
      {pickerOpen && (
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
  );
}
