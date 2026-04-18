import type { Env } from "../../types";
import type { FetchedMetadata, SearchSuggestion } from "./types";

// ── iTunes Episode Search ─────────────────────────────────────────────────────

interface iTunesEpisodeResult {
  trackId: number;
  trackName: string;
  trackViewUrl?: string;
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  feedUrl?: string;
  episodeUrl?: string;
  releaseDate?: string;
  shortDescription?: string;
  description?: string;
}

interface iTunesEpisodeSearch {
  results?: iTunesEpisodeResult[];
}

// ── Podcast Index ──────────────────────────────────────────────────────────────

interface PodcastIndexFeed {
  title: string;
  author?: string;
  description?: string;
  artwork?: string;
  image?: string;
  link?: string;
  url?: string;
  episodeCount?: number;
}

interface PodcastIndexSearch {
  feeds?: PodcastIndexFeed[];
}

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchPodcast(input: string, env: Env): Promise<FetchedMetadata> {
  // ── Primary: iTunes episode search (no auth required) ────────────────────
  const itunesRes = await fetch(
    `https://itunes.apple.com/search?media=podcast&entity=podcastEpisode&term=${encodeURIComponent(input)}&limit=5`
  );

  if (itunesRes.ok) {
    const itunesData = (await itunesRes.json()) as iTunesEpisodeSearch;
    const episode = itunesData.results?.[0];
    if (episode) {
      return {
        title: episode.trackName,
        contentType: "podcast",
        creator: episode.collectionName,
        description: (episode.shortDescription ?? episode.description ?? "").slice(0, 500) || undefined,
        coverUrl: episode.artworkUrl600 ?? episode.artworkUrl100,
        sourceUrl: episode.trackViewUrl,
        externalId: String(episode.trackId),
        releaseDate: episode.releaseDate ? episode.releaseDate.slice(0, 10) : undefined,
        metadata: JSON.stringify({
          feedUrl: episode.feedUrl,
          episodeUrl: episode.episodeUrl,
          collectionId: episode.collectionId,
          collectionName: episode.collectionName,
        }),
      };
    }
  }

  // ── Fallback: Podcast Index (requires key + secret) ───────────────────────
  if (env.PODCAST_INDEX_KEY && env.PODCAST_INDEX_SECRET) {
    const ts = Math.floor(Date.now() / 1000).toString();
    const hash = await sha1Hex(env.PODCAST_INDEX_KEY + env.PODCAST_INDEX_SECRET + ts);

    const piRes = await fetch(
      `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(input)}&max=5`,
      {
        headers: {
          "X-Auth-Key": env.PODCAST_INDEX_KEY,
          "X-Auth-Date": ts,
          "X-Auth-Hash": hash,
          "User-Agent": "SirajHub/1.0",
        },
      }
    );

    if (piRes.ok) {
      const piData = (await piRes.json()) as PodcastIndexSearch;
      const feed = piData.feeds?.[0];
      if (feed) {
        return {
          title: feed.title,
          contentType: "podcast",
          creator: feed.author,
          description: feed.description?.slice(0, 500),
          coverUrl: feed.artwork ?? feed.image,
          sourceUrl: feed.link,
          metadata: JSON.stringify({
            feedUrl: feed.url,
            episodeCount: feed.episodeCount,
          }),
        };
      }
    }
  }

  throw new Error(`No podcast found for "${input}"`);
}

export async function searchPodcasts(query: string, env: Env): Promise<SearchSuggestion[]> {
  // Search for individual episodes, not shows
  const itunesRes = await fetch(
    `https://itunes.apple.com/search?media=podcast&entity=podcastEpisode&term=${encodeURIComponent(query)}&limit=5`
  );

  if (itunesRes.ok) {
    const itunesData = (await itunesRes.json()) as iTunesEpisodeSearch;
    const suggestions = (itunesData.results ?? []).slice(0, 5).map((episode) => ({
      provider: "itunes",
      contentType: "podcast" as const,
      title: episode.trackName,
      creator: episode.collectionName,
      description: (episode.shortDescription ?? episode.description ?? "").slice(0, 500) || undefined,
      coverUrl: episode.artworkUrl600 ?? episode.artworkUrl100,
      sourceUrl: episode.trackViewUrl,
      externalId: String(episode.trackId),
      releaseDate: episode.releaseDate ? episode.releaseDate.slice(0, 10) : undefined,
      metadata: JSON.stringify({
        feedUrl: episode.feedUrl,
        episodeUrl: episode.episodeUrl,
        collectionId: episode.collectionId,
        collectionName: episode.collectionName,
      }),
    }));
    if (suggestions.length > 0) {
      return suggestions;
    }
  }

  if (!env.PODCAST_INDEX_KEY || !env.PODCAST_INDEX_SECRET) {
    throw new Error(`No podcast found for "${query}"`);
  }

  const ts = Math.floor(Date.now() / 1000).toString();
  const hash = await sha1Hex(env.PODCAST_INDEX_KEY + env.PODCAST_INDEX_SECRET + ts);

  const piRes = await fetch(
    `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(query)}&max=5`,
    {
      headers: {
        "X-Auth-Key": env.PODCAST_INDEX_KEY,
        "X-Auth-Date": ts,
        "X-Auth-Hash": hash,
        "User-Agent": "SirajHub/1.0",
      },
    }
  );

  if (!piRes.ok) {
    throw new Error(`No podcast found for "${query}"`);
  }

  const piData = (await piRes.json()) as PodcastIndexSearch;
  return (piData.feeds ?? []).slice(0, 5).map((feed) => ({
    provider: "podcastindex",
    contentType: "podcast",
    title: feed.title,
    creator: feed.author,
    description: feed.description?.slice(0, 500),
    coverUrl: feed.artwork ?? feed.image,
    sourceUrl: feed.link,
    metadata: JSON.stringify({
      feedUrl: feed.url,
      episodeCount: feed.episodeCount,
    }),
  }));
}
