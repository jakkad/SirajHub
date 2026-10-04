import type { ContentType } from "./types";

/** Match parsed hosts, never provider names embedded in another site's path. */
export function detectFromUrl(value: string): ContentType {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (matches("youtu.be") || (matches("youtube.com") && /^\/watch(\/|$)/.test(url.pathname))) return "youtube";
  if (matches("themoviedb.org") && url.pathname.startsWith("/movie/")) return "movie";
  if (matches("themoviedb.org") && url.pathname.startsWith("/tv/")) return "tv";
  if ((matches("twitter.com") || matches("x.com")) && /^\/[^/]+\/status\//.test(url.pathname)) return "tweet";
  if (matches("goodreads.com") || matches("openlibrary.org") || matches("books.google.com") ||
      (matches("google.com") && url.pathname.startsWith("/books"))) return "book";
  if (["podcasts.apple.com", "anchor.fm", "buzzsprout.com", "podbean.com"].some(matches)) return "podcast";
  return "article";
}
