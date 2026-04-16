import { Sparkles } from "lucide-react";
import { useState } from "react";

import { useItems } from "../hooks/useItems";
import { useNextList, useRefreshNextList } from "../hooks/useAI";
import { CONTENT_TYPES } from "../lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface NextListPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function NextListPanel({ open: controlledOpen, onOpenChange, showTrigger = true }: NextListPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { data: items = [] } = useItems();
  const suggestionsCount = items.filter((i) => i.status === "suggestions").length;
  const { data, isFetching, error } = useNextList();
  const { mutate: refresh, isPending: refreshing } = useRefreshNextList();
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const ranked = data?.result ?? [];
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));

  return (
    <>
      {showTrigger ? (
        <Button onClick={() => setOpen(true)} variant="outline" className="gap-2 bg-card/90">
          <Sparkles data-icon="inline-start" />
          Next To Consume
          <Badge variant="secondary" className="ml-1">
            {suggestionsCount}
          </Badge>
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Next To Consume</DialogTitle>
            <DialogDescription>Scored from your interest profiles, then boosted by freshness and trending.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline">{suggestionsCount} queued</Badge>
            <Button variant="outline" onClick={() => refresh()} disabled={refreshing || isFetching}>
              {refreshing || isFetching ? "Queueing…" : ranked.length > 0 ? "Refresh scores" : "Queue scoring"}
            </Button>
          </div>

          {data?.job ? (
            <div className="text-sm text-muted-foreground">
              {data.job.status === "queued" ? `Queued for ${new Date(data.job.runAfter).toLocaleString()}.` : null}
              {data.job.status === "processing" ? "Queue job is processing now." : null}
              {data.job.status === "failed" ? `Last queue attempt failed: ${data.job.lastError ?? "Unknown error"}` : null}
              {data.job.status === "completed" && data.savedAt ? `Latest score refresh completed ${new Date(data.savedAt).toLocaleString()}.` : null}
            </div>
          ) : null}

          {error ? <div className="text-sm text-destructive">{(error as Error).message}</div> : null}
          {suggestionsCount === 0 && !isFetching ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No items in Suggestions yet.</div>
          ) : null}

          {ranked.length > 0 ? (
            <ol className="flex list-none flex-col gap-3 p-0">
              {ranked.map((entry) => {
                  const item = itemById[entry.id];
                  if (!item) return null;
                  const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);
                  return (
                    <li
                      key={entry.id}
                      className="flex items-start gap-4 rounded-[24px] border border-[hsl(var(--border))] bg-card p-4 shadow-[var(--shadow-subtle)]"
                    >
                      <div className="flex min-h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 px-2 text-primary">
                        <span className="text-base font-semibold">{entry.score ?? "…"}</span>
                        <span className="text-[10px] uppercase tracking-[0.08em]">{entry.pending ? "pending" : "score"}</span>
                      </div>
                      <div className="cover-frame flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px]">
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl">{ct?.icon ?? "📄"}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-semibold text-foreground">{item.title}</div>
                        {item.creator ? <div className="text-sm text-muted-foreground">{item.creator}</div> : null}
                        <p className="mt-2 text-sm italic text-muted-foreground">{entry.reason ?? "Waiting for AI score."}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.boosts.recent > 0 ? <Badge variant="secondary">Recent +50</Badge> : null}
                          {entry.boosts.trending > 0 ? <Badge variant="secondary">Trending +100</Badge> : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ol>
          ) : null}
          {ranked.length === 0 && suggestionsCount > 0 && !data?.job ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No stored scores yet. Queue a refresh and the scorer will run automatically after your configured interval.
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
