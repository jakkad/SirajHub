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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      {CONTENT_TYPES.map((ct) => {
        const count = items.filter((i) => i.contentType === ct.id).length;
        const route = TYPE_ROUTES[ct.id] ?? "/";
        return (
          <Link key={ct.id} to={route as "/"} className="block no-underline">
            <Card className="h-full transition-transform hover:-translate-y-0.5">
              <CardContent className="flex h-full items-center gap-4 p-4">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.55)] text-2xl"
                  style={{ color: ct.color }}
                >
                  {ct.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{ct.label}</p>
                  <div className="mt-1 text-[1.75rem] font-semibold leading-none tracking-[-0.05em]" style={{ color: ct.color }}>
                    {count}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 bg-white/90 text-muted-foreground">
                  type
                </Badge>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
