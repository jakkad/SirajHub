import { useState } from "react";
import { useCreateSavedView, useDeleteSavedView, useItems, useSavedViews } from "../../hooks/useItems";
import { summarizeSavedViewFilters, matchesSavedViewFilters } from "../../lib/saved-views";
import type { ContentTypeId, StatusId } from "../../lib/constants";
import { STATUSES } from "../../lib/constants";
import type { Item, SavedViewFilters } from "../../lib/api";
import { NextToConsume } from "../dashboard/NextToConsume";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export function TypePageLayout({ contentType, title, color, children }: TypePageLayoutProps) {
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
      {
        name,
        scope: "collection",
        contentType,
        filters: effectiveFilters,
      },
      {
        onSuccess: () => setViewName(""),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <h1 className="text-[2.75rem] font-semibold leading-none tracking-[-0.05em]" style={{ color }}>{title}</h1>
          <Badge variant="outline">{allItems.length} saved</Badge>
        </div>

        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusId | "all")}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Filter by status
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-card/80 text-muted-foreground">
                  {filtered.length} shown
                </Badge>
                <Button
                  type="button"
                  variant={smartViewsOpen ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSmartViewsOpen((current) => !current)}
                >
                  {smartViewsOpen ? "Hide smart views" : "Smart views"}
                </Button>
              </div>
            </div>

            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-[24px] border border-[hsl(var(--border))] bg-card/80 p-2 shadow-none">
              {STATUS_FILTERS.map((sf) => {
                const count = countByStatus(sf.id);
                if (sf.id !== "all" && count === 0) return null;
                return (
                  <TabsTrigger
                    key={sf.id}
                    value={sf.id}
                    className="rounded-[18px] border border-transparent bg-transparent px-4 py-2.5 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-[hsl(var(--border))] data-[state=active]:bg-[hsl(var(--secondary))] data-[state=active]:text-foreground"
                  >
                    <span>{sf.label}</span>
                    <span className="ml-2 rounded-full bg-card/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </Tabs>

        {smartViewsOpen ? (
          <div className="grid gap-3 rounded-[24px] border border-[hsl(var(--border))] bg-card/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Smart views</p>
                <p className="mt-1 text-sm text-muted-foreground">Save reusable slices of this collection and jump back into them later.</p>
              </div>
              <Badge variant="secondary">{summarizeSavedViewFilters(effectiveFilters)}</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={activeViewId === null ? "secondary" : "outline"} onClick={() => setActiveViewId(null)}>
                All items
              </Button>
              {savedViews.map((view) => (
                <div key={view.id} className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.25)] px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setActiveViewId((current) => (current === view.id ? null : view.id))}
                    className={`rounded-full px-2 py-1 text-sm ${activeViewId === view.id ? "bg-card font-semibold text-foreground" : "text-muted-foreground"}`}
                  >
                    {view.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSavedView(view.id)}
                    className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>

            {!activeView ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="flex flex-col gap-2">
                  <Label>Search text</Label>
                  <Input
                    value={draftFilters.query ?? ""}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, query: e.target.value || undefined }))}
                    placeholder="Creator, title, description"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Minimum score</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1150"
                    value={draftFilters.minScore?.toString() ?? ""}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        minScore: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
                      }))
                    }
                    placeholder="e.g. 700"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Max duration (mins)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={draftFilters.maxDuration?.toString() ?? ""}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        maxDuration: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
                      }))
                    }
                    placeholder="e.g. 30"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Trending only</Label>
                  <Button
                    type="button"
                    variant={draftFilters.onlyTrending ? "secondary" : "outline"}
                    onClick={() => setDraftFilters((prev) => ({ ...prev, onlyTrending: !prev.onlyTrending || undefined }))}
                  >
                    {draftFilters.onlyTrending ? "Trending only" : "Include all"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder={`Save current ${title.toLowerCase()} filter as a smart view`}
              />
              <Button type="button" onClick={handleSaveCurrentView} disabled={savingView || !viewName.trim()}>
                {savingView ? "Saving…" : "Save current view"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-8 p-6">
          {!isLoading ? (
            <div className="border-b border-[hsl(var(--border))] pb-6">
              <NextToConsume
                contentType={contentType}
                title={`${title} Next To Consume`}
                description={`Top suggestion scores for your ${title.toLowerCase()} queue.`}
              />
            </div>
          ) : null}

          {isLoading ? <Skeleton className="h-48 w-full" /> : children(filtered)}
        </CardContent>
      </Card>
    </div>
  );
}
