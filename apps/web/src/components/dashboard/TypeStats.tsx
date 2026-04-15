import { Link } from "@tanstack/react-router";
import { CONTENT_TYPES } from "../../lib/constants";
import type { Item } from "../../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TypeStatsProps {
  items: Item[];
}

const TYPE_ROUTES: Record<string, string> = {
  book: "/books",
  movie: "/movies",
  tv: "/tv",
  podcast: "/podcasts",
  youtube: "/videos",
  article: "/articles",
  tweet: "/tweets",
};

export function TypeStats({ items }: TypeStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {CONTENT_TYPES.map((ct) => {
        const typeItems = items.filter((i) => i.contentType === ct.id);
        const count = typeItems.length;
        const route = TYPE_ROUTES[ct.id] ?? "/";
        const covers = typeItems
          .filter((item) => item.coverUrl)
          .slice(0, 3)
          .map((item) => item.coverUrl as string);

        return (
          <Link key={ct.id} to={route as "/"} className="block no-underline">
            <Card className="h-full transition-transform hover:-translate-y-0.5">
              <CardContent className="flex h-full flex-col gap-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{ct.label}</p>
                    <div className="mt-1 text-[2rem] font-semibold leading-none tracking-[-0.05em]" style={{ color: ct.color }}>
                      {count}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 bg-white/90 text-muted-foreground">
                    type
                  </Badge>
                </div>

                <div className="flex min-h-[88px] items-end gap-2 overflow-hidden rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-3">
                  {covers.length > 0 ? (
                    <>
                      {covers.map((cover, index) => (
                        <div
                          key={`${ct.id}-${index}`}
                          className="h-[78px] flex-1 overflow-hidden rounded-[16px] border border-white/70 bg-white shadow-[var(--shadow-subtle)]"
                          style={{ transform: `translateY(${index * 4}px)` }}
                        >
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                      {covers.length < 3
                        ? Array.from({ length: 3 - covers.length }).map((_, index) => (
                            <div
                              key={`placeholder-${ct.id}-${index}`}
                              className="flex h-[78px] flex-1 items-center justify-center rounded-[16px] border border-dashed border-[hsl(var(--border))] text-[10px] font-semibold uppercase tracking-[0.08em]"
                              style={{ color: ct.color, background: `color-mix(in oklab, ${ct.color} 10%, white)` }}
                            >
                              {ct.label}
                            </div>
                          ))
                        : null}
                    </>
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-[18px] text-sm font-semibold uppercase tracking-[0.12em]"
                      style={{ color: ct.color, background: `color-mix(in oklab, ${ct.color} 12%, white)` }}
                    >
                      {ct.label}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
