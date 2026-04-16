import { useNextList } from "../../hooks/useAI";
import { useItems } from "../../hooks/useItems";
import { CONTENT_TYPES, type ContentTypeId } from "../../lib/constants";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface NextToConsumeProps {
  contentType?: ContentTypeId;
  title?: string;
  description?: string;
}

export function NextToConsume({
  contentType,
  title = "Next To Consume",
  description = "Stored suggestion scores based on your interest profiles and active boosts.",
}: NextToConsumeProps) {
  const { data: aiData, isLoading } = useNextList(contentType);
  const { data: allItems = [] } = useItems();

  const ranked = aiData?.result ?? [];
  const itemMap = Object.fromEntries(allItems.map((i) => [i.id, i]));
  const suggestionsCount = allItems.filter((item) =>
    item.status === "suggestions" && (!contentType || item.contentType === contentType)
  ).length;

  return (
    <div className="flex flex-col gap-3">
      {!aiData && !isLoading && (
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
          <div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4 text-sm text-muted-foreground">
          Updating queue state…
        </div>
      )}

      {aiData?.job ? (
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4 text-sm text-muted-foreground">
          {aiData.job.status === "queued" ? `Queued for ${new Date(aiData.job.runAfter).toLocaleString()}.` : null}
          {aiData.job.status === "processing" ? "AI scoring jobs are processing now." : null}
          {aiData.job.status === "failed" ? `Last queue attempt failed: ${aiData.job.lastError ?? "Unknown error"}` : null}
          {aiData.job.status === "completed" && aiData.savedAt ? `Latest score refresh completed ${new Date(aiData.savedAt).toLocaleString()}.` : null}
        </div>
      ) : null}

      {aiData && !isLoading && ranked.length === 0 && (
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4 text-sm text-muted-foreground">
          {suggestionsCount === 0
            ? "No items in Suggestions yet."
            : "No stored scores available yet. Queue a refresh or wait for item scoring jobs to complete."}
        </div>
      )}

      {ranked.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {ranked.slice(0, 5).map((r) => {
              const item = itemMap[r.id];
              if (!item) return null;
              const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);
              return (
                <Link key={r.id} to="/item/$id" params={{ id: r.id }} className="block no-underline">
                  <Card className="transition-transform hover:-translate-y-0.5">
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex min-h-10 min-w-10 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 px-2 text-primary">
                        <span className="text-sm font-semibold">{r.score ?? "…"}</span>
                        <span className="text-[10px] uppercase tracking-[0.08em]">{r.pending ? "pending" : "score"}</span>
                      </div>
                      <div className="cover-frame flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px]">
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl">{ct?.icon ?? "📄"}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {r.explanation ?? "Waiting for AI score."}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {r.boosts.recent > 0 ? <Badge variant="secondary">Recent +50</Badge> : null}
                          {r.boosts.trending > 0 ? <Badge variant="secondary">Trending +100</Badge> : null}
                          {r.needsMoreInfo ? <Badge variant="outline">Needs more info</Badge> : null}
                        </div>
                        {r.moreInfoRequest ? <div className="mt-2 text-xs text-muted-foreground">{r.moreInfoRequest}</div> : null}
                      </div>
                      {ct ? <Badge variant="outline">{ct.label}</Badge> : null}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
