import type { Env } from "../../types";
import type { FetchedMetadata } from "./types";

interface YouTubeResponse {
  items?: Array<{
    snippet: {
      title: string;
      channelTitle: string;
      channelId: string;
      description: string;
      publishedAt: string;
      thumbnails: {
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
    };
    contentDetails: { duration: string };
  }>;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** PT1H23M45S → minutes */
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return parseInt(m[1] ?? "0") * 60 + parseInt(m[2] ?? "0");
}

export async function fetchYouTube(url: string, env: Env): Promise<FetchedMetadata> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Could not extract YouTube video ID from URL");

  const apiUrl =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=snippet,contentDetails&id=${videoId}&key=${env.YOUTUBE_API_KEY}`;

  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`YouTube API error: HTTP ${res.status}`);

  const data = (await res.json()) as YouTubeResponse;
  const item = data.items?.[0];
  if (!item) throw new Error("YouTube video not found");

  const thumb =
    item.snippet.thumbnails.high?.url ??
    item.snippet.thumbnails.medium?.url ??
    item.snippet.thumbnails.default?.url;

  return {
    title: item.snippet.title,
    contentType: "youtube",
    creator: item.snippet.channelTitle,
    description: item.snippet.description?.slice(0, 500) || undefined,
    coverUrl: thumb,
    releaseDate: item.snippet.publishedAt?.slice(0, 10),
    durationMins: parseDuration(item.contentDetails.duration),
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    externalId: videoId,
    metadata: JSON.stringify({ channelId: item.snippet.channelId }),
  };
}
