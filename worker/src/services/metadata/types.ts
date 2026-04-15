export type ContentType =
  | "book"
  | "movie"
  | "tv"
  | "podcast"
  | "youtube"
  | "article"
  | "tweet";

/** Normalised metadata returned by every fetcher and cached in url_cache. */
export interface FetchedMetadata {
  title: string;
  contentType: ContentType;
  creator?: string;
  description?: string;
  coverUrl?: string;
  releaseDate?: string;  // YYYY-MM-DD or YYYY
  durationMins?: number;
  sourceUrl?: string;
  externalId?: string;
  metadata?: string;     // JSON blob for type-specific extras
}

export interface SearchSuggestion {
  provider: string;
  contentType: ContentType;
  title: string;
  creator?: string;
  description?: string;
  coverUrl?: string;
  releaseDate?: string;
  sourceUrl?: string;
  externalId?: string;
  metadata?: string;
}

export interface DispatchInput {
  url?: string;
  query?: string;
  contentType?: string;
}
