import type { Env } from "../../types";
import type { ContentType, DispatchInput, FetchedMetadata } from "./types";
import { fetchYouTube } from "./youtube";
import { fetchTMDB } from "./movies";
import { fetchBooks } from "./books";
import { fetchPodcast } from "./podcasts";
import { fetchArticle } from "./articles";
import { fetchTweet } from "./tweets";

export type { FetchedMetadata, ContentType };

/**
 * Infers content type from a URL.
 * Returns null if the URL doesn't match any known pattern (treat as article).
 */
function detectFromUrl(url: string): ContentType {
  if (/youtube\.com\/watch|youtu\.be\//.test(url)) return "youtube";
  if (/themoviedb\.org\/movie\//.test(url)) return "movie";
  if (/themoviedb\.org\/tv\//.test(url)) return "tv";
  if (/twitter\.com\/.+\/status\/|x\.com\/.+\/status\//.test(url)) return "tweet";
  if (/goodreads\.com|openlibrary\.org|google\.com\/books/.test(url)) return "book";
  if (/podcasts\.apple\.com|anchor\.fm|buzzsprout\.com|podbean\.com/.test(url))
    return "podcast";
  return "article";
}

/**
 * Dispatch an ingest request to the correct metadata fetcher.
 * Accepts either a URL (auto-detects type) or a query + explicit content_type.
 */
export async function dispatch(
  input: DispatchInput,
  env: Env
): Promise<FetchedMetadata> {
  const { url, query, contentType: explicitType } = input;

  if (!url && !query) {
    throw new Error("url or query is required");
  }

  const type: ContentType = (explicitType as ContentType | undefined) ??
    (url ? detectFromUrl(url) : "article");

  switch (type) {
    case "youtube":
      if (!url) throw new Error("YouTube requires a URL");
      return fetchYouTube(url, env);

    case "movie":
      return fetchTMDB(url ?? query!, "movie", env);

    case "tv":
      return fetchTMDB(url ?? query!, "tv", env);

    case "book":
      return fetchBooks(url ?? query!, env);

    case "podcast":
      return fetchPodcast(url ?? query!, env);

    case "tweet":
      if (!url) throw new Error("Tweet requires a URL");
      return fetchTweet(url);

    case "article":
    default:
      if (!url) throw new Error("Article scraping requires a URL");
      return fetchArticle(url);
  }
}
