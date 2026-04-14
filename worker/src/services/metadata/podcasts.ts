import type { Env } from "../../types";
import type { FetchedMetadata } from "./types";

// ── iTunes Search ─────────────────────────────────────────────────────────────

interface iTunesResult {
  collectionName: string;
  artistName: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  collectionViewUrl?: string;
  collectionId: number;
  feedUrl?: string;
  trackCount?: number;
  primaryGenreName?: string;
}

interface iTunesSearch {
  results?: iTunesResult[];
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
  // ── Primary: iTunes (no auth required) ───────────────────────────────────
  const itunesRes = await fetch(
    `https://itunes.apple.com/search?media=podcast&term=${encodeURIComponent(input)}&limit=5`
  );

  if (itunesRes.ok) {
    const itunesData = (await itunesRes.json()) as iTunesSearch;
    const podcast = itunesData.results?.[0];
    if (podcast) {
      return {
        title: podcast.collectionName,
        contentType: "podcast",
        creator: podcast.artistName,
        coverUrl: podcast.artworkUrl600 ?? podcast.artworkUrl100,
        sourceUrl: podcast.collectionViewUrl,
        externalId: String(podcast.collectionId),
        metadata: JSON.stringify({
          feedUrl: podcast.feedUrl,
          episodeCount: podcast.trackCount,
          genre: podcast.primaryGenreName,
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
