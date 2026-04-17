import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useScoreItem } from "../hooks/useAI";
import { useItems, useUpdateItem, useDeleteItem } from "../hooks/useItems";
import { useAddItemToList, useCreateList, useItemLists, useRemoveItemFromList } from "../hooks/useLists";
import { useCreateNoteEntry, useDeleteNoteEntry, useNoteEntries } from "../hooks/useNotes";
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
  const { mutate: queueScore, isPending: queueingScore } = useScoreItem(id);
  const { data: itemListsData } = useItemLists(id);
  const { mutate: addItemToList, isPending: addingToList } = useAddItemToList();
  const { mutate: removeItemFromList, isPending: removingFromList } = useRemoveItemFromList();
  const { mutate: createList, isPending: creatingList } = useCreateList();
  const { data: noteEntriesData } = useNoteEntries(id);
  const { mutate: createNoteEntry, isPending: creatingNoteEntry } = useCreateNoteEntry(id);
  const { mutate: deleteNoteEntry, isPending: deletingNoteEntry } = useDeleteNoteEntry(id);

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
  const [progressForm, setProgressForm] = useState({
    current: "",
    total: "",
    percent: "",
  });
  const [newListName, setNewListName] = useState("");
  const [entryForm, setEntryForm] = useState<{
    entryType: "highlight" | "quote" | "takeaway" | "reflection";
    content: string;
    context: string;
  }>({
    entryType: "highlight",
    content: "",
    context: "",
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

  useEffect(() => {
    if (!item) return;
    setProgressForm({
      current: item.progressCurrent?.toString() ?? "",
      total: item.progressTotal?.toString() ?? "",
      percent: item.progressPercent?.toString() ?? "",
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
  const progressMeta = getProgressMeta(currentItem);
  const availableLists = itemListsData?.lists ?? [];
  const noteEntries = noteEntriesData?.entries ?? [];

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

  function saveProgress() {
    updateItem({
      id: currentItem.id,
      progressCurrent: progressForm.current ? parseInt(progressForm.current, 10) : null,
      progressTotal: progressForm.total ? parseInt(progressForm.total, 10) : null,
      progressPercent: progressForm.percent ? parseInt(progressForm.percent, 10) : null,
    });
  }

  function handleCreateListAndAdd() {
    const name = newListName.trim();
    if (!name) return;
    createList(
      { name },
      {
        onSuccess: (created) => {
          addItemToList({ itemId: currentItem.id, listId: created.id });
          setNewListName("");
        },
      }
    );
  }

  function handleCreateEntry() {
    const content = entryForm.content.trim();
    if (!content) return;
    createNoteEntry(
      {
        entryType: entryForm.entryType,
        content,
        context: entryForm.context.trim() || undefined,
      },
      {
        onSuccess: () =>
          setEntryForm({
            entryType: entryForm.entryType,
            content: "",
            context: "",
          }),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-3">
            <Button onClick={() => window.history.back()} variant="outline" className="w-fit bg-card/90">
              Back
            </Button>
            <div className="flex flex-wrap items-end gap-3">
              <h1 className="text-5xl font-semibold leading-none tracking-[-0.06em]">{currentItem.title}</h1>
              {ct ? <Badge variant="outline">{ct.label}</Badge> : null}
              {currentItem.releaseDate ? <Badge variant="secondary">{currentItem.releaseDate.slice(0, 4)}</Badge> : null}
            </div>
            {currentItem.subtitle ? <p className="text-sm italic text-muted-foreground">{currentItem.subtitle}</p> : null}
            {currentItem.creator ? <p className="text-sm text-muted-foreground">{currentItem.creator}</p> : null}
          </div>

          <Button variant={editOpen ? "secondary" : "outline"} onClick={() => setEditOpen((prev) => !prev)}>
            {editOpen ? "Close Editor" : "Edit Details"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
            <div className="flex flex-col gap-5 xl:border-r xl:border-[hsl(var(--border))] xl:pr-6">
            <div className="cover-frame flex aspect-[2/3] items-center justify-center overflow-hidden rounded-[28px]">
              {currentItem.coverUrl ? (
                <img src={currentItem.coverUrl} alt={currentItem.title} className="h-full w-full object-cover" />
              ) : (
                <span className="text-6xl">{ct?.icon ?? "📄"}</span>
              )}
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

            <div className="flex flex-col gap-3">
              <Label>Recommendation Controls</Label>
              <Button
                variant={currentItem.hiddenFromRecommendations ? "secondary" : "outline"}
                onClick={() =>
                  updateItem({
                    id: currentItem.id,
                    hiddenFromRecommendations: !currentItem.hiddenFromRecommendations,
                  })
                }
              >
                {currentItem.hiddenFromRecommendations ? "Hidden from recommendations" : "Show in recommendations"}
              </Button>

              <div className="flex flex-wrap gap-2">
                {[0, 50, 100, 200].map((boost) => (
                  <Button
                    key={boost}
                    variant={currentItem.manualBoost === boost ? "secondary" : "outline"}
                    onClick={() => updateItem({ id: currentItem.id, manualBoost: boost })}
                  >
                    {boost === 0 ? "No manual boost" : `Boost +${boost}`}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={currentItem.cooldownUntil && currentItem.cooldownUntil > Date.now() ? "secondary" : "outline"}
                  onClick={() => updateItem({ id: currentItem.id, cooldownUntil: Date.now() + 7 * 24 * 60 * 60 * 1000 })}
                >
                  Cooldown 7 days
                </Button>
                <Button
                  variant={currentItem.cooldownUntil && currentItem.cooldownUntil > Date.now() ? "secondary" : "outline"}
                  onClick={() => updateItem({ id: currentItem.id, cooldownUntil: Date.now() + 30 * 24 * 60 * 60 * 1000 })}
                >
                  Cooldown 30 days
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateItem({ id: currentItem.id, cooldownUntil: null })}
                >
                  Clear cooldown
                </Button>
              </div>
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

            <div className="flex flex-col gap-3">
              <Label>Lists</Label>
              <div className="flex flex-wrap gap-2">
                {availableLists.length > 0 ? (
                  availableLists.map((list) => (
                    <Button
                      key={list.id}
                      variant={list.containsItem ? "secondary" : "outline"}
                      onClick={() =>
                        list.containsItem
                          ? removeItemFromList({ itemId: currentItem.id, listId: list.id })
                          : addItemToList({ itemId: currentItem.id, listId: list.id })
                      }
                      disabled={addingToList || removingFromList}
                      className="justify-start"
                    >
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: list.color }} />
                      {list.name}
                    </Button>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No lists yet. Create one below or from the Lists page.</div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Create list and add item"
                />
                <Button
                  variant="outline"
                  onClick={handleCreateListAndAdd}
                  disabled={creatingList || !newListName.trim()}
                >
                  {creatingList ? "Creating…" : "Add"}
                </Button>
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
          </div>

          <div className="flex flex-col gap-6">
            {editOpen ? (
              <section className="flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-6">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Edit Details</h2>
                </div>
                <div className="grid gap-4">
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
              </div>
            </section>
            ) : null}

          {item.description ? (
            <section className="flex flex-col gap-3 border-b border-[hsl(var(--border))] pb-6">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Description</h2>
              <div className="text-sm leading-7 text-muted-foreground">{item.description}</div>
            </section>
          ) : null}

          <section className="flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-6">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Suggest Metric</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => queueScore(currentItem.id)} disabled={queueingScore}>
                  {queueingScore ? "Queueing Re-score…" : currentItem.suggestMetricNeedsMoreInfo ? "Re-score With More Info" : "Re-score"}
                </Button>
                {currentItem.suggestMetricModelUsed ? <Badge variant="outline">{currentItem.suggestMetricModelUsed}</Badge> : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <MetricStat label="Base score" value={currentItem.suggestMetricBase != null ? currentItem.suggestMetricBase : "Pending"} />
                <MetricStat label="Final score" value={currentItem.suggestMetricFinal != null ? currentItem.suggestMetricFinal : "Pending"} />
              </div>

              <div className="flex flex-wrap gap-2">
                {currentItem.status === "suggestions" && Date.now() - currentItem.createdAt < 7 * 24 * 60 * 60 * 1000 ? (
                  <Badge variant="secondary">Recent +50</Badge>
                ) : null}
                {currentItem.trendingBoostEnabled ? <Badge variant="secondary">Trending +100</Badge> : null}
                {currentItem.manualBoost > 0 ? <Badge variant="secondary">Manual +{currentItem.manualBoost}</Badge> : null}
                {currentItem.hiddenFromRecommendations ? <Badge variant="outline">Hidden from recommendations</Badge> : null}
                {currentItem.cooldownUntil && currentItem.cooldownUntil > Date.now() ? (
                  <Badge variant="outline">Cooldown until {new Date(currentItem.cooldownUntil).toLocaleDateString()}</Badge>
                ) : null}
                {currentItem.status !== "suggestions" ? <Badge variant="outline">Not in next-to-consume pool</Badge> : null}
              </div>

              <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">AI explanation</p>
                <p className="mt-2 text-sm leading-7 text-foreground">
                  {currentItem.suggestMetricReason ?? "No suggest metric has been generated for this item yet."}
                </p>
              </div>

              {currentItem.suggestMetricNeedsMoreInfo ? (
                <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">More Info Requested</p>
                  <p className="mt-2 text-sm leading-7 text-foreground">
                    {currentItem.suggestMetricMoreInfoRequest ?? "The scorer needs more metadata before it can score this item confidently."}
                  </p>
                </div>
              ) : null}

              <div className="text-xs text-muted-foreground">
                {currentItem.suggestMetricUpdatedAt
                  ? `Last scored ${new Date(currentItem.suggestMetricUpdatedAt).toLocaleString()}`
                  : "Waiting for AI scoring."}
              </div>
          </section>

          <section className="flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-6">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Progress</h2>
            <div className="flex flex-wrap gap-2">
              {progressMeta.presets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setProgressForm({
                      current: preset.current != null ? String(preset.current) : "",
                      total: preset.total != null ? String(preset.total) : progressForm.total,
                      percent: preset.percent != null ? String(preset.percent) : "",
                    })
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label>{progressMeta.currentLabel}</Label>
                <Input
                  type="number"
                  min="0"
                  value={progressForm.current}
                  onChange={(e) => setProgressForm((prev) => ({ ...prev, current: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{progressMeta.totalLabel}</Label>
                <Input
                  type="number"
                  min="0"
                  value={progressForm.total}
                  onChange={(e) => setProgressForm((prev) => ({ ...prev, total: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Percent complete</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={progressForm.percent}
                  onChange={(e) => setProgressForm((prev) => ({ ...prev, percent: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{progressMeta.summaryLabel}</p>
                <Badge variant="secondary">{currentItem.progressPercent ?? 0}%</Badge>
              </div>
              <div className="mt-3 h-3 rounded-full bg-[hsl(var(--secondary))]">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, currentItem.progressPercent ?? 0))}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {currentItem.lastTouchedAt
                  ? `Last touched ${new Date(currentItem.lastTouchedAt).toLocaleString()}`
                  : "No progress recorded yet."}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{progressMeta.helperText}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveProgress}>Save progress</Button>
            </div>
          </section>

          <section className="flex flex-col gap-3 border-b border-[hsl(var(--border))] pb-6">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Tags</h2>
              <InlineTagManager itemId={item.id} suggestedTags={suggestedTags} onSuggestionsApplied={() => setSuggestedTags(null)} />
          </section>

          <section className="flex flex-col gap-3 border-b border-[hsl(var(--border))] pb-6">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Notes</h2>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Private notes…" />
          </section>

          <section className="flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Highlights & Quotes</h2>
              <Badge variant="secondary">{noteEntries.length} entries</Badge>
            </div>

            <div className="grid gap-4 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.22)] p-4">
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="flex flex-col gap-2">
                  <Label>Entry type</Label>
                  <Select
                    value={entryForm.entryType}
                    onValueChange={(value) =>
                      setEntryForm((prev) => ({
                        ...prev,
                        entryType: value as "highlight" | "quote" | "takeaway" | "reflection",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="highlight">Highlight</SelectItem>
                        <SelectItem value="quote">Quote</SelectItem>
                        <SelectItem value="takeaway">Takeaway</SelectItem>
                        <SelectItem value="reflection">Reflection</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Context</Label>
                  <Input
                    value={entryForm.context}
                    onChange={(e) => setEntryForm((prev) => ({ ...prev, context: e.target.value }))}
                    placeholder="Chapter, timestamp, scene, page, or why it matters"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Content</Label>
                <Textarea
                  value={entryForm.content}
                  onChange={(e) => setEntryForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Capture a quote, highlight, takeaway, or short reflection"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleCreateEntry} disabled={creatingNoteEntry || !entryForm.content.trim()}>
                  {creatingNoteEntry ? "Adding…" : "Add entry"}
                </Button>
              </div>
            </div>

            {noteEntries.length > 0 ? (
              <div className="grid gap-3">
                {noteEntries.map((entry) => (
                  <div key={entry.id} className="rounded-[22px] border border-[hsl(var(--border))] bg-card/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{entry.entryType}</Badge>
                        {entry.context ? <Badge variant="secondary">{entry.context}</Badge> : null}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingNoteEntry}
                        onClick={() => deleteNoteEntry(entry.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{entry.content}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Added {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-[hsl(var(--border))] p-5 text-sm text-muted-foreground">
                No structured entries yet. Use highlights, quotes, takeaways, and reflections to keep important insights separate from your raw notes.
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">AI Analysis</h2>
              <AIPanel item={item} onSuggestTags={(tags) => setSuggestedTags(tags)} />
          </section>
          </div>
        </div>
        </CardContent>
      </Card>
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

function getProgressMeta(item: {
  contentType: (typeof CONTENT_TYPES)[number]["id"];
  durationMins: number | null;
  metadata: string | null;
}) {
  let parsedMetadata: Record<string, unknown> = {};
  try {
    parsedMetadata = item.metadata ? (JSON.parse(item.metadata) as Record<string, unknown>) : {};
  } catch {
    parsedMetadata = {};
  }

  const presets = [
    { label: "25%", percent: 25, current: item.durationMins ? Math.round(item.durationMins * 0.25) : undefined, total: item.durationMins ?? undefined },
    { label: "50%", percent: 50, current: item.durationMins ? Math.round(item.durationMins * 0.5) : undefined, total: item.durationMins ?? undefined },
    { label: "75%", percent: 75, current: item.durationMins ? Math.round(item.durationMins * 0.75) : undefined, total: item.durationMins ?? undefined },
    { label: "Done", percent: 100, current: item.durationMins ?? undefined, total: item.durationMins ?? undefined },
  ];

  if (item.contentType === "book") {
    return {
      currentLabel: "Current page",
      totalLabel: "Total pages",
      summaryLabel: "Reading progress",
      helperText: "Track pages or percent for books. If you fill current and total pages, percent is recalculated automatically.",
      presets,
    };
  }

  if (item.contentType === "article") {
    return {
      currentLabel: "Current reading minutes",
      totalLabel: "Estimated reading minutes",
      summaryLabel: "Reading state",
      helperText: "For articles, you can use minutes or just click a quick preset like 25%, 50%, or Done.",
      presets,
    };
  }

  if (item.contentType === "tv") {
    const seasons = typeof parsedMetadata.seasons === "number" ? parsedMetadata.seasons : undefined;
    return {
      currentLabel: "Episodes watched",
      totalLabel: seasons ? `Episodes / ${seasons} seasons` : "Total episodes",
      summaryLabel: "Watch progress",
      helperText: "TV progress works best as episodes watched versus total episodes. Season-aware UI can build on this later.",
      presets,
    };
  }

  if (item.contentType === "podcast" || item.contentType === "youtube" || item.contentType === "movie") {
    return {
      currentLabel: "Minutes completed",
      totalLabel: "Total minutes",
      summaryLabel: "Playback progress",
      helperText: "Use minutes completed for long-form media. Quick presets are useful for partial watches and listens.",
      presets,
    };
  }

  return {
    currentLabel: "Current progress",
    totalLabel: "Total",
    summaryLabel: "Current completion",
    helperText: "Use the progress fields to track where you are. Percent can be entered directly or derived from current/total values.",
    presets,
  };
}
