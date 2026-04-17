import { useState } from "react";
import { useCreateSavedView, useDeleteSavedView, useItems, useSavedViews } from "../../hooks/useItems";
import { summarizeSavedViewFilters, matchesSavedViewFilters } from "../../lib/saved-views";
import type { ContentTypeId, StatusId } from "../../lib/constants";
import { STATUSES } from "../../lib/constants";
import type { Item, SavedViewFilters } from "../../lib/api";
import { NextToConsume } from "../dashboard/NextToConsume";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, Bookmark, X, Search } from "lucide-react";

interface TypePageLayoutProps {
  contentType: ContentTypeId;
  title: string;
  color: string;
  children: (items: Item[]) => React.ReactNode;
}

const STATUS_FILTERS: Array<{ id: StatusId | "all"; label: string }> = [
  { id: "all", label: "All" },
  ...STATUSES.map((s) => ({ id: s.id, label: s.label })),
];

function getThemeAccent(typeId: string) {
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

export function TypePageLayout({ contentType, title, children }: TypePageLayoutProps) {
  const accentColor = getThemeAccent(contentType);
  
  const [statusFilter, setStatusFilter] = useState<StatusId | "all">("all");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [viewName, setViewName] = useState("");
  const [draftFilters, setDraftFilters] = useState<SavedViewFilters>({});
  const [smartViewsOpen, setSmartViewsOpen] = useState(false);
  const { data: allItems = [], isLoading } = useItems({ content_type: contentType });
  const { data: savedViewsData } = useSavedViews({ scope: "collection", content_type: contentType });
  const { mutate: createSavedView, isPending: savingView } = useCreateSavedView();
  const { mutate: deleteSavedView } = useDeleteSavedView();

  const savedViews = savedViewsData?.views ?? [];
  const activeView = savedViews.find((view) => view.id === activeViewId) ?? null;
  const activeStatus = activeView?.filters.status ?? statusFilter;
  const effectiveFilters = activeView
    ? activeView.filters
    : {
        ...draftFilters,
        ...(statusFilter === "all" ? {} : { status: statusFilter }),
        contentType,
      };

  const filtered = allItems.filter((item) => {
    if (activeStatus !== "all" && item.status !== activeStatus) return false;
    return matchesSavedViewFilters(item, effectiveFilters);
  });

  const countByStatus = (id: StatusId | "all") =>
    id === "all" ? allItems.length : allItems.filter((i) => i.status === id).length;

  function handleSaveCurrentView() {
    const name = viewName.trim();
    if (!name) return;
    createSavedView(
      { name, scope: "collection", contentType, filters: effectiveFilters },
      { onSuccess: () => setViewName("") }
    );
  }

  return (
    <div className="flex flex-col gap-10 pb-20 w-full" style={{ '--hero-accent': accentColor } as React.CSSProperties}>
      
      {/* ─── RADIANT HERO HEADER ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] border-0 ring-1 ring-[hsl(var(--border)_/_0.6)] paper-card p-6 md:p-10 !bg-[hsl(var(--background)_/_0.8)] shadow-lg group w-full">
        <div className="absolute -top-32 -right-10 size-96 bg-[var(--hero-accent)]/15 blur-3xl rounded-full pointer-events-none transition-transform duration-1000 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-[var(--hero-accent)]/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-8 w-full">
          {/* Top Title Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 w-full">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-[var(--hero-accent)]/10 text-[var(--hero-accent)] border-[var(--hero-accent)]/20 px-3 py-1 text-xs backdrop-blur font-bold tracking-wide uppercase">
                  {allItems.length} Saved
                </Badge>
                <span className="text-xs text-muted-foreground/80 font-mono">{filtered.length} currently shown</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
                {title}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {smartViewsOpen && activeViewId === null && (
                 <Badge variant="secondary" className="bg-card/70 backdrop-blur border-[hsl(var(--border)_/_0.4)]">
                   {summarizeSavedViewFilters(effectiveFilters) || "No filters"}
                 </Badge>
              )}
              <Button
                variant={smartViewsOpen ? "default" : "outline"}
                className={`rounded-full shadow-sm transition-all h-9 px-4 ${smartViewsOpen ? 'bg-[var(--hero-accent)] text-white border-transparent' : 'bg-card/50 backdrop-blur-md hover:bg-[var(--hero-accent)]/10 hover:text-[var(--hero-accent)] border-[hsl(var(--border)_/_0.6)]'}`}
                onClick={() => setSmartViewsOpen((c) => !c)}
              >
                <Filter className="mr-2 size-4" />
                {smartViewsOpen ? "Close Filters" : "Smart Views & Filters"}
              </Button>
            </div>
          </div>

          {/* Inline Status Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full pt-2">
            {STATUS_FILTERS.map((sf) => {
              const count = countByStatus(sf.id);
              if (sf.id !== "all" && count === 0) return null;
              const isActive = statusFilter === sf.id && activeViewId === null;
              
              return (
                <button
                  key={sf.id}
                  onClick={() => { setActiveViewId(null); setStatusFilter(sf.id as StatusId | "all"); }}
                  className={`relative flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300 text-sm font-semibold border ${
                    isActive 
                      ? "bg-[var(--hero-accent)]/15 border-[var(--hero-accent)]/40 text-[var(--hero-accent)] shadow-sm"
                      : "bg-[hsl(var(--card)_/_0.4)] border-[hsl(var(--border)_/_0.5)] text-foreground/70 hover:bg-[hsl(var(--card)_/_0.8)] hover:text-foreground backdrop-blur-sm"
                  }`}
                >
                  <span>{sf.label}</span>
                  <span className={`flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] ${isActive ? "bg-[var(--hero-accent)] text-white" : "bg-background/80 text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Smart Views Details Dropdown */}
          {smartViewsOpen ? (
            <div className="rounded-3xl border border-[hsl(var(--border)_/_0.5)] bg-[hsl(var(--card)_/_0.6)] backdrop-blur-xl p-6 mt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] animate-in slide-in-from-top-4 fade-in-0 duration-300 w-full">
              <div className="flex flex-col gap-6">
                
                {/* Saved Views Pills */}
                {savedViews.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mr-2 border-r border-[hsl(var(--border)_/_0.6)] pr-4 py-1">Saved Views</span>
                    <Button variant={activeViewId === null ? "secondary" : "outline"} onClick={() => setActiveViewId(null)} className="h-8 rounded-full text-xs">All items</Button>
                    {savedViews.map((view) => (
                      <div key={view.id} className="flex items-center bg-background/50 rounded-full border border-[hsl(var(--border)_/_0.5)] p-0.5">
                        <button
                          type="button"
                          onClick={() => setActiveViewId((current) => (current === view.id ? null : view.id))}
                          className={`flex items-center gap-1.5 h-7 rounded-full pl-3 pr-2 text-xs font-semibold transition-colors ${activeViewId === view.id ? "bg-[var(--hero-accent)] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <Bookmark className="size-3" /> {view.name}
                        </button>
                        <button type="button" onClick={() => deleteSavedView(view.id)} className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Filter Form (Only shows if no active saved view is locked in) */}
                {!activeView ? (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 bg-background/30 rounded-2xl p-5 border border-[hsl(var(--border)_/_0.4)]">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground/60" />
                        <Input value={draftFilters.query ?? ""} onChange={(e) => setDraftFilters((prev) => ({ ...prev, query: e.target.value || undefined }))} placeholder="Title or creator..." className="pl-9 h-9 bg-card/50 rounded-xl" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground">Min Score</Label>
                      <Input type="number" min="0" value={draftFilters.minScore?.toString() ?? ""} onChange={(e) => setDraftFilters((p) => ({ ...p, minScore: e.target.value ? Number.parseInt(e.target.value, 10) : undefined }))} placeholder="700" className="h-9 bg-card/50 rounded-xl" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground">Max Duration (m)</Label>
                      <Input type="number" min="0" value={draftFilters.maxDuration?.toString() ?? ""} onChange={(e) => setDraftFilters((p) => ({ ...p, maxDuration: e.target.value ? Number.parseInt(e.target.value, 10) : undefined }))} placeholder="120" className="h-9 bg-card/50 rounded-xl" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground">Trending</Label>
                      <Button variant={draftFilters.onlyTrending ? "default" : "outline"} onClick={() => setDraftFilters((p) => ({ ...p, onlyTrending: !p.onlyTrending || undefined }))} className={`h-9 rounded-xl ${draftFilters.onlyTrending ? 'bg-[var(--hero-accent)] text-white' : 'bg-card/50'}`}>
                        {draftFilters.onlyTrending ? "Trending Only" : "Include All"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Save View Action */}
                <div className="flex items-center gap-3 bg-[var(--hero-accent)]/5 border border-[var(--hero-accent)]/20 rounded-full p-1.5 md:w-fit">
                  <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder={`Save as new smart view...`} className="border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-foreground/40 w-full md:w-[250px]" />
                  <Button onClick={handleSaveCurrentView} disabled={savingView || !viewName.trim()} className="rounded-full shadow-sm bg-[var(--hero-accent)] hover:bg-[var(--hero-accent)]/90 text-white">
                    {savingView ? "Saving…" : "Save View"}
                  </Button>
                </div>

              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── MAIN CONTENT BODY ─── */}
      <div className="flex flex-col gap-12 w-full">
        {!isLoading ? (
          <div className="pb-6">
            <NextToConsume
              contentType={contentType}
              title={`${title} Next To Consume`}
              description={`Top suggestion scores for your ${title.toLowerCase()} queue.`}
            />
          </div>
        ) : null}

        <div className="w-full">
          {isLoading ? (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
               {Array.from({length: 12}).map((_, i) => <Skeleton key={i} className="aspect-[2/3] w-full rounded-[1.25rem] bg-card/40" />)}
             </div>
          ) : (
            children(filtered)
          )}
        </div>
      </div>
      
    </div>
  );
}
