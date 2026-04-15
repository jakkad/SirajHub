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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      {CONTENT_TYPES.map((ct) => {
        const count = items.filter((i) => i.contentType === ct.id).length;
        const route = TYPE_ROUTES[ct.id] ?? "/";
        return (
          <Link key={ct.id} to={route as "/"} className="block no-underline">
            <Card className="h-full transition-transform hover:-translate-y-1">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-display text-4xl">{ct.icon}</span>
                  <Badge variant="outline" className="bg-card">
                    type
                  </Badge>
                </div>
                <div className="mt-auto">
                  <div className="font-display text-4xl leading-none" style={{ color: ct.color }}>
                    {count}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{ct.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
