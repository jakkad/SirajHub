import { BookOpenCheck, Layers3, ListTree, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Item } from "../../lib/api";
import { STATUSES, type StatusId } from "../../lib/constants";
import { finishedRatingGroups } from "../../lib/bookshelf-layout";
import { useBookPageCountStatus, useLookupBookPageCounts } from "../../hooks/useItems";
import type { SelectionProps } from "./TypePageLayout";
import { BookShelfScene } from "./bookshelf/BookShelfScene";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BookshelfViewProps {
  items: Item[];
  selectionProps?: SelectionProps;
}

const SECTION_COPY: Record<StatusId, { kicker: string; description: string }> = {
  suggestions: { kicker: "Discover", description: "Cool light for books still calling from the horizon." },
  in_progress: { kicker: "Reading now", description: "Warm amber shelves with progress glowing along each spine." },
  finished: { kicker: "The library", description: "A walnut-and-cream record of books you have completed." },
  archived: { kicker: "Quiet stacks", description: "A subdued home for books kept out of the active rotation." },
};

export function BookshelfView({ items, selectionProps }: BookshelfViewProps) {
  const [groupFinished, setGroupFinished] = useState(true);
  const queryClient = useQueryClient();
  const previousCompleted = useRef(0);
  const { mutate: lookupPages, data: lookupResult, isPending: lookupPending } = useLookupBookPageCounts();
  const { data: lookupStatus } = useBookPageCountStatus(items.length > 0);
  const missingCount = items.filter((item) => item.pageCount == null).length;
  const selectedBookIds = selectionProps ? [...selectionProps.selectedIds].filter((id) => items.some((item) => item.id === id)) : [];
  const workRemaining = (lookupStatus?.queuedCount ?? 0) + (lookupStatus?.processingCount ?? 0);

  useEffect(() => {
    const completed = lookupStatus?.completedCount ?? 0;
    if (completed > previousCompleted.current) queryClient.invalidateQueries({ queryKey: ["items"] });
    previousCompleted.current = completed;
  }, [lookupStatus?.completedCount, queryClient]);

  const sections = useMemo(() => STATUSES.map((status) => ({
    status,
    items: items.filter((item) => item.status === status.id),
  })).filter((section) => section.items.length > 0), [items]);

  if (items.length === 0) {
    return <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">No books saved yet.</div>;
  }

  return (
    <div className="grid gap-14">
      <div className="flex flex-col gap-4 rounded-[24px] border border-[hsl(var(--border))] bg-card/65 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary"><BookOpenCheck className="mr-1 size-3.5" /> Page counts</Badge>
            <span className="text-sm font-semibold text-foreground">{missingCount} missing</span>
            {workRemaining ? <span className="text-xs text-muted-foreground">{workRemaining} lookup job{workRemaining === 1 ? "" : "s"} active</span> : null}
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Page counts set each book’s physical thickness. Missing counts use a balanced midpoint.</p>
          {lookupResult ? <p className="mt-1 text-xs text-muted-foreground">Queued {lookupResult.queuedCount}; {lookupResult.alreadyKnownCount} already known; {lookupResult.skippedCount} skipped.</p> : null}
          {lookupStatus && (lookupStatus.completedCount > 0 || lookupStatus.failedCount > 0) ? (
            <p className="mt-1 text-xs text-muted-foreground">{lookupStatus.completedCount} completed · {lookupStatus.failedCount} failed</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {selectionProps?.isSelectionMode ? (
            <Button variant="outline" disabled={!selectedBookIds.length || lookupPending} onClick={() => lookupPages(selectedBookIds)}>
              <RefreshCw className={`mr-2 size-4 ${lookupPending ? "animate-spin" : ""}`} /> Check selected
            </Button>
          ) : null}
          <Button disabled={!missingCount || lookupPending} onClick={() => lookupPages(undefined)}>
            <RefreshCw className={`mr-2 size-4 ${lookupPending ? "animate-spin" : ""}`} /> Check all missing
          </Button>
        </div>
      </div>

      {sections.map(({ status, items: sectionItems }) => {
        const isFinished = status.id === "finished";
        const sorted = [...sectionItems].sort((a, b) => isFinished ? (b.finishedAt ?? b.updatedAt) - (a.finishedAt ?? a.updatedAt) : (a.position ?? 0) - (b.position ?? 0));
        const groups = isFinished && groupFinished ? finishedRatingGroups(sorted) : [{ label: isFinished ? "Recently finished" : status.label, items: sorted }];
        const copy = SECTION_COPY[status.id];
        return (
          <section key={status.id} className="grid gap-5" aria-labelledby={`shelf-${status.id}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{copy.kicker}</p>
                <h2 id={`shelf-${status.id}`} className="mt-1 font-serif text-3xl font-semibold tracking-tight">{status.label} <span className="text-base font-sans font-normal text-muted-foreground">({sectionItems.length})</span></h2>
                <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
              </div>
              {isFinished ? (
                <div className="flex rounded-xl border bg-card p-1" aria-label="Finished shelf grouping">
                  <Button size="sm" variant={groupFinished ? "secondary" : "ghost"} onClick={() => setGroupFinished(true)}><ListTree className="mr-1.5 size-4" /> By rating</Button>
                  <Button size="sm" variant={!groupFinished ? "secondary" : "ghost"} onClick={() => setGroupFinished(false)}><Layers3 className="mr-1.5 size-4" /> Combined</Button>
                </div>
              ) : null}
            </div>
            <BookShelfScene groups={groups} tone={status.id} selectionProps={selectionProps} />
          </section>
        );
      })}
    </div>
  );
}
