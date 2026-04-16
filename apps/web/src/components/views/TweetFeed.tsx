import { Link } from "@tanstack/react-router";
import { CalendarDays, ExternalLink, FilePenLine, MessageSquareText } from "lucide-react";
import type { Item } from "../../lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TweetFeedProps {
  items: Item[];
}

function getInitials(name: string | null): string {
  if (!name) return "X";
  const cleaned = name.replace(/^@/, "").trim();
  if (!cleaned) return "X";
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTweetBody(item: Item): string {
  const text = item.description?.trim() || item.title?.trim() || "";
  return text.replace(/&#39;/g, "'").replace(/&mdash;/g, "—");
}

export function TweetFeed({ items }: TweetFeedProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[hsl(var(--border))] px-5 py-8 text-sm text-muted-foreground">
        No tweets saved yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const body = getTweetBody(item);
        const handle = getHandle(item.creator);
        const createdLabel = getCreatedLabel(item.createdAt);

        return (
          <article
            key={item.id}
            className="group overflow-hidden rounded-[30px] border border-[hsl(var(--border))] bg-card/90 shadow-[var(--shadow-subtle)] transition-all duration-200 hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-panel)]"
          >
            <div className="border-b border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--secondary)/0.7),hsl(var(--background)))] px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-[hsl(var(--color-tweet))] text-base font-semibold text-white shadow-[0_12px_24px_hsl(215_90%_55%/0.22)]">
                    {getInitials(item.creator)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold tracking-[-0.03em] text-foreground">
                        {item.creator || item.title || "Tweet"}
                      </h3>
                      <Badge variant="outline" className="rounded-full bg-card/80">
                        𝕏 Saved
                      </Badge>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {handle ? <span>{handle}</span> : null}
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        {createdLabel}
                      </span>
                      {item.status ? (
                        <span className="rounded-full border border-[hsl(var(--border))] bg-card/70 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          {item.status.replace("_", " ")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-[1.65rem] leading-none text-[hsl(var(--color-tweet))]">𝕏</div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <Link to="/item/$id" params={{ id: item.id }} className="block no-underline">
                <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] px-4 py-4 transition-colors group-hover:bg-[hsl(var(--secondary)/0.45)] sm:px-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <MessageSquareText className="size-3.5" />
                    Tweet Preview
                  </div>

                  <p className="line-clamp-4 text-[1rem] leading-8 tracking-[-0.01em] text-foreground">
                    {body || "No tweet text was saved for this item yet."}
                  </p>

                  {item.title && item.title !== item.creator && item.title !== item.description ? (
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      Saved title: {item.title}
                    </p>
                  ) : null}
                </div>
              </Link>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] pt-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    Tweet
                  </Badge>
                  {item.sourceUrl ? (
                    <Badge variant="outline" className="rounded-full bg-card/80">
                      Source saved
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
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
        );
      })}
    </div>
  );
}
