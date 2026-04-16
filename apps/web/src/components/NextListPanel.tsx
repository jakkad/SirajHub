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
  const { data, isFetching, error } = useNextList();
  const { mutate: refresh, isPending: refreshing } = useRefreshNextList();

  const ranked = data?.result ?? [];
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));

  function handleOpen() {
    setOpen(true);
  }

  return (
    <>
      <Button onClick={handleOpen} variant="outline" className="gap-2 bg-card/90">
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
              {refreshing || isFetching ? "Queueing…" : ranked.length > 0 ? "Refresh" : "Queue ranking"}
            </Button>
          </div>

          {data?.job ? (
            <div className="text-sm text-muted-foreground">
              {data.job.status === "queued" ? `Queued for ${new Date(data.job.runAfter).toLocaleString()}.` : null}
              {data.job.status === "processing" ? "Queue job is processing now." : null}
              {data.job.status === "failed" ? `Last queue attempt failed: ${data.job.lastError ?? "Unknown error"}` : null}
              {data.job.status === "completed" && data.savedAt ? `Latest ranking saved ${new Date(data.savedAt).toLocaleString()}.` : null}
            </div>
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
                      className="flex items-start gap-4 rounded-[24px] border border-[hsl(var(--border))] bg-card p-4 shadow-[var(--shadow-subtle)]"
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">#{entry.rank}</div>
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
                        <p className="mt-2 text-sm italic text-muted-foreground">{entry.reason}</p>
                      </div>
                    </li>
                  );
                })}
            </ol>
          ) : null}
          {ranked.length === 0 && suggestionsCount > 0 && !data?.job ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No saved ranking yet. Queue one and it will run automatically after your configured interval.
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
