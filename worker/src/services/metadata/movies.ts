import type { Env } from "../../types";
import type { FetchedMetadata, SearchSuggestion } from "./types";

interface TMDBSearchResult {
  id: number;
  media_type?: string;
}

interface TMDBBase {
  id: number;
  overview: string;
  poster_path: string | null;
  genres?: Array<{ name: string }>;
  vote_average?: number;
}

interface TMDBMovie extends TMDBBase {
  title: string;
  release_date: string;
  runtime: number | null;
}

interface TMDBTv extends TMDBBase {
  name: string;
  first_air_date: string;
  number_of_seasons: number;
  episode_run_time?: number[];
}

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

function extractTmdbId(url: string): { id: number; type: "movie" | "tv" } | null {
  const m = url.match(/themoviedb\.org\/(movie|tv)\/(\d+)/);
  if (!m || !m[1] || !m[2]) return null;
  return { type: m[1] as "movie" | "tv", id: parseInt(m[2]) };
}

export async function fetchTMDB(
  input: string,
  mediaType: "movie" | "tv",
  env: Env
): Promise<FetchedMetadata> {
  let id: number;
  let resolvedType = mediaType;

  // Check if input is a TMDB URL with an embedded ID
  const fromUrl = extractTmdbId(input);
  if (fromUrl) {
    id = fromUrl.id;
    resolvedType = fromUrl.type;
  } else {
    // Search by title
    const searchRes = await fetch(
      `${BASE}/search/${resolvedType}?query=${encodeURIComponent(input)}&api_key=${env.TMDB_API_KEY}`
    );
    if (!searchRes.ok) throw new Error(`TMDB search error: HTTP ${searchRes.status}`);

    const searchData = (await searchRes.json()) as { results?: TMDBSearchResult[] };
    const first = searchData.results?.[0];
    if (!first) throw new Error(`No ${resolvedType} found for "${input}"`);
    id = first.id;
  }

  // Fetch detail
  const detailRes = await fetch(
    `${BASE}/${resolvedType}/${id}?api_key=${env.TMDB_API_KEY}`
  );
  if (!detailRes.ok) throw new Error(`TMDB detail error: HTTP ${detailRes.status}`);

  const detail = (await detailRes.json()) as TMDBMovie | TMDBTv;
  const isTV = resolvedType === "tv";

  const title = isTV ? (detail as TMDBTv).name : (detail as TMDBMovie).title;
  const releaseDate = isTV
    ? (detail as TMDBTv).first_air_date
    : (detail as TMDBMovie).release_date;
  const runtime = isTV
    ? (detail as TMDBTv).episode_run_time?.[0]
    : (detail as TMDBMovie).runtime ?? undefined;

  return {
    title,
    contentType: resolvedType,
    description: detail.overview?.slice(0, 500) || undefined,
    coverUrl: detail.poster_path ? `${IMG}${detail.poster_path}` : undefined,
    releaseDate: releaseDate?.slice(0, 10),
    durationMins: runtime ?? undefined,
    sourceUrl: `https://www.themoviedb.org/${resolvedType}/${id}`,
    externalId: String(id),
    metadata: JSON.stringify({
      genres: detail.genres?.map((g) => g.name),
      tmdbRating: detail.vote_average,
      ...(isTV ? { seasons: (detail as TMDBTv).number_of_seasons } : {}),
    }),
  };
}

export async function searchTMDB(
  query: string,
  mediaType: "movie" | "tv",
  env: Env
): Promise<SearchSuggestion[]> {
  const searchRes = await fetch(
    `${BASE}/search/${mediaType}?query=${encodeURIComponent(query)}&api_key=${env.TMDB_API_KEY}`
  );
  if (!searchRes.ok) throw new Error(`TMDB search error: HTTP ${searchRes.status}`);

  const searchData = (await searchRes.json()) as {
    results?: Array<{
      id: number;
      title?: string;
      name?: string;
      overview?: string;
      poster_path?: string | null;
      release_date?: string;
      first_air_date?: string;
    }>;
  };

  return (searchData.results ?? []).slice(0, 5).map((item) => ({
    provider: "tmdb",
    contentType: mediaType,
    title: mediaType === "tv" ? item.name ?? "Untitled" : item.title ?? "Untitled",
    description: item.overview?.slice(0, 500),
    coverUrl: item.poster_path ? `${IMG}${item.poster_path}` : undefined,
    releaseDate: (mediaType === "tv" ? item.first_air_date : item.release_date)?.slice(0, 10),
    sourceUrl: `https://www.themoviedb.org/${mediaType}/${item.id}`,
    externalId: String(item.id),
  }));
}
