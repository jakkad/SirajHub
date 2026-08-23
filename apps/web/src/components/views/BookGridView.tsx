import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen, BookOpenCheck, RefreshCw } from "lucide-react";

import { useBookPageCountStatus, useLookupBookPageCounts } from "../../hooks/useItems";
import type { Item } from "../../lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SelectionOverlay } from "./SelectionOverlay";
import type { SelectionProps } from "./TypePageLayout";

interface BookGridViewProps {
  items: Item[];
  selectionProps?: SelectionProps;
}

function idToGradient(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) | 0;
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, oklch(38% 0.1 ${hue}), oklch(22% 0.06 ${(hue + 45) % 360}))`;
}

function BookCard({ item, selectionProps }: { item: Item; selectionProps?: SelectionProps }) {
  return (
    <Link
      to="/item/$id"
      params={{ id: item.id }}
      aria-label={item.title}
      title={item.title}
      className="group block rounded-lg outline-none transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted"
        style={item.coverUrl ? undefined : { background: idToGradient(item.id) }}
      >
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
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-white/75" aria-hidden="true">
            <BookOpen className="size-10 drop-shadow-sm" strokeWidth={1.4} />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-2.5 pb-2.5 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <p dir="auto" className="line-clamp-2 text-start text-[11px] font-bold leading-[1.3] text-white">
            {item.title}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function BookGridView({ items, selectionProps }: BookGridViewProps) {
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

      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}
      >
        {items.map((item) => (
          <BookCard key={item.id} item={item} selectionProps={selectionProps} />
        ))}
      </div>
    </div>
  );
}
