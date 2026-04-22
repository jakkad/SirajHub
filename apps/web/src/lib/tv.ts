export interface TVSeason {
  seasonNumber: number;
  episodeCount: number;
  title?: string;
  airDate?: string | null;
  finished?: boolean;
}

export interface TVMetadata {
  seasons: TVSeason[];
  seasonCount?: number;
}

export function parseTVMetadata(metadata: string | null | undefined): TVMetadata | null {
  if (!metadata) return null;

  try {
    const parsed = JSON.parse(metadata) as {
      seasons?: unknown;
      seasonCount?: unknown;
    };

    const seasons = Array.isArray(parsed.seasons)
      ? parsed.seasons
          .map((season) => {
            if (!season || typeof season !== "object") return null;
            const value = season as Record<string, unknown>;
            const seasonNumber = typeof value.seasonNumber === "number" ? value.seasonNumber : null;
            const episodeCount = typeof value.episodeCount === "number" ? value.episodeCount : null;
            if (seasonNumber == null || episodeCount == null) return null;

            return {
              seasonNumber,
              episodeCount,
              title: typeof value.title === "string" ? value.title : undefined,
              airDate: typeof value.airDate === "string" ? value.airDate : null,
              finished: value.finished === true,
            } satisfies TVSeason;
          })
          .filter((season): season is TVSeason => Boolean(season))
          .sort((a, b) => a.seasonNumber - b.seasonNumber)
      : [];

    return {
      seasons,
      seasonCount: typeof parsed.seasonCount === "number" ? parsed.seasonCount : undefined,
    };
  } catch {
    return null;
  }
}

export function serializeTVMetadata(metadata: TVMetadata): string {
  return JSON.stringify({
    seasonCount: metadata.seasonCount ?? metadata.seasons.length,
    seasons: metadata.seasons,
  });
}

export function summarizeTVSeasons(seasons: TVSeason[]) {
  const totalEpisodes = seasons.reduce((sum, season) => sum + season.episodeCount, 0);
  const finishedEpisodes = seasons
    .filter((season) => season.finished)
    .reduce((sum, season) => sum + season.episodeCount, 0);
  const finishedSeasons = seasons.filter((season) => season.finished).length;
  const progressPercent = totalEpisodes > 0 ? Math.round((finishedEpisodes / totalEpisodes) * 100) : 0;

  return {
    totalEpisodes,
    finishedEpisodes,
    finishedSeasons,
    totalSeasons: seasons.length,
    progressPercent,
    allFinished: seasons.length > 0 && finishedSeasons === seasons.length,
    anyFinished: finishedSeasons > 0,
  };
}
