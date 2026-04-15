import { useEffect } from "react";
import { useNextList, useRefreshNextList } from "../../hooks/useAI";
import { useItems } from "../../hooks/useItems";
import { CONTENT_TYPES } from "../../lib/constants";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NextToConsume() {
  const { data: aiData, isLoading, isFetched, refetch } = useNextList();
  const { data: allItems = [] } = useItems();
  const { mutate: refresh, isPending: refreshing } = useRefreshNextList();

  const ranked = aiData?.result ?? [];
  const itemMap = Object.fromEntries(allItems.map((i) => [i.id, i]));
  const suggestionsCount = allItems.filter((item) => item.status === "suggestions").length;

  useEffect(() => {
    if (suggestionsCount > 0 && !isFetched && !isLoading) {
      refetch();
    }
  }, [suggestionsCount, isFetched, isLoading, refetch]);

  function handleLoad() {
    refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {!isFetched && !isLoading && (
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Ranking suggestions</p>
              <p className="mt-1 text-sm text-muted-foreground">Preparing AI recommendations from your queue.</p>
            </div>
            <Button onClick={handleLoad} size="sm">Load</Button>
          </div>
        </div>
      )}

      {(isLoading || refreshing) && (
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4 text-sm text-muted-foreground">
          Ranking your suggestions…
        </div>
      )}

      {isFetched && !isLoading && ranked.length === 0 && (
        <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4 text-sm text-muted-foreground">
          {suggestionsCount === 0 ? "No items in Suggestions yet." : "No ranking available right now."}
        </div>
      )}

      {ranked.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {ranked.slice(0, 5).map((r, idx) => {
              const item = itemMap[r.id];
              if (!item) return null;
              const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);
              return (
                <Link key={r.id} to="/item/$id" params={{ id: r.id }} className="block no-underline">
                  <Card className="transition-transform hover:-translate-y-0.5">
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                        {idx + 1}
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
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.reason}</div>
                      </div>
                      {ct ? <Badge variant="outline">{ct.label}</Badge> : null}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          <Button onClick={() => refresh()} disabled={refreshing} variant="outline" className="w-fit">
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </>
      )}
    </div>
  );
}
