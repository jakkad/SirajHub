import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { useItems } from "../hooks/useItems";
import { CONTENT_TYPES } from "../lib/constants";
import type { Item } from "../lib/api";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (item: Item) => void;
}

export function SearchCommand({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: allItems = [] } = useItems();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const results =
      q.length < 1
        ? []
        : allItems
            .filter(
              (item) =>
                item.title.toLowerCase().includes(q) ||
                (item.creator ?? "").toLowerCase().includes(q) ||
                (item.description ?? "").toLowerCase().includes(q)
            )
            .slice(0, 20);

    const byType: Record<string, Item[]> = {};
    for (const item of results) {
      if (!byType[item.contentType]) byType[item.contentType] = [];
      byType[item.contentType]!.push(item);
    }
    return { q, results, byType };
  }, [query, allItems]);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b-2 border-[hsl(var(--border-strong))] px-6 py-5">
          <DialogTitle>Search the library</DialogTitle>
          <DialogDescription>
            Jump to titles, creators, or descriptions across your saved items.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b-2 border-[hsl(var(--border-strong))] px-6 py-5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${allItems.length} items`}
              className="pl-12 pr-12"
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full border-2 border-[hsl(var(--border-strong))] bg-card p-1"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <ScrollArea className="max-h-[62vh] px-2 py-3">
          {grouped.q.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              Start typing to search your collection.
            </div>
          ) : null}

          {grouped.q.length > 0 && grouped.results.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              No results for "{query}".
            </div>
          ) : null}

          {Object.entries(grouped.byType).map(([type, items]) => {
            const ct = CONTENT_TYPES.find((t) => t.id === type);
            return (
              <div key={type} className="mb-5 last:mb-0">
                <div className="px-4 pb-2">
                  <Badge variant="outline" style={ct ? { color: ct.color } : undefined}>
                    {ct?.label ?? type}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2 px-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelect(item);
                        onClose();
                      }}
                      className="flex items-center gap-4 rounded-[24px] border-2 border-[hsl(var(--border-strong))] bg-card px-4 py-3 text-left shadow-[4px_4px_0_hsl(var(--shadow-ink))] transition-transform hover:-translate-y-0.5"
                    >
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border-2 border-[hsl(var(--border-strong))] bg-secondary">
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-display text-2xl">{ct?.icon ?? "📄"}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-foreground">{item.title}</div>
                        {item.creator ? <div className="truncate text-sm text-muted-foreground">{item.creator}</div> : null}
                      </div>
                      <Badge variant="outline">{item.status.replace("_", " ")}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
