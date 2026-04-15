import { useState } from "react";
import { useTags, useItemTags, useAddTagToItem, useRemoveTagFromItem, useCreateTag, TAG_COLORS } from "../hooks/useTags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {itemTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.05em]"
            style={{ background: `${tag.color}24`, color: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => removeTag(tag.id)}
              className="p-0 text-[14px] leading-none opacity-70"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: tag.color }}
            >
              ×
            </button>
          </span>
        ))}
        <Button onClick={() => setPickerOpen((o) => !o)} variant="outline" size="sm">
          + Add tag
        </Button>
      </div>

      {suggestedTags && suggestedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">AI suggests:</span>
          {suggestedTags
            .filter((name) => !itemTags.some((t) => t.name.toLowerCase() === name.toLowerCase()))
            .map((name) => (
              <Button key={name} onClick={() => handleApplySuggested(name)} variant="secondary" size="sm">
                + {name}
              </Button>
            ))}
        </div>
      )}

      {pickerOpen && (
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
          {allTags.filter((t) => !itemTagIds.has(t.id)).length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {allTags
                .filter((t) => !itemTagIds.has(t.id))
                .map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => addTag(tag.id)}
                    className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.05em]"
                    style={{ border: "none", background: `${tag.color}24`, color: tag.color, cursor: "pointer" }}
                  >
                    {tag.name}
                  </button>
                ))}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag(); }}
              placeholder="New tag name…"
              className="flex-1"
            />
            <div className="flex gap-2">
              {TAG_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewTagColor(c.value)}
                  className="size-5 rounded-full"
                  style={{ background: c.value, border: newTagColor === c.value ? "2px solid hsl(var(--foreground))" : "2px solid transparent", cursor: "pointer", padding: 0 }}
                />
              ))}
            </div>
            <Button onClick={handleCreateTag} disabled={!newTagName.trim() || creatingTag} size="sm">
              Create
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
