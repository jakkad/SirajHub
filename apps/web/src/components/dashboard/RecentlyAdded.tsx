import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";
import { CONTENT_TYPES } from "../../lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface RecentlyAddedProps {
  items: Item[];
}

export function RecentlyAdded({ items }: RecentlyAddedProps) {
  const recent = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

  if (recent.length === 0) {
    return <EmptyState message="No items added yet." />;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {recent.map((item) => {
        const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);
        return (
          <Link key={item.id} to="/item/$id" params={{ id: item.id }} className="block min-w-[176px] shrink-0 no-underline">
            <Card className="h-full transition-transform hover:-translate-y-0.5">
              <CardContent className="flex flex-col gap-3 p-3">
                <div
                  className="cover-frame flex h-28 items-center justify-center overflow-hidden rounded-[20px]"
                  style={ct ? { backgroundColor: `color-mix(in oklch, ${ct.color} 18%, hsl(var(--card)))` } : undefined}
                >
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl">{ct?.icon ?? "📄"}</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                  {ct ? (
                    <Badge variant="outline" className="w-fit" style={{ color: ct.color }}>
                      {ct.label}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="py-3 text-sm text-muted-foreground">{message}</div>;
}
