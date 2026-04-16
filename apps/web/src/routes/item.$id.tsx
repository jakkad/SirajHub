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
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    creator: "",
    description: "",
    releaseDate: "",
    coverUrl: "",
    contentType: "book" as typeof CONTENT_TYPES[number]["id"],
  });

  useEffect(() => {
    if (item) setNotes(item.notes ?? "");
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    setEditForm({
      title: item.title ?? "",
      creator: item.creator ?? "",
      description: item.description ?? "",
      releaseDate: item.releaseDate ?? "",
      coverUrl: item.coverUrl ?? "",
      contentType: item.contentType,
    });
  }, [item]);

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

  function handleSaveDetails() {
    updateItem(
      {
        id: currentItem.id,
        title: editForm.title.trim(),
        creator: editForm.creator.trim() || null,
        description: editForm.description.trim() || null,
        releaseDate: editForm.releaseDate || null,
        coverUrl: editForm.coverUrl.trim() || null,
        contentType: editForm.contentType,
      },
      {
        onSuccess: () => {
          setEditOpen(false);
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={() => window.history.back()} variant="outline" className="w-fit bg-card/90">
          Back
        </Button>

        <Button variant={editOpen ? "secondary" : "outline"} onClick={() => setEditOpen((prev) => !prev)}>
          {editOpen ? "Close Editor" : "Edit Details"}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="flex flex-col gap-5 p-5">
            <div className="cover-frame flex aspect-[2/3] items-center justify-center overflow-hidden rounded-[28px]">
              {currentItem.coverUrl ? (
                <img src={currentItem.coverUrl} alt={currentItem.title} className="h-full w-full object-cover" />
              ) : (
                <span className="text-6xl">{ct?.icon ?? "📄"}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {ct ? <Badge variant="outline">{ct.label}</Badge> : null}
              {currentItem.releaseDate ? <Badge variant="secondary">{currentItem.releaseDate.slice(0, 4)}</Badge> : null}
            </div>

            <div>
              <h1 className="text-5xl font-semibold leading-none tracking-[-0.06em]">{currentItem.title}</h1>
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
              <Label>Trending Boost</Label>
              <Button
                variant={currentItem.trendingBoostEnabled ? "secondary" : "outline"}
                onClick={() =>
                  updateItem({
                    id: currentItem.id,
                    trendingBoostEnabled: !currentItem.trendingBoostEnabled,
                  })
                }
              >
                {currentItem.trendingBoostEnabled ? "Trending +100 enabled" : "Enable Trending +100"}
              </Button>
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
          {editOpen ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Title</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Title"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Creator</Label>
                    <Input
                      value={editForm.creator}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, creator: e.target.value }))}
                      placeholder="Author, director, channel..."
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Content Type</Label>
                    <Select
                      value={editForm.contentType}
                      onValueChange={(value) =>
                        setEditForm((prev) => ({ ...prev, contentType: value as (typeof CONTENT_TYPES)[number]["id"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CONTENT_TYPES.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Release Date</Label>
                    <Input
                      type="date"
                      value={editForm.releaseDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, releaseDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Cover URL</Label>
                  <Input
                    value={editForm.coverUrl}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, coverUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Description"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <Button variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveDetails} disabled={!editForm.title.trim()}>
                    Save changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

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
              <CardTitle>Suggest Metric</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <MetricStat label="Base score" value={currentItem.suggestMetricBase != null ? currentItem.suggestMetricBase : "Pending"} />
                <MetricStat label="Final score" value={currentItem.suggestMetricFinal != null ? currentItem.suggestMetricFinal : "Pending"} />
              </div>

              <div className="flex flex-wrap gap-2">
                {currentItem.status === "suggestions" && Date.now() - currentItem.createdAt < 7 * 24 * 60 * 60 * 1000 ? (
                  <Badge variant="secondary">Recent +50</Badge>
                ) : null}
                {currentItem.trendingBoostEnabled ? <Badge variant="secondary">Trending +100</Badge> : null}
                {currentItem.status !== "suggestions" ? <Badge variant="outline">Not in next-to-consume pool</Badge> : null}
              </div>

              <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">AI explanation</p>
                <p className="mt-2 text-sm leading-7 text-foreground">
                  {currentItem.suggestMetricReason ?? "No suggest metric has been generated for this item yet."}
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                {currentItem.suggestMetricUpdatedAt
                  ? `Last scored ${new Date(currentItem.suggestMetricUpdatedAt).toLocaleString()}`
                  : "Waiting for AI scoring."}
              </div>
            </CardContent>
          </Card>

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

function MetricStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">{value}</div>
    </div>
  );
}
