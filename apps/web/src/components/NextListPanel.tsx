import { Sparkles } from "lucide-react";
import { useState } from "react";

import { useItems } from "../hooks/useItems";
import { useNextList, useRefreshNextList } from "../hooks/useAI";
import { CONTENT_TYPES } from "../lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function NextListPanel() {
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useItems();
  const suggestionsCount = items.filter((i) => i.status === "suggestions").length;
  const { data, isFetching, error, refetch } = useNextList();
  const { mutate: refresh, isPending: refreshing } = useRefreshNextList();

  const ranked = data?.result ?? [];
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));

  function handleOpen() {
    setOpen(true);
    if (!data) refetch();
  }

  return (
    <>
      <Button onClick={handleOpen} variant="outline" className="gap-2">
        <Sparkles data-icon="inline-start" />
        Next To Consume
        <Badge variant="secondary" className="ml-1">
          {suggestionsCount}
        </Badge>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Next To Consume</DialogTitle>
            <DialogDescription>AI-ranked from the items sitting in Suggestions.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline">{suggestionsCount} queued</Badge>
            <Button variant="outline" onClick={() => refresh()} disabled={refreshing || isFetching}>
              {refreshing || isFetching ? "Ranking…" : "Refresh"}
            </Button>
          </div>

          {(isFetching || refreshing) && ranked.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Asking the AI to rank your queue…</div>
          ) : null}

          {error ? <div className="text-sm text-destructive">{(error as Error).message}</div> : null}
          {suggestionsCount === 0 && !isFetching ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No items in Suggestions yet.</div>
          ) : null}

          {ranked.length > 0 ? (
            <ol className="flex list-none flex-col gap-3 p-0">
              {[...ranked]
                .sort((a, b) => a.rank - b.rank)
                .map((entry) => {
                  const item = itemById[entry.id];
                  if (!item) return null;
                  const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);
                  return (
                    <li
                      key={entry.id}
                      className="flex items-start gap-4 rounded-[24px] border-2 border-[hsl(var(--border-strong))] bg-card p-4 shadow-[4px_4px_0_hsl(var(--shadow-ink))]"
                    >
                      <div className="font-display text-3xl text-primary">#{entry.rank}</div>
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border-2 border-[hsl(var(--border-strong))] bg-secondary">
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-display text-2xl">{ct?.icon ?? "📄"}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-semibold text-foreground">{item.title}</div>
                        {item.creator ? <div className="text-sm text-muted-foreground">{item.creator}</div> : null}
                        <p className="mt-2 text-sm italic text-muted-foreground">{entry.reason}</p>
                      </div>
                    </li>
                  );
                })}
            </ol>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
