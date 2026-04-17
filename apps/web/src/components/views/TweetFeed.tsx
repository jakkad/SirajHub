import { Link } from "@tanstack/react-router";
import { CalendarDays, ExternalLink } from "lucide-react";
import type { Item } from "../../lib/api";

interface TweetFeedProps {
  items: Item[];
}

function getHandle(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("@")) return trimmed;
  const compact = trimmed.replace(/\s+/g, "");
  return compact ? `@${compact}` : null;
}

function getCreatedLabel(createdAt: number): string {
  return new Date(createdAt).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

function getTweetBody(item: Item): string {
  const text = item.description?.trim() || item.title?.trim() || "";
  return text.replace(/&#39;/g, "'").replace(/&mdash;/g, "—");
}

export function TweetFeed({ items }: TweetFeedProps) {
  if (items.length === 0) {
    return <div className="text-muted-foreground italic p-4">No tweets saved yet.</div>;
  }

  return (
    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
      {items.map((item) => {
        const body = getTweetBody(item);
        const handle = getHandle(item.creator);
        const createdLabel = getCreatedLabel(item.createdAt);

        return (
          <Link key={item.id} to="/item/$id" params={{ id: item.id }} className="block no-underline break-inside-avoid">
            <article className="paper-card rounded-[2rem] p-6 border border-[#3b82f6]/20 bg-gradient-to-br from-[#3b82f6]/5 to-transparent hover:border-[#3b82f6]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_-12px_rgba(59,130,246,0.3)] group drop-shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gradient-to-br from-[#3b82f6] to-cyan-400 flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-[#3b82f6]/20">
                    {item.creator ? item.creator[0]?.toUpperCase() : "𝕏"}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground leading-tight group-hover:text-[#3b82f6] transition-colors">{item.creator || "Unknown"}</span>
                    <span className="text-[11px] text-[#3b82f6] opacity-80">{handle || "@tweet"}</span>
                  </div>
                </div>
                <div className="text-[#3b82f6] text-2xl opacity-50 font-serif leading-none mt-1">𝕏</div>
              </div>

              <p className="text-[0.95rem] leading-relaxed text-foreground/90 font-sans mb-4 whitespace-pre-wrap break-words">
                {body || "No tweet text available."}
              </p>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium pt-3 border-t border-[hsl(var(--border)_/_0.3)]">
                <span className="flex items-center gap-1.5"><CalendarDays className="size-3" /> {createdLabel}</span>
                {item.sourceUrl && (
                  <span className="flex items-center gap-1 hover:text-[#3b82f6] transition-colors">
                     Original <ExternalLink className="size-3" />
                  </span>
                )}
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
