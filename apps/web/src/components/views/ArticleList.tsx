import { Link } from "@tanstack/react-router";
import { Clock3, ExternalLink, FilePenLine, Globe2 } from "lucide-react";
import type { Item } from "../../lib/api";
import { Button } from "@/components/ui/button";

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
    month: "short",
    day: "numeric",
  });
}

function getReadingTime(item: Item): string | null {
  if (item.durationMins && item.durationMins > 0) {
    return `${item.durationMins} min read`;
  }

  if (!item.description) return null;
  const words = item.description.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 180));
  return `${mins} min read`;
}

export function ArticleList({ items }: ArticleListProps) {
  if (items.length === 0) {
    return <EmptyState message="No articles yet." />;
  }

  return (
    <div className="relative pl-6 sm:pl-8">
      <div className="absolute top-0 bottom-0 left-2 w-px bg-[linear-gradient(180deg,hsl(var(--border-strong))_0%,hsl(var(--border))_16%,transparent_100%)] sm:left-3" />

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const favicon = getFavicon(item.sourceUrl);
          const domain = getDomain(item.sourceUrl);
          const readingTime = getReadingTime(item);
          const createdLabel = getCreatedLabel(item.createdAt);

          return (
            <div key={item.id} className="group relative">
              <div className="absolute top-8 -left-[1.18rem] z-10 size-3 rounded-full border-2 border-[hsl(var(--background))] bg-[hsl(var(--color-article))] shadow-[0_0_0_4px_hsl(var(--background))] sm:-left-[1.45rem]" />

              <article className="rounded-[28px] border border-[hsl(var(--border))] bg-card/90 px-5 py-4 shadow-[var(--shadow-subtle)] transition-all duration-200 hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-panel)] sm:px-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 pt-1">
                    <div className="flex size-14 items-center justify-center overflow-hidden rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.55)] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.85)]">
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                      ) : favicon ? (
                        <img src={favicon} alt="" className="size-8 rounded-md object-cover" />
                      ) : (
                        <Globe2 className="size-6 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link to="/item/$id" params={{ id: item.id }} className="block no-underline">
                          <h3 className="text-[1.08rem] font-semibold leading-7 tracking-[-0.02em] text-foreground transition-colors group-hover:text-primary">
                            {item.title}
                          </h3>
                        </Link>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-sm text-muted-foreground sm:pl-6">
                        {createdLabel}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-secondary/60 px-2.5 py-1 text-[12px] font-medium text-foreground">
                        {favicon ? <img src={favicon} alt="" className="size-3.5 rounded-sm" /> : <Globe2 className="size-3.5" />}
                        {domain || "article"}
                      </span>

                      {item.creator ? (
                        <>
                          <span className="text-[hsl(var(--border-strong))]">•</span>
                          <span>{item.creator}</span>
                        </>
                      ) : null}

                      {readingTime ? (
                        <>
                          <span className="text-[hsl(var(--border-strong))]">•</span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="size-3.5" />
                            {readingTime}
                          </span>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-[hsl(var(--border))] pt-3">
                      {item.sourceUrl ? (
                        <Button asChild type="button" variant="outline" className="rounded-full bg-card/80">
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">
                            <ExternalLink className="size-4" />
                            Source
                          </a>
                        </Button>
                      ) : null}

                      <Button asChild type="button" variant="outline" className="rounded-full bg-card/80">
                        <Link to="/item/$id" params={{ id: item.id }} className="no-underline">
                          <FilePenLine className="size-4" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[hsl(var(--border))] px-5 py-8 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
