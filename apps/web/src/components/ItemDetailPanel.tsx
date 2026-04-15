import { useEffect, useState } from "react";

import type { Item } from "../lib/api";
import { CONTENT_TYPES, STATUSES } from "../lib/constants";
import type { StatusId } from "../lib/constants";
import {
  TAG_COLORS,
  useAddTagToItem,
  useCreateTag,
  useItemTags,
  useRemoveTagFromItem,
  useTags,
} from "../hooks/useTags";
import { useCategorizeItem } from "../hooks/useAI";
import { useUpdateItem } from "../hooks/useItems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  item: Item | null;
  onClose: () => void;
}

export function ItemDetailPanel({ item, onClose }: Props) {
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]?.value ?? "#6366f1");
  const [aiTagSuggestions, setAiTagSuggestions] = useState<string[] | null>(null);

  const { mutate: updateItem } = useUpdateItem();
  const { data: allTags = [] } = useTags();
  const { data: itemTags = [] } = useItemTags(item?.id ?? null);
  const { mutate: addTag } = useAddTagToItem(item?.id ?? "");
  const { mutate: removeTag } = useRemoveTagFromItem(item?.id ?? "");
  const { mutate: createTag, isPending: creatingTag } = useCreateTag();
  const { mutate: categorize, isPending: suggestingTags } = useCategorizeItem();

  useEffect(() => {
    setNotes(item?.notes ?? "");
    setAiTagSuggestions(null);
    setNewTagName("");
  }, [item?.id]);

  if (!item) return null;

  const currentItem = item;
  const contentType = CONTENT_TYPES.find((t) => t.id === currentItem.contentType);

  function saveNotes() {
    if (notes !== (currentItem.notes ?? "")) {
      updateItem({ id: currentItem.id, notes: notes || null });
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
    categorize(
      {
        title: currentItem.title,
        description: currentItem.description,
        sourceUrl: currentItem.sourceUrl,
        contentType: currentItem.contentType,
      },
      {
        onSuccess(result) {
          const existing = new Set(itemTags.map((t) => t.name.toLowerCase()));
          const fresh = result.suggested_tags.filter((name) => !existing.has(name.toLowerCase()));
          setAiTagSuggestions(fresh.length > 0 ? fresh : []);
        },
      }
    );
  }

  function handleApplySuggestedTag(name: string) {
    const existing = allTags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      addTag(existing.id);
    } else {
      createTag(
        {
          name,
          color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]?.value ?? "#6366f1",
        },
        { onSuccess: (tag) => addTag(tag.id) }
      );
    }
    setAiTagSuggestions((prev) => prev?.filter((tag) => tag !== name) ?? null);
  }

  return (
    <Sheet open={!!item} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto border-l-2 border-[hsl(var(--border-strong))] bg-card px-0">
        <SheetHeader className="border-b-2 border-[hsl(var(--border-strong))] px-6 py-5">
          <SheetTitle className="font-display text-3xl">{currentItem.title}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-6 py-6">
          <div className="flex gap-4">
            <div className="flex h-40 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border-2 border-[hsl(var(--border-strong))] bg-secondary">
              {currentItem.coverUrl ? (
                <img src={currentItem.coverUrl} alt={currentItem.title} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-4xl">{contentType?.icon ?? "📄"}</span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {contentType ? <Badge variant="outline">{contentType.label}</Badge> : null}
                {currentItem.releaseDate ? <Badge variant="secondary">{currentItem.releaseDate.slice(0, 4)}</Badge> : null}
              </div>
              {currentItem.creator ? <p className="text-sm text-muted-foreground">{currentItem.creator}</p> : null}
              {currentItem.description ? <p className="text-sm leading-6 text-muted-foreground">{currentItem.description}</p> : null}
              {currentItem.sourceUrl ? (
                <a href={currentItem.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">
                  Open original source
                </a>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={currentItem.status} onValueChange={(value) => updateItem({ id: currentItem.id, status: value as StatusId })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {STATUSES.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button key={n} type="button" variant={(currentItem.rating ?? 0) >= n ? "secondary" : "outline"} onClick={() => updateItem({ id: currentItem.id, rating: currentItem.rating === n ? null : n })}>
                    {n}★
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {itemTags.map((tag) => (
                  <Badge key={tag.id} variant="outline" className="gap-2 pr-1" style={{ color: tag.color }}>
                    {tag.name}
                    <button onClick={() => removeTag(tag.id)} className="rounded-full border border-current px-1 text-[10px]">
                      ×
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag name" />
                <Select value={newTagColor} onValueChange={setNewTagColor}>
                  <SelectTrigger className="md:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TAG_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleCreateTag} disabled={creatingTag}>
                  Add tag
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={handleSuggestTags} disabled={suggestingTags}>
                  {suggestingTags ? "Thinking…" : "Suggest tags"}
                </Button>
                {aiTagSuggestions?.map((tag) => (
                  <Button key={tag} type="button" variant="secondary" onClick={() => handleApplySuggestedTag(tag)}>
                    + {tag}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Label htmlFor="detail-notes">Private notes</Label>
              <Textarea
                id="detail-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Private notes for this item…"
              />
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
