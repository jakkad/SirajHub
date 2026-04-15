import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useItems, useUpdateItem, useDeleteItem } from "../hooks/useItems";
import { CONTENT_TYPES, STATUSES } from "../lib/constants";
import type { StatusId } from "../lib/constants";
import { AIPanel } from "../components/AIPanel";
import { InlineTagManager } from "../components/InlineTagManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
    return <div className="py-24 text-center text-muted-foreground">Loading…</div>;
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
        <div className="text-base">Item not found.</div>
        <Button onClick={() => navigate({ to: "/" })} variant="outline">Back to dashboard</Button>
      </div>
    );
  }

  const currentItem = item;
  const ct = CONTENT_TYPES.find((c) => c.id === currentItem.contentType);

  function saveNotes() {
    const current = notes;
    if (current !== (currentItem.notes ?? "")) {
      updateItem({ id: currentItem.id, notes: current || null });
    }
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${currentItem.title}"? This cannot be undone.`)) return;
    deleteItem(currentItem.id, { onSuccess: () => navigate({ to: "/" }) });
  }

  return (
    <div className="flex flex-col gap-6">
      <Button onClick={() => window.history.back()} variant="outline" className="w-fit">
        Back
      </Button>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="flex flex-col gap-5 p-5">
            <div className="flex aspect-[2/3] items-center justify-center overflow-hidden rounded-[28px] border-2 border-[hsl(var(--border-strong))] bg-secondary">
              {currentItem.coverUrl ? (
                <img src={currentItem.coverUrl} alt={currentItem.title} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-6xl">{ct?.icon ?? "📄"}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {ct ? <Badge variant="outline">{ct.label}</Badge> : null}
              {currentItem.releaseDate ? <Badge variant="secondary">{currentItem.releaseDate.slice(0, 4)}</Badge> : null}
            </div>

            <div>
              <h1 className="font-display text-5xl leading-none">{currentItem.title}</h1>
              {currentItem.subtitle ? <p className="mt-2 text-sm italic text-muted-foreground">{currentItem.subtitle}</p> : null}
              {currentItem.creator ? <p className="mt-2 text-sm text-muted-foreground">{currentItem.creator}</p> : null}
            </div>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {currentItem.releaseDate ? <div>Released: {currentItem.releaseDate.slice(0, 4)}</div> : null}
              {currentItem.durationMins ? <div>Duration: {currentItem.durationMins} min</div> : null}
              {currentItem.sourceUrl ? (
                <a href={currentItem.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                  Open source
                </a>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Status</Label>
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
            </div>

            <div className="flex flex-col gap-2">
              <Label>Rating</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button key={n} variant={(currentItem.rating ?? 0) >= n ? "secondary" : "outline"} onClick={() => updateItem({ id: currentItem.id, rating: currentItem.rating === n ? null : n })}>
                    {n}★
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-xs leading-6 text-muted-foreground">
              <div>Added {new Date(currentItem.createdAt).toLocaleDateString()}</div>
              {currentItem.startedAt ? <div>Started {new Date(currentItem.startedAt).toLocaleDateString()}</div> : null}
              {currentItem.finishedAt ? <div>Finished {new Date(currentItem.finishedAt).toLocaleDateString()}</div> : null}
            </div>

            <Button onClick={handleDelete} disabled={deleting} variant="outline">
              {deleting ? "Deleting…" : "Delete item"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {item.description ? (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-muted-foreground">{item.description}</CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <InlineTagManager itemId={item.id} suggestedTags={suggestedTags} onSuggestionsApplied={() => setSuggestedTags(null)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Private notes…" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <AIPanel item={item} onSuggestTags={(tags) => setSuggestedTags(tags)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
