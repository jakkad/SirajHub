import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen, BookOpenCheck, RefreshCw } from "lucide-react";

import { useBookPageCountStatus, useLookupBookPageCounts } from "../../hooks/useItems";
import type { Item } from "../../lib/api";
import { STATUSES, type StatusId } from "../../lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SelectionOverlay } from "./SelectionOverlay";
import type { SelectionProps } from "./TypePageLayout";

interface BookGridViewProps {
  items: Item[];
  selectionProps?: SelectionProps;
}

function BookCard({ item, selectionProps }: { item: Item; selectionProps?: SelectionProps }) {
  return (
    <Link
      to="/item/$id"
      params={{ id: item.id }}
      className="group rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full overflow-hidden rounded-[18px] transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-1 group-hover:border-[hsl(var(--border-strong))] group-hover:shadow-[var(--shadow-soft)]">
        <CardContent className="p-0">
          <div className="relative aspect-[2/3] overflow-hidden bg-muted">
            {selectionProps?.isSelectionMode ? (
              <SelectionOverlay
                isSelected={selectionProps.selectedIds.has(item.id)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectionProps.toggleSelection(item.id);
                }}
              />
            ) : null}

            {item.coverUrl ? (
              <img
                src={item.coverUrl}
                alt={item.title}
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground" aria-hidden="true">
                <BookOpen className="size-12" strokeWidth={1.35} />
              </div>
            )}
          </div>
        </CardContent>
        <CardHeader className="p-3">
          <CardTitle
            className="line-clamp-2 min-h-10 font-sans text-sm leading-5 tracking-normal"
            title={item.title}
          >
            {item.title}
          </CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
}

export function BookGridView({ items, selectionProps }: BookGridViewProps) {
  const [activeShelf, setActiveShelf] = useState<StatusId>("finished");
  const queryClient = useQueryClient();
  const previousCompleted = useRef(0);
  const { mutate: lookupPages, data: lookupResult, isPending: lookupPending } = useLookupBookPageCounts();
  const { data: lookupStatus } = useBookPageCountStatus(items.length > 0);
  const missingCount = items.filter((item) => item.pageCount == null).length;
  const selectedBookIds = selectionProps
    ? [...selectionProps.selectedIds].filter((id) => items.some((item) => item.id === id))
    : [];
  const workRemaining = (lookupStatus?.queuedCount ?? 0) + (lookupStatus?.processingCount ?? 0);

  useEffect(() => {
    const completed = lookupStatus?.completedCount ?? 0;
    if (completed > previousCompleted.current) queryClient.invalidateQueries({ queryKey: ["items"] });
    previousCompleted.current = completed;
  }, [lookupStatus?.completedCount, queryClient]);

  const shelves = useMemo(() => STATUSES
    .filter((status) => status.id !== "archived" || items.some((item) => item.status === "archived"))
    .map((status) => ({
      status,
      items: items.filter((item) => item.status === status.id),
    })), [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed p-10 text-center text-sm text-muted-foreground">
        No books to show.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-[18px] border bg-card/65 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <BookOpenCheck className="mr-1 size-3.5" />
            {missingCount} page count{missingCount === 1 ? "" : "s"} missing
          </Badge>
          {workRemaining > 0 ? (
            <span className="text-xs text-muted-foreground">
              {workRemaining} lookup job{workRemaining === 1 ? "" : "s"} active
            </span>
          ) : null}
          {lookupResult ? (
            <span className="text-xs text-muted-foreground">
              {lookupResult.queuedCount} queued · {lookupResult.alreadyKnownCount} already known · {lookupResult.skippedCount} skipped
            </span>
          ) : null}
          {lookupStatus && lookupStatus.failedCount > 0 ? (
            <span className="text-xs text-destructive">{lookupStatus.failedCount} failed</span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {selectionProps?.isSelectionMode ? (
            <Button
              variant="outline"
              size="sm"
              disabled={selectedBookIds.length === 0 || lookupPending}
              onClick={() => lookupPages(selectedBookIds)}
            >
              <RefreshCw data-icon="inline-start" className={cn(lookupPending && "animate-spin")} />
              Check selected
            </Button>
          ) : null}
          <Button
            size="sm"
            disabled={missingCount === 0 || lookupPending}
            onClick={() => lookupPages(undefined)}
          >
            <RefreshCw data-icon="inline-start" className={cn(lookupPending && "animate-spin")} />
            Check missing
          </Button>
        </div>
      </div>

      <Tabs value={activeShelf} onValueChange={(value) => setActiveShelf(value as StatusId)} className="w-full">
        <TabsList aria-label="Book status" className="h-auto max-w-full justify-start overflow-x-auto">
          {shelves.map(({ status, items: shelfItems }) => (
            <TabsTrigger key={status.id} value={status.id}>
              {status.label}
              <span className="ml-2 text-xs tabular-nums text-muted-foreground">{shelfItems.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {shelves.map(({ status, items: shelfItems }) => (
          <TabsContent key={status.id} value={status.id} className="mt-6">
            {shelfItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {shelfItems.map((item) => (
                  <BookCard key={item.id} item={item} selectionProps={selectionProps} />
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed p-10 text-center text-sm text-muted-foreground">
                No {status.label.toLowerCase()} books.
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
