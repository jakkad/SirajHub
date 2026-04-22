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
  seasons?: Array<{
    season_number: number;
    episode_count: number;
    name?: string;
    air_date?: string | null;
  }>;
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
      ...(isTV
        ? {
            seasons: ((detail as TMDBTv).seasons ?? [])
              .filter((season) => season.season_number > 0 && season.episode_count > 0)
              .map((season) => ({
                seasonNumber: season.season_number,
                title: season.name,
                episodeCount: season.episode_count,
                airDate: season.air_date ?? null,
                finished: false,
              })),
            seasonCount: (detail as TMDBTv).number_of_seasons,
          }
        : {}),
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

  const baseResults = (searchData.results ?? []).slice(0, mediaType === "tv" ? 8 : 5);

  if (mediaType !== "tv") {
    return baseResults.map((item) => ({
      provider: "tmdb",
      contentType: mediaType,
      title: item.title ?? "Untitled",
      description: item.overview?.slice(0, 500),
      coverUrl: item.poster_path ? `${IMG}${item.poster_path}` : undefined,
      releaseDate: item.release_date?.slice(0, 10),
      sourceUrl: `https://www.themoviedb.org/${mediaType}/${item.id}`,
      externalId: String(item.id),
    }));
  }

  const detailedSuggestions = await Promise.all(
    baseResults.map(async (item) => {
      const detail = await fetchTMDB(`https://www.themoviedb.org/tv/${item.id}`, "tv", env);
      let hasAvailableSeasons = false;
      try {
        const parsed = detail.metadata ? JSON.parse(detail.metadata) : null;
        hasAvailableSeasons = Array.isArray(parsed?.seasons) && parsed.seasons.length > 0;
      } catch {
        hasAvailableSeasons = false;
      }

      if (!hasAvailableSeasons) return null;

      return {
        provider: "tmdb",
        contentType: "tv" as const,
        title: detail.title,
        description: detail.description,
        coverUrl: detail.coverUrl,
        releaseDate: detail.releaseDate,
        sourceUrl: detail.sourceUrl,
        externalId: detail.externalId,
        metadata: detail.metadata,
      };
    })
  );

  return detailedSuggestions
    .filter((item) => item !== null)
    .slice(0, 5);
}
