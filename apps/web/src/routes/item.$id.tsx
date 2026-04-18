import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Ellipsis, ExternalLink, PencilLine, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/item/$id")({
  component: ItemDetailPage,
});

function getTypeColor(typeId?: string) {
  switch (typeId) {
    case "book": return "#0ea5e9"; // Sky Blue
    case "movie": return "#f43f5e"; // Rose
    case "tv": return "#8b5cf6"; // Violet
    case "podcast": return "#d946ef"; // Fuchsia
    case "youtube": return "#ef4444"; // Red
    case "article": return "#10b981"; // Emerald
    case "tweet": return "#3b82f6"; // Blue
    default: return "#06b6d4"; // Cyan
  }
}

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
    finishedDate: "",
    coverUrl: "",
    contentType: "book" as typeof CONTENT_TYPES[number]["id"],
  });
  const [progressForm, setProgressForm] = useState({
    current: "",
    total: "",
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
      finishedDate: item.finishedAt ? new Date(item.finishedAt).toISOString().slice(0, 10) : "",
      coverUrl: item.coverUrl ?? "",
      contentType: item.contentType,
    });
    setProgressForm({
      current: item.progressCurrent?.toString() ?? "",
      total: item.progressTotal?.toString() ?? "",
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
  const themeColor = getTypeColor(currentItem.contentType);
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
        { onSuccess: () => setNoteEditorOpen(false) }
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
        finishedAt: editForm.finishedDate ? new Date(editForm.finishedDate).getTime() : null,
        coverUrl: editForm.coverUrl.trim() || null,
        contentType: editForm.contentType,
      },
      { onSuccess: () => setEditOpen(false) }
    );
  }

  function saveProgress() {
    updateItem({
      id: currentItem.id,
      progressCurrent: progressForm.current ? parseInt(progressForm.current, 10) : null,
      progressTotal: progressForm.total ? parseInt(progressForm.total, 10) : null,
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
          setEntryForm({ entryType: entryForm.entryType, content: "", context: "" });
          setEntryComposerOpen(false);
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-10 pb-20" style={{ '--hero-accent': themeColor } as React.CSSProperties}>
      
      {/* ─── HERO HEADER ────────────────────────────────────────────────── */}
      <div 
        className="relative overflow-hidden rounded-[2rem] border-0 ring-1 ring-[hsl(var(--border)_/_0.6)] paper-card p-6 md:p-10 !bg-[hsl(var(--background))]"
      >
        {/* Neon Glass Glow Elements */}
        <div 
          className="absolute inset-0 opacity-15 mix-blend-plus-lighter pointer-events-none" 
          style={{ background: `radial-gradient(circle at top right, var(--hero-accent), transparent 55%)` }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background)_/_0.6)] to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-end">
          
          <div className="w-32 md:w-48 shrink-0 overflow-hidden rounded-[1.25rem] shadow-2xl ring-1 ring-white/10 dark:ring-white/5 aspect-[2/3] bg-[hsl(var(--muted))] flex items-center justify-center">
            {currentItem.coverUrl ? (
              <img src={currentItem.coverUrl} alt={currentItem.title} className="h-full w-full object-cover" />
            ) : (
              <span className="text-6xl md:text-8xl">{contentType?.icon ?? "📄"}</span>
            )}
          </div>

          <div className="flex flex-col gap-4 flex-1 w-full min-w-0">
            <Button onClick={() => window.history.back()} variant="outline" size="sm" className="w-fit mb-2 bg-card/40 backdrop-blur-md rounded-full border-[hsl(var(--border)_/_0.5)]">
              <ArrowLeft className="mr-2 size-3.5" /> Back
            </Button>
            
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                {contentType ? (
                  <Badge variant="outline" className="bg-[var(--hero-accent)]/10 text-[var(--hero-accent)] border-[var(--hero-accent)]/20 px-3 py-1 text-xs">
                    {contentType.label}
                  </Badge>
                ) : null}
                {currentItem.releaseDate ? (
                  <Badge variant="secondary" className="px-3 py-1 text-xs bg-[hsl(var(--secondary)_/_0.5)] backdrop-blur">
                    {currentItem.releaseDate.slice(0, 4)}
                  </Badge>
                ) : null}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight max-w-4xl line-clamp-3">
                {currentItem.title}
              </h1>
              {currentItem.subtitle ? (
                <p className="text-[1.1rem] md:text-xl italic text-muted-foreground mt-2 max-w-3xl line-clamp-2">{currentItem.subtitle}</p>
              ) : null}
              {currentItem.creator ? (
                <p className="text-[1.1rem] font-medium text-foreground/80 mt-2">{currentItem.creator}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="soft-panel flex items-center rounded-full p-1 border-[hsl(var(--border)_/_0.4)]">
                <Select
                  value={currentItem.status}
                  onValueChange={(value) => updateItem({ id: currentItem.id, status: value as StatusId })}
                >
                  <SelectTrigger className="h-9 w-[160px] rounded-full border-none bg-transparent shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {STATUSES.map((status) => (
                        <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="soft-panel flex items-center gap-1 rounded-full px-4 h-11 border-[hsl(var(--border)_/_0.4)]">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateItem({ id: currentItem.id, rating: currentItem.rating === n ? null : n })}
                    className={`text-xl leading-none transition-all hover:scale-110 ${
                      (currentItem.rating ?? 0) >= n ? "opacity-100 text-[var(--hero-accent)] drop-shadow-md" : "opacity-20 hover:opacity-50"
                    }`}
                    aria-label={`Rate ${n} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── MAIN CONTENT SPLIT ────────────────────────────────────────── */}
      <div className="grid xl:grid-cols-[1fr_340px] items-start gap-8">
        
        {/* LEFT COLUMN: Main Editorial Stream */}
        <div className="flex flex-col gap-12 w-full min-w-0">
          
          {/* Progress Bar (Inline sleek version) */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{progressMeta.summaryLabel}</h2>
              <span className="font-mono text-sm font-semibold">{currentItem.progressPercent ?? 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-[hsl(var(--secondary)_/_0.5)] rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${Math.max(0, Math.min(100, currentItem.progressPercent ?? 0))}%`, backgroundColor: themeColor }}
              />
            </div>
            {currentItem.contentType !== "movie" && (
              <div className="grid gap-3 grid-cols-2 mt-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">{progressMeta.currentLabel}</Label>
                  <Input type="number" min="0" value={progressForm.current} onChange={(e) => setProgressForm(p => ({...p, current: e.target.value}))} onBlur={saveProgress} className="h-9 bg-[hsl(var(--card)_/_0.3)] backdrop-blur-sm border-[hsl(var(--border)_/_0.5)]" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">{progressMeta.totalLabel}</Label>
                  <Input type="number" min="0" value={progressForm.total} onChange={(e) => setProgressForm(p => ({...p, total: e.target.value}))} onBlur={saveProgress} className="h-9 bg-[hsl(var(--card)_/_0.3)] backdrop-blur-sm border-[hsl(var(--border)_/_0.5)]" />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {currentItem.description ? (
            <div className="text-lg leading-relaxed text-foreground/80 font-serif">
              {currentItem.description}
            </div>
          ) : null}

          <hr className="border-[hsl(var(--border)_/_0.3)]" />

          {/* Notebook Block */}
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Private Notes</h2>
              <Button variant="outline" size="sm" onClick={() => setNoteEditorOpen(!noteEditorOpen)} className="rounded-full rounded-full bg-[hsl(var(--card)_/_0.5)] backdrop-blur">
                <PencilLine className="mr-2 size-3.5" />
                {noteEditorOpen ? "Discard Changes" : "Edit Notes"}
              </Button>
            </div>

            {noteEditorOpen ? (
              <div className="space-y-4 animate-in fade-in-0 duration-300">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Drop your thoughts, context, or reviews here..."
                  className="min-h-[300px] text-[1.05rem] leading-relaxed bg-[hsl(var(--card)_/_0.5)] backdrop-blur-md resize-y"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <Button variant="default" onClick={saveNotes} className="rounded-full px-6">Save notes</Button>
                </div>
              </div>
            ) : currentItem.notes ? (
              <div className="prose prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-[1.05rem]">
                <p className="whitespace-pre-wrap">{currentItem.notes}</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No private notes written yet. Click 'Edit Notes' to start.</p>
            )}
          </section>

          {/* Highlights & Queries */}
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Entries & Highlights</h2>
              <Button
                variant={entryComposerOpen ? "secondary" : "outline"}
                size="sm"
                className="rounded-full text-foreground/80 bg-[hsl(var(--card)_/_0.5)] backdrop-blur"
                onClick={() => setEntryComposerOpen((prev) => !prev)}
              >
                {entryComposerOpen ? "Close Compose" : "+ Add Highlight"}
              </Button>
            </div>

            {entryComposerOpen ? (
              <div className="soft-panel rounded-3xl p-5 md:p-6 animate-in slide-in-from-top-4 fade-in-0 flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Type</Label>
                    <Select value={entryForm.entryType} onValueChange={(value: "highlight" | "quote" | "takeaway" | "reflection") => setEntryForm(p => ({ ...p, entryType: value }))}>
                      <SelectTrigger className="bg-[hsl(var(--input)_/_0.5)] backdrop-blur-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="highlight">Highlight</SelectItem>
                        <SelectItem value="quote">Quote</SelectItem>
                        <SelectItem value="takeaway">Takeaway</SelectItem>
                        <SelectItem value="reflection">Reflection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Context / Location</Label>
                    <Input value={entryForm.context} onChange={(e) => setEntryForm(p => ({ ...p, context: e.target.value }))} placeholder="Chapter 3, 14:02, Page 40..." className="bg-[hsl(var(--input)_/_0.5)] backdrop-blur-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Content</Label>
                  <Textarea value={entryForm.content} onChange={(e) => setEntryForm(p => ({ ...p, content: e.target.value }))} placeholder="The actual quote or reflection..." className="min-h-[120px] bg-[hsl(var(--input)_/_0.5)] backdrop-blur-sm" />
                </div>
                <div className="flex justify-end gap-3 mt-2">
                  <Button variant="default" onClick={handleCreateEntry} disabled={!entryForm.content.trim() || creatingNoteEntry} className="rounded-full px-6">
                    {creatingNoteEntry ? "Saving..." : "Save Entry"}
                  </Button>
                </div>
              </div>
            ) : null}

            {noteEntries.length > 0 ? (
              <div className="flex flex-col gap-5">
                {noteEntries.map((entry) => (
                  <div key={entry.id} className="relative group pl-6 md:pl-8 border-l-[3px] border-[hsl(var(--border)_/_0.8)] hover:border-[var(--hero-accent)] transition-colors py-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground bg-card/40">{entry.entryType}</Badge>
                      {entry.context ? <span className="text-xs font-mono text-muted-foreground/60">{entry.context}</span> : null}
                    </div>
                    <p className="text-lg leading-relaxed text-foreground font-serif italic whitespace-pre-wrap">
                      "{entry.content}"
                    </p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteNoteEntry(entry.id)}
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* AI Insights & Automated Section */}
          <section className="flex flex-col gap-6 mt-6">
             <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-foreground/80 flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.15em] bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-cyan-500">AI Capabilities</span>
                </h2>
             </div>
             <div className="paper-card p-6 !bg-[hsl(var(--card)_/_0.4)] md:col-span-2 shadow-none border-[hsl(var(--border)_/_0.3)]">
               <AIPanel item={currentItem} onSuggestTags={setSuggestedTags} />
             </div>
          </section>

        </div>

        {/* RIGHT COLUMN: Inspector Sidebar */}
        <aside className="sticky top-28 flex flex-col gap-8 w-full">
          
          <div className="flex flex-col gap-3">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-between paper-card font-medium">
                  Edit Metadata <PencilLine className="size-4 opacity-50" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] paper-card border-[hsl(var(--border)_/_0.4)] rounded-[2rem]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold tracking-tight">Edit Metadata</DialogTitle>
                  <DialogDescription>Adjust title, author, release, and raw description.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2"><Label>Title</Label><Input value={editForm.title} onChange={e => setEditForm(p => ({...p, title: e.target.value}))} /></div>
                    <div className="flex flex-col gap-2"><Label>Creator</Label><Input value={editForm.creator} onChange={e => setEditForm(p => ({...p, creator: e.target.value}))} placeholder="Author, Channel..." /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                       <Label>Content Type</Label>
                       <Select value={editForm.contentType} onValueChange={v => setEditForm(p => ({...p, contentType: v as any}))}>
                         <SelectTrigger><SelectValue/></SelectTrigger>
                         <SelectContent>
                           {CONTENT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                         </SelectContent>
                       </Select>
                    </div>
                    <div className="flex flex-col gap-2"><Label>Release Date</Label><Input type="date" value={editForm.releaseDate} onChange={e => setEditForm(p => ({...p, releaseDate: e.target.value}))} /></div>
                  </div>
                  <div className="flex flex-col gap-2"><Label>Finished Date</Label><Input type="date" value={editForm.finishedDate} onChange={e => setEditForm(p => ({...p, finishedDate: e.target.value}))} /></div>
                  <div className="flex flex-col gap-2"><Label>Cover URL</Label><Input value={editForm.coverUrl} onChange={e => setEditForm(p => ({...p, coverUrl: e.target.value}))} /></div>
                  <div className="flex flex-col gap-2"><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm(p => ({...p, description: e.target.value}))} className="min-h-[100px]" /></div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveDetails}>Save Changes</Button>
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20">
                  Delete Item <Trash2 className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-destructive font-semibold">
                  Confirm Delete...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Recommendation Tuning */}
          <div className="rounded-[24px] p-6 flex flex-col gap-5 pb-7 border border-[var(--hero-accent)]/30 bg-gradient-to-br from-[var(--hero-accent)]/15 via-[var(--hero-accent)]/5 to-transparent shadow-[0_8px_32px_-12px_var(--hero-accent)] backdrop-blur-xl relative overflow-hidden group">
            {/* Soft decorative glow */}
            <div className="absolute -top-12 -right-12 size-32 bg-[var(--hero-accent)]/20 blur-3xl rounded-full pointer-events-none transition-transform duration-700 group-hover:scale-150" />
            
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--hero-accent)] drop-shadow-sm">Tuning & Scoring</h3>
              <Button variant="outline" size="sm" onClick={() => queueScore(currentItem.id)} disabled={queueingScore} className="h-7 text-[10px] px-3 rounded-full tracking-wide bg-background/50 border-[var(--hero-accent)]/30 hover:bg-[var(--hero-accent)] hover:text-white transition-colors">
                {queueingScore ? "Scoring..." : currentItem.suggestMetricNeedsMoreInfo ? "Need More Info" : "Re-score"}
              </Button>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="flex-1 rounded-[1.2rem] bg-background/40 border border-[hsl(var(--border)_/_0.3)] p-3 text-center backdrop-blur-sm">
                 <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-1">Base</span>
                 <span className="text-xl font-bold font-mono tracking-tight">{currentItem.suggestMetricBase ?? "-"}</span>
              </div>
              <div className="flex-1 rounded-[1.2rem] bg-gradient-to-br from-[var(--hero-accent)]/20 to-[var(--hero-accent)]/5 border border-[var(--hero-accent)]/40 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm">
                 <span className="text-[10px] text-[var(--hero-accent)] uppercase tracking-widest font-semibold block mb-1 opacity-90 drop-shadow-sm">Final</span>
                 <span className="text-3xl font-bold font-mono tracking-tight text-[var(--hero-accent)] drop-shadow-sm">{currentItem.suggestMetricFinal ?? "-"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-2 relative z-10">
              <div className="flex items-center justify-between">
                <Label className="text-xs opacity-80 font-medium">Hide Suggestion</Label>
                <Button size="sm" variant={currentItem.hiddenFromRecommendations ? "default" : "outline"} className="h-7 text-xs rounded-full bg-background/50 border-transparent shadow-sm" onClick={() => updateItem({ id: currentItem.id, hiddenFromRecommendations: !currentItem.hiddenFromRecommendations })}>
                  {currentItem.hiddenFromRecommendations ? "Hidden" : "Shown"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs opacity-80 font-medium">Trending +100</Label>
                <Button size="sm" variant={currentItem.trendingBoostEnabled ? "secondary" : "outline"} className={`h-7 text-xs rounded-full shadow-sm ${currentItem.trendingBoostEnabled ? 'bg-[var(--hero-accent)] text-white hover:bg-[var(--hero-accent)]/90' : 'bg-background/50 border-transparent'}`} onClick={() => updateItem({ id: currentItem.id, trendingBoostEnabled: !currentItem.trendingBoostEnabled })}>
                  {currentItem.trendingBoostEnabled ? "Active" : "Off"}
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-xs opacity-80 font-medium mb-1">Manual Boost</Label>
                <div className="flex rounded-full overflow-hidden border border-[hsl(var(--border)_/_0.3)] shadow-sm bg-background/30 backdrop-blur-sm p-0.5">
                  {[0, 50, 100, 200].map(val => (
                    <button key={val} className={`flex-1 h-7 text-xs font-semibold rounded-full transition-colors ${currentItem.manualBoost === val ? 'bg-[var(--hero-accent)] text-white shadow-md' : 'text-foreground/70 hover:bg-background/50'}`} onClick={() => updateItem({ id: currentItem.id, manualBoost: val })}>
                      {val === 0 ? '0' : `+${val}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {currentItem.suggestMetricReason ? (
              <div className="mt-2 text-xs leading-5 text-foreground/80 bg-background/50 backdrop-blur-md rounded-[1.2rem] p-4 border border-[hsl(var(--border)_/_0.3)] relative z-10 shadow-sm">
                <strong className="block mb-1 text-[var(--hero-accent)] font-semibold">AI Insight:</strong>
                {currentItem.suggestMetricReason}
              </div>
            ) : null}
          </div>

          {/* Tags Widget */}
          <div className="soft-panel rounded-3xl p-5 flex flex-col gap-4 shadow-none">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center justify-between">
              Tags
            </h3>
            <div className="-mx-2 -my-1">
              <InlineTagManager itemId={currentItem.id} suggestedTags={suggestedTags} onSuggestionsApplied={() => setSuggestedTags(null)} />
            </div>
          </div>

          {/* Lists Widget */}
          <div className="soft-panel rounded-3xl p-5 flex flex-col gap-4 shadow-none">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center justify-between">
              Lists <Badge variant="outline" className="text-[10px] scale-90">{currentLists.length}</Badge>
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentLists.length > 0 ? currentLists.map(list => (
                 <button
                   key={list.id}
                   type="button"
                   onClick={() => removeItemFromList({ itemId: currentItem.id, listId: list.id })}
                   disabled={removingFromList}
                   className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border)_/_0.6)] bg-card/50 px-3 py-1.5 text-[0.8rem] font-medium text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors group"
                 >
                   <span className="size-2 rounded-full group-hover:hidden" style={{ backgroundColor: list.color }} />
                   <Trash2 className="size-3 hidden group-hover:block" />
                   {list.name}
                 </button>
              )) : <span className="text-xs text-muted-foreground/60 italic">No lists</span>}
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
               {addableLists.length > 0 ? (
                <div className="flex gap-2">
                  <Select value={listToAdd} onValueChange={setListToAdd}>
                    <SelectTrigger className="h-8 bg-card/40 rounded-full border-[hsl(var(--border)_/_0.6)]"><SelectValue placeholder="Add to existing..." /></SelectTrigger>
                    <SelectContent>
                      {addableLists.map((list) => <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="rounded-full h-8" disabled={!listToAdd || addingToList} onClick={() => addItemToList({ itemId: currentItem.id, listId: listToAdd })}>Add</Button>
                </div>
               ) : null}
               <div className="flex gap-2">
                  <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New list name" className="h-8 rounded-full bg-card/40 text-xs border-[hsl(var(--border)_/_0.6)]" />
                  <Button variant="outline" size="sm" onClick={handleCreateListAndAdd} disabled={creatingList || !newListName.trim()} className="rounded-full h-8">Create</Button>
               </div>
            </div>
          </div>

          {/* Metadata Snapshot */}
          <div className="flex flex-col px-4 gap-2 text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
            {currentItem.durationMins ? <span>{currentItem.durationMins} minutes long</span> : null}
            <span>Added {new Date(currentItem.createdAt).toLocaleDateString()}</span>
            {currentItem.startedAt ? <span>Started {new Date(currentItem.startedAt).toLocaleDateString()}</span> : null}
            {currentItem.finishedAt ? <span>Finished {new Date(currentItem.finishedAt).toLocaleDateString()}</span> : null}
            {currentItem.sourceUrl ? (
              <a href={currentItem.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary mt-1">
                Source Link <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>

        </aside>
      </div>
    </div>
  );
}

function getProgressMeta(item: any) {
  if (item.contentType === "book") return { currentLabel: "Current page", totalLabel: "Total pages", summaryLabel: "Reading Position" };
  if (item.contentType === "article") return { currentLabel: "Mins read", totalLabel: "Total mins", summaryLabel: "Reading Position" };
  if (item.contentType === "tv") return { currentLabel: "Episodes seen", totalLabel: "Total episodes", summaryLabel: "Watch Position" };
  return { currentLabel: "Current", totalLabel: "Total", summaryLabel: "Media Tracking" };
}
