import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Ellipsis, ExternalLink, PencilLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AIPanel } from "../components/AIPanel";
import { InlineTagManager } from "../components/InlineTagManager";
import { useScoreItem } from "../hooks/useAI";
import { useItems, useUpdateItem, useDeleteItem } from "../hooks/useItems";
import { useAddItemToList, useCreateList, useItemLists, useRemoveItemFromList } from "../hooks/useLists";
import { useCreateNoteEntry, useDeleteNoteEntry, useNoteEntries } from "../hooks/useNotes";
import { CONTENT_TYPES, STATUSES } from "../lib/constants";
import type { StatusId } from "../lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const item = allItems.find((candidate) => candidate.id === id);

  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<string[] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [entryComposerOpen, setEntryComposerOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [listToAdd, setListToAdd] = useState<string>("");
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
    if (!item) return;
    setNotes(item.notes ?? "");
    setEditForm({
      title: item.title ?? "",
      creator: item.creator ?? "",
      description: item.description ?? "",
      releaseDate: item.releaseDate ?? "",
      coverUrl: item.coverUrl ?? "",
      contentType: item.contentType,
    });
    setProgressForm({
      current: item.progressCurrent?.toString() ?? "",
      total: item.progressTotal?.toString() ?? "",
      percent: item.progressPercent?.toString() ?? "",
    });
    setNoteEditorOpen(false);
    setEntryComposerOpen(false);
  }, [item?.id]);

  useEffect(() => {
    if (!itemListsData) return;
    const defaultTarget = itemListsData.lists.find((list) => !list.containsItem)?.id ?? "";
    setListToAdd(defaultTarget);
  }, [itemListsData]);

  if (isLoading) {
    return <div className="py-24 text-center text-muted-foreground">Loading…</div>;
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
        <div className="text-base">Item not found.</div>
        <Button onClick={() => navigate({ to: "/" })} variant="outline">
          Back to dashboard
        </Button>
      </div>
    );
  }

  const currentItem = item;
  const contentType = CONTENT_TYPES.find((type) => type.id === currentItem.contentType);
  const progressMeta = getProgressMeta(currentItem);
  const availableLists = itemListsData?.lists ?? [];
  const noteEntries = noteEntriesData?.entries ?? [];
  const currentLists = availableLists.filter((list) => list.containsItem);
  const addableLists = availableLists.filter((list) => !list.containsItem);

  const scoreBadges = useMemo(() => {
    const badges: Array<{ label: string; variant: "secondary" | "outline" }> = [];

    if (currentItem.status === "suggestions" && Date.now() - currentItem.createdAt < 7 * 24 * 60 * 60 * 1000) {
      badges.push({ label: "Recent +50", variant: "secondary" });
    }
    if (currentItem.trendingBoostEnabled) {
      badges.push({ label: "Trending +100", variant: "secondary" });
    }
    if (currentItem.manualBoost > 0) {
      badges.push({ label: `Manual +${currentItem.manualBoost}`, variant: "secondary" });
    }
    if (currentItem.hiddenFromRecommendations) {
      badges.push({ label: "Hidden from recommendations", variant: "outline" });
    }
    if (currentItem.cooldownUntil && currentItem.cooldownUntil > Date.now()) {
      badges.push({
        label: `Cooldown until ${new Date(currentItem.cooldownUntil).toLocaleDateString()}`,
        variant: "outline",
      });
    }
    if (currentItem.status !== "suggestions") {
      badges.push({ label: "Not in next-to-consume pool", variant: "outline" });
    }

    return badges;
  }, [currentItem]);

  function saveNotes() {
    if (notes !== (currentItem.notes ?? "")) {
      updateItem(
        { id: currentItem.id, notes: notes || null },
        {
          onSuccess: () => {
            setNoteEditorOpen(false);
          },
        }
      );
    } else {
      setNoteEditorOpen(false);
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
        onSuccess: () => {
          setEntryForm({
            entryType: entryForm.entryType,
            content: "",
            context: "",
          });
          setEntryComposerOpen(false);
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <Button onClick={() => window.history.back()} variant="outline" className="w-fit bg-card/90">
            Back
          </Button>
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="text-4xl font-semibold leading-none tracking-[-0.06em] sm:text-5xl">
              {currentItem.title}
            </h1>
            {contentType ? <Badge variant="outline">{contentType.label}</Badge> : null}
            {currentItem.releaseDate ? (
              <Badge variant="secondary">{currentItem.releaseDate.slice(0, 4)}</Badge>
            ) : null}
          </div>
          {currentItem.subtitle ? (
            <p className="text-sm italic text-muted-foreground">{currentItem.subtitle}</p>
          ) : null}
          {currentItem.creator ? <p className="text-sm text-muted-foreground">{currentItem.creator}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <Button variant={editOpen ? "secondary" : "outline"} onClick={() => setEditOpen((prev) => !prev)}>
            <PencilLine className="mr-2 h-4 w-4" />
            {editOpen ? "Close Editor" : "Edit Details"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {currentItem.sourceUrl ? (
                <DropdownMenuItem asChild>
                  <a href={currentItem.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open source
                  </a>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} disabled={deleting} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting…" : "Delete item"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card className="border-sky-200/70 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(204_100%_98%)_100%)]">
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="cover-frame flex aspect-[2/3] items-center justify-center overflow-hidden rounded-[28px]">
                {currentItem.coverUrl ? (
                  <img src={currentItem.coverUrl} alt={currentItem.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-6xl">{contentType?.icon ?? "📄"}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {contentType ? <Badge className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50" variant="outline">{contentType.label}</Badge> : null}
                {currentItem.rating ? <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100" variant="secondary">{currentItem.rating}★ rated</Badge> : null}
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Status</SectionLabel>
                  <Select
                    value={currentItem.status}
                    onValueChange={(value) => updateItem({ id: currentItem.id, status: value as StatusId })}
                  >
                    <SelectTrigger className="h-9 w-[170px] rounded-full bg-card px-3 py-1.5 shadow-none">
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

                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Rating</SectionLabel>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          updateItem({
                            id: currentItem.id,
                            rating: currentItem.rating === n ? null : n,
                          })
                        }
                        className={`text-xl leading-none transition-opacity ${
                          (currentItem.rating ?? 0) >= n ? "opacity-100" : "opacity-30"
                        }`}
                        aria-label={`Rate ${n} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-violet-200/70 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(270_100%_98%)_100%)]">
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Recommendations</SectionLabel>
                  <Button
                    size="sm"
                    variant={currentItem.hiddenFromRecommendations ? "outline" : "secondary"}
                    onClick={() =>
                      updateItem({
                        id: currentItem.id,
                        hiddenFromRecommendations: !currentItem.hiddenFromRecommendations,
                      })
                    }
                  >
                    {currentItem.hiddenFromRecommendations ? "Hidden" : "Shown"}
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Trending Post</SectionLabel>
                  <Button
                    size="sm"
                    variant={currentItem.trendingBoostEnabled ? "secondary" : "outline"}
                    onClick={() =>
                      updateItem({
                        id: currentItem.id,
                        trendingBoostEnabled: !currentItem.trendingBoostEnabled,
                      })
                    }
                  >
                    {currentItem.trendingBoostEnabled ? "On" : "Off"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <SectionLabel>Manual boost</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 50, 100, 200].map((boost) => (
                    <Button
                      key={boost}
                      size="sm"
                      variant={currentItem.manualBoost === boost ? "secondary" : "outline"}
                      className={currentItem.manualBoost === boost ? "bg-violet-600 text-white hover:bg-violet-600" : ""}
                      onClick={() => updateItem({ id: currentItem.id, manualBoost: boost })}
                    >
                      {boost === 0 ? "Off" : `+${boost}`}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <SectionLabel>Cooldown</SectionLabel>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      {currentItem.cooldownUntil && currentItem.cooldownUntil > Date.now()
                        ? `Until ${new Date(currentItem.cooldownUntil).toLocaleDateString()}`
                        : "Set cooldown"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() =>
                        updateItem({
                          id: currentItem.id,
                          cooldownUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
                        })
                      }
                    >
                      Cooldown for 7 days
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        updateItem({
                          id: currentItem.id,
                          cooldownUntil: Date.now() + 30 * 24 * 60 * 60 * 1000,
                        })
                      }
                    >
                      Cooldown for 30 days
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateItem({ id: currentItem.id, cooldownUntil: null })}>
                      Clear cooldown
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/70 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(150_60%_98%)_100%)]">
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>Lists</SectionTitle>
                <Badge variant="outline">{currentLists.length}</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentLists.length > 0 ? (
                  currentLists.map((list) => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => removeItemFromList({ itemId: currentItem.id, listId: list.id })}
                      disabled={removingFromList}
                      className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.22)] px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      <span className="size-2 rounded-full" style={{ backgroundColor: list.color }} />
                      {list.name}
                      <span className="text-muted-foreground">×</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No list memberships yet.</p>
                )}
              </div>

              {addableLists.length > 0 ? (
                <div className="flex gap-2">
                  <Select value={listToAdd} onValueChange={setListToAdd}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add to list" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {addableLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    disabled={!listToAdd || addingToList}
                    onClick={() => addItemToList({ itemId: currentItem.id, listId: listToAdd })}
                  >
                    Add
                  </Button>
                </div>
              ) : null}

              <div className="flex gap-2">
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Create list and add"
                />
                <Button
                  variant="outline"
                  onClick={handleCreateListAndAdd}
                  disabled={creatingList || !newListName.trim()}
                >
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200/70 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(32_100%_98%)_100%)]">
            <CardContent className="flex flex-col gap-2 p-4 text-sm text-muted-foreground">
              {currentItem.releaseDate ? <div>Released: {currentItem.releaseDate.slice(0, 4)}</div> : null}
              {currentItem.durationMins ? <div>Duration: {currentItem.durationMins} min</div> : null}
              <div>Added {new Date(currentItem.createdAt).toLocaleDateString()}</div>
              {currentItem.startedAt ? <div>Started {new Date(currentItem.startedAt).toLocaleDateString()}</div> : null}
              {currentItem.finishedAt ? <div>Finished {new Date(currentItem.finishedAt).toLocaleDateString()}</div> : null}
              {currentItem.sourceUrl ? (
                <a
                  href={currentItem.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                >
                  Open source
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
            {editOpen ? (
              <section className="rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.18)] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <SectionTitle>Edit Details</SectionTitle>
                    <p className="text-sm text-muted-foreground">Adjust the stored metadata without leaving the item page.</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Title">
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Title"
                      />
                    </Field>

                    <Field label="Creator">
                      <Input
                        value={editForm.creator}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, creator: e.target.value }))}
                        placeholder="Author, director, channel..."
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Content Type">
                      <Select
                        value={editForm.contentType}
                        onValueChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            contentType: value as (typeof CONTENT_TYPES)[number]["id"],
                          }))
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
                    </Field>

                    <Field label="Release Date">
                      <Input
                        type="date"
                        value={editForm.releaseDate}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, releaseDate: e.target.value }))}
                      />
                    </Field>
                  </div>

                  <Field label="Cover URL">
                    <Input
                      value={editForm.coverUrl}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, coverUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </Field>

                  <Field label="Description">
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Description"
                    />
                  </Field>

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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList className="w-full justify-start sm:w-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="notebook">Notebook</TabsTrigger>
                  <TabsTrigger value="scoring">Scoring</TabsTrigger>
                </TabsList>
                {activeTab === "scoring" && currentItem.suggestMetricModelUsed ? (
                  <Badge className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-50" variant="outline">{currentItem.suggestMetricModelUsed}</Badge>
                ) : null}
              </div>

              <TabsContent value="overview" className="space-y-5">
                <SectionCard title="Description">
                  {currentItem.description ? (
                    <p className="text-sm leading-7 text-foreground">{currentItem.description}</p>
                  ) : (
                    <EmptyState
                      title="No description yet"
                      body="This item does not have a saved description yet. You can add one from Edit Details."
                    />
                  )}
                </SectionCard>

                <SectionCard title={progressMeta.summaryLabel}>
                  <div className="rounded-[22px] border border-sky-200 bg-[linear-gradient(180deg,hsl(204_100%_99%)_0%,hsl(206_100%_97%)_100%)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{progressMeta.summaryLabel}</p>
                      <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100" variant="secondary">{currentItem.progressPercent ?? 0}%</Badge>
                    </div>
                    <div className="mt-4 h-3 rounded-full bg-sky-100">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${Math.max(0, Math.min(100, currentItem.progressPercent ?? 0))}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {currentItem.lastTouchedAt
                        ? `Last touched ${new Date(currentItem.lastTouchedAt).toLocaleString()}`
                        : "No progress recorded yet."}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label={progressMeta.currentLabel}>
                      <Input
                        type="number"
                        min="0"
                        value={progressForm.current}
                        onChange={(e) => setProgressForm((prev) => ({ ...prev, current: e.target.value }))}
                        placeholder="0"
                      />
                    </Field>
                    <Field label={progressMeta.totalLabel}>
                      <Input
                        type="number"
                        min="0"
                        value={progressForm.total}
                        onChange={(e) => setProgressForm((prev) => ({ ...prev, total: e.target.value }))}
                        placeholder="0"
                      />
                    </Field>
                    <Field label="Percent complete">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={progressForm.percent}
                        onChange={(e) => setProgressForm((prev) => ({ ...prev, percent: e.target.value }))}
                        placeholder="0"
                      />
                    </Field>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveProgress}>Save progress</Button>
                  </div>
                </SectionCard>

                <SectionCard title="AI Insights">
                  <AIPanel item={currentItem} onSuggestTags={(tags) => setSuggestedTags(tags)} />
                </SectionCard>

                <SectionCard title="Tags">
                  <InlineTagManager
                    itemId={currentItem.id}
                    suggestedTags={suggestedTags}
                    onSuggestionsApplied={() => setSuggestedTags(null)}
                  />
                </SectionCard>
              </TabsContent>

              <TabsContent value="notebook" className="space-y-5">
                <SectionCard title="Private Notes">
                  {noteEditorOpen ? (
                    <div className="space-y-3">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Private notes…"
                        className="min-h-[160px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setNoteEditorOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={saveNotes}>Save note</Button>
                      </div>
                    </div>
                  ) : currentItem.notes ? (
                    <div className="space-y-3">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{currentItem.notes}</p>
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => setNoteEditorOpen(true)}>
                          Edit Note
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      title="No private note yet"
                      body="Capture one running note for personal context, ideas, or reminders."
                      actionLabel="Add Note"
                      onAction={() => setNoteEditorOpen(true)}
                    />
                  )}
                </SectionCard>

                <SectionCard title="Highlights & Quotes">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100" variant="secondary">{noteEntries.length} entries</Badge>
                    <Button
                      variant={entryComposerOpen ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setEntryComposerOpen((prev) => !prev)}
                    >
                      {entryComposerOpen ? "Close composer" : "Add Entry"}
                    </Button>
                  </div>

                  {entryComposerOpen ? (
                    <div className="grid gap-4 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.22)] p-4">
                      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                        <Field label="Entry type">
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
                        </Field>

                        <Field label="Context">
                          <Input
                            value={entryForm.context}
                            onChange={(e) => setEntryForm((prev) => ({ ...prev, context: e.target.value }))}
                            placeholder="Chapter, timestamp, scene, page, or why it matters"
                          />
                        </Field>
                      </div>

                      <Field label="Content">
                        <Textarea
                          value={entryForm.content}
                          onChange={(e) => setEntryForm((prev) => ({ ...prev, content: e.target.value }))}
                          placeholder="Capture a quote, highlight, takeaway, or short reflection"
                          className="min-h-[150px]"
                        />
                      </Field>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEntryComposerOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateEntry} disabled={creatingNoteEntry || !entryForm.content.trim()}>
                          {creatingNoteEntry ? "Adding…" : "Save entry"}
                        </Button>
                      </div>
                    </div>
                  ) : null}

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
                    <EmptyState
                      title="No structured entries yet"
                      body="Use highlights, quotes, takeaways, and reflections to keep important moments separate from your raw notes."
                      actionLabel={entryComposerOpen ? undefined : "Add Entry"}
                      onAction={entryComposerOpen ? undefined : () => setEntryComposerOpen(true)}
                    />
                  )}
                </SectionCard>
              </TabsContent>

              <TabsContent value="scoring" className="space-y-5">
                <SectionCard title="Suggest Metric">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => queueScore(currentItem.id)} disabled={queueingScore}>
                      {queueingScore
                        ? "Queueing Re-score…"
                        : currentItem.suggestMetricNeedsMoreInfo
                          ? "Re-score With More Info"
                          : "Re-score"}
                    </Button>
                    {currentItem.suggestMetricModelUsed ? <Badge className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-50" variant="outline">{currentItem.suggestMetricModelUsed}</Badge> : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <MetricStat
                      label="Base score"
                      value={currentItem.suggestMetricBase != null ? currentItem.suggestMetricBase : "Pending"}
                    />
                    <MetricStat
                      label="Final score"
                      value={currentItem.suggestMetricFinal != null ? currentItem.suggestMetricFinal : "Pending"}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {scoreBadges.map((badge) => (
                      <Badge
                        key={badge.label}
                        variant={badge.variant}
                        className={badge.variant === "secondary" ? "bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-100" : ""}
                      >
                        {badge.label}
                      </Badge>
                    ))}
                  </div>

                  <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
                    <SectionLabel>AI explanation</SectionLabel>
                    <p className="mt-2 text-sm leading-7 text-foreground">
                      {currentItem.suggestMetricReason ?? "No suggest metric has been generated for this item yet."}
                    </p>
                  </div>

                  {currentItem.suggestMetricNeedsMoreInfo ? (
                    <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
                      <SectionLabel>More Info Requested</SectionLabel>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {currentItem.suggestMetricMoreInfoRequest ??
                          "The scorer needs more metadata before it can score this item confidently."}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.18)] p-4">
                    <SectionLabel>Recommendation tuning</SectionLabel>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>Hidden items are excluded from next-to-consume until you show them again.</li>
                      <li>Manual boost and trending boost add directly to the final score.</li>
                      <li>Cooldown temporarily removes an item from the recommendation pool.</li>
                    </ul>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {currentItem.suggestMetricUpdatedAt
                      ? `Last scored ${new Date(currentItem.suggestMetricUpdatedAt).toLocaleString()}`
                      : "Waiting for AI scoring."}
                  </p>
                </SectionCard>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const tone = getSectionTone(title);
  return (
    <section className={`rounded-[28px] border p-5 ${tone}`}>
      <div className="mb-4">
        <SectionTitle>{title}</SectionTitle>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function getSectionTone(title: string) {
  if (title.includes("AI")) {
    return "border-fuchsia-200/70 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(304_100%_98%)_100%)]";
  }
  if (title.includes("Tracker")) {
    return "border-sky-200/70 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(205_100%_98%)_100%)]";
  }
  if (title.includes("Tags")) {
    return "border-emerald-200/70 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(148_50%_98%)_100%)]";
  }
  if (title.includes("Highlights") || title.includes("Notes")) {
    return "border-rose-200/70 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(350_100%_98%)_100%)]";
  }
  if (title.includes("Suggest")) {
    return "border-violet-200/70 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(268_100%_98%)_100%)]";
  }
  return "border-[hsl(var(--border))] bg-card/85";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold tracking-[-0.04em] text-foreground">{children}</h2>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </div>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-[hsl(var(--border))] px-4 py-5">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
      {actionLabel && onAction ? (
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
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
    {
      label: "25%",
      percent: 25,
      current: item.durationMins ? Math.round(item.durationMins * 0.25) : undefined,
      total: item.durationMins ?? undefined,
    },
    {
      label: "50%",
      percent: 50,
      current: item.durationMins ? Math.round(item.durationMins * 0.5) : undefined,
      total: item.durationMins ?? undefined,
    },
    {
      label: "75%",
      percent: 75,
      current: item.durationMins ? Math.round(item.durationMins * 0.75) : undefined,
      total: item.durationMins ?? undefined,
    },
    { label: "Done", percent: 100, current: item.durationMins ?? undefined, total: item.durationMins ?? undefined },
  ];

  if (item.contentType === "book") {
    return {
      currentLabel: "Current page",
      totalLabel: "Total pages",
      summaryLabel: "Reading Tracker",
      helperText:
        "Track pages or percent for books. If you fill current and total pages, percent is recalculated automatically.",
      presets,
    };
  }

  if (item.contentType === "article") {
    return {
      currentLabel: "Current reading minutes",
      totalLabel: "Estimated reading minutes",
      summaryLabel: "Reading Tracker",
      helperText:
        "For articles, you can use minutes or just click a quick preset like 25%, 50%, or Done.",
      presets,
    };
  }

  if (item.contentType === "tv") {
    const seasons = typeof parsedMetadata.seasons === "number" ? parsedMetadata.seasons : undefined;
    return {
      currentLabel: "Episodes watched",
      totalLabel: seasons ? `Episodes / ${seasons} seasons` : "Total episodes",
      summaryLabel: "Watch Tracker",
      helperText:
        "TV progress works best as episodes watched versus total episodes. Season-aware UI can build on this later.",
      presets,
    };
  }

  if (item.contentType === "podcast" || item.contentType === "youtube" || item.contentType === "movie") {
    return {
      currentLabel: "Minutes completed",
      totalLabel: "Total minutes",
      summaryLabel: "Playback Tracker",
      helperText:
        "Use minutes completed for long-form media. Quick presets are useful for partial watches and listens.",
      presets,
    };
  }

  return {
    currentLabel: "Current progress",
    totalLabel: "Total",
    summaryLabel: "Progress Tracker",
    helperText:
      "Use the progress fields to track where you are. Percent can be entered directly or derived from current/total values.",
    presets,
  };
}
