import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";
import { CONTENT_TYPES } from "../../lib/constants";
import { Card, CardContent } from "@/components/ui/card";

interface InProgressItemsProps {
  items: Item[];
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function InProgressItems({ items }: InProgressItemsProps) {
  const inProgress = items.filter((i) => i.status === "in_progress");

  if (inProgress.length === 0) {
    return <div className="py-1 text-sm text-muted-foreground">Nothing in progress.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {inProgress.map((item) => {
        const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);
        return (
          <Link key={item.id} to="/item/$id" params={{ id: item.id }} className="block no-underline">
            <Card className="transition-transform hover:-translate-y-1">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className="flex size-14 items-center justify-center overflow-hidden rounded-[18px] border-2 border-[hsl(var(--border-strong))] bg-secondary"
                  style={ct ? { backgroundColor: `color-mix(in oklch, ${ct.color} 18%, hsl(var(--card)))` } : undefined}
                >
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-2xl">{ct?.icon ?? "📄"}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-foreground">{item.title}</div>
                  {item.creator ? <div className="truncate text-sm text-muted-foreground">{item.creator}</div> : null}
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-display text-lg text-foreground">{item.startedAt ? timeAgo(item.startedAt) : "now"}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">in progress</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
