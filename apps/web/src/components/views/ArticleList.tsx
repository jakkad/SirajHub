import { Link } from "@tanstack/react-router";
import { Clock3, Globe2 } from "lucide-react";
import type { Item } from "../../lib/api";

interface ArticleListProps {
  items: Item[];
}

function getFavicon(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    return `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
  } catch {
    return null;
  }
}

function getDomain(sourceUrl: string | null): string {
  if (!sourceUrl) return "";
  try {
    return new URL(sourceUrl).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function getCreatedLabel(createdAt: number): string {
  return new Date(createdAt).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric"
  });
}

function getReadingTime(item: Item): string | null {
  if (item.durationMins && item.durationMins > 0) return `${item.durationMins} min read`;
  if (!item.description) return null;
  const words = item.description.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 180))} min read`;
}

export function ArticleList({ items }: ArticleListProps) {
  if (items.length === 0) {
    return <div className="text-muted-foreground p-8 italic">No articles saved yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {items.map((item) => {
        const favicon = getFavicon(item.sourceUrl);
        const domain = getDomain(item.sourceUrl);
        const readingTime = getReadingTime(item);
        const createdLabel = getCreatedLabel(item.createdAt);

        return (
          <Link key={item.id} to="/item/$id" params={{ id: item.id }} className="block no-underline flex flex-col h-full group outline-none">
            <article className="paper-card rounded-3xl p-5 border border-[#10b981]/20 hover:border-[#10b981]/50 bg-gradient-to-br from-[#10b981]/5 to-transparent flex flex-col h-full transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#10b981]/15 drop-shadow-sm">
              
              {/* Cover Image Area */}
              <div className="w-full h-48 rounded-2xl bg-card border border-[hsl(var(--border)_/_0.6)] overflow-hidden relative mb-5 shadow-inner">
                {item.coverUrl ? (
                  <img src={item.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.title} />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#10b981]/10 to-teal-400/5">
                     {favicon ? <img src={favicon} className="w-16 h-16 opacity-30 grayscale" alt="domain icon" /> : <Globe2 className="size-16 text-[#10b981]/30" />}
                   </div>
                )}
                
                {/* Floating Meta Tag */}
                {domain && (
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-white/10 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                     {favicon && <img src={favicon} className="size-3 shrink-0" alt="" />}
                     <span className="truncate max-w-[120px]">{domain}</span>
                  </div>
                )}
              </div>

              {/* Title & Desc */}
              <div className="flex flex-col gap-2 flex-grow">
                <h3 className="text-[1.15rem] font-bold font-serif leading-tight text-foreground group-hover:text-[#10b981] transition-colors line-clamp-3">
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="text-sm text-muted-foreground/90 line-clamp-3 leading-relaxed mt-1">
                    {item.description}
                  </p>
                ) : null}
              </div>

              {/* Footer Meta */}
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-5 pt-4 border-t border-[hsl(var(--border)_/_0.4)]">
                <div className="flex items-center gap-4">
                  <span>{createdLabel}</span>
                  {readingTime && <span className="flex items-center gap-1 opacity-70"><Clock3 className="size-3"/> {readingTime}</span>}
                </div>
                {item.creator && <span className="truncate max-w-[100px] text-[#10b981] opacity-90">{item.creator}</span>}
              </div>

            </article>
          </Link>
        );
      })}
    </div>
  );
}
