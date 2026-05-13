import type { Env } from "../../types";
import type { ContentType, FetchedMetadata } from "./types";

type YouTubeThumbnails = {
  high?: { url: string };
  medium?: { url: string };
  default?: { url: string };
};

interface YouTubeResponse {
  items?: Array<{
    id?: string;
    snippet: {
      title: string;
      channelTitle: string;
      channelId: string;
      description: string;
      publishedAt: string;
      thumbnails: YouTubeThumbnails;
    };
    contentDetails: { duration: string };
  }>;
}

interface YouTubePlaylistItemsResponse {
  nextPageToken?: string;
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      channelTitle: string;
      channelId: string;
      videoOwnerChannelTitle?: string;
      videoOwnerChannelId?: string;
      thumbnails: YouTubeThumbnails;
      resourceId?: {
        videoId?: string;
      };
    };
    contentDetails?: {
      videoId?: string;
      videoPublishedAt?: string;
    };
  }>;
}

export interface YouTubePlaylistImportRow {
  title: string;
  contentType: Extract<ContentType, "youtube" | "podcast">;
  status: "suggestions" | "in_progress" | "finished" | "archived";
  creator?: string;
  description?: string;
  coverUrl?: string;
  releaseDate?: string;
  durationMins?: number;
  sourceUrl: string;
  externalId: string;
  metadata?: string;
  sourceRecordId: string;
  sourceMetadata?: unknown;
}

export interface YouTubePlaylistImportPreview {
  rows: YouTubePlaylistImportRow[];
  preview: Array<YouTubePlaylistImportRow & { rowNumber: number }>;
  errors: { row: number; error: string }[];
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

export function extractPlaylistId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const listId = parsed.searchParams.get("list")?.trim();
    return listId || null;
  } catch {
    const match = url.match(/[?&]list=([^&#]+)/);
    return match?.[1] ? decodeURIComponent(match[1]).trim() : null;
  }
}

/** PT1H23M45S → minutes */
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return parseInt(m[1] ?? "0") * 60 + parseInt(m[2] ?? "0");
}

function pickThumb(thumbnails: YouTubeThumbnails) {
  return thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url;
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

  const thumb = pickThumb(item.snippet.thumbnails);

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

async function fetchPlaylistItems(playlistId: string, env: Env) {
  const items: NonNullable<YouTubePlaylistItemsResponse["items"]> = [];
  let pageToken: string | undefined;

  do {
    const apiUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    apiUrl.searchParams.set("part", "snippet,contentDetails");
    apiUrl.searchParams.set("playlistId", playlistId);
    apiUrl.searchParams.set("maxResults", "50");
    apiUrl.searchParams.set("key", env.YOUTUBE_API_KEY);
    if (pageToken) apiUrl.searchParams.set("pageToken", pageToken);

    const res = await fetch(apiUrl.toString());
    if (!res.ok) throw new Error(`YouTube playlist API error: HTTP ${res.status}`);

    const data = (await res.json()) as YouTubePlaylistItemsResponse;
    items.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

async function fetchVideoDetails(videoIds: string[], env: Env) {
  const details = new Map<string, NonNullable<YouTubeResponse["items"]>[number]>();

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const apiUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    apiUrl.searchParams.set("part", "snippet,contentDetails");
    apiUrl.searchParams.set("id", batch.join(","));
    apiUrl.searchParams.set("key", env.YOUTUBE_API_KEY);

    const res = await fetch(apiUrl.toString());
    if (!res.ok) throw new Error(`YouTube video details API error: HTTP ${res.status}`);

    const data = (await res.json()) as YouTubeResponse;
    for (const item of data.items ?? []) {
      if (item.id) details.set(item.id, item);
    }
  }

  return details;
}

export async function fetchYouTubePlaylistImport(
  input: {
    url: string;
    contentType: Extract<ContentType, "youtube" | "podcast">;
    status?: YouTubePlaylistImportRow["status"];
  },
  env: Env
): Promise<YouTubePlaylistImportPreview> {
  const playlistId = extractPlaylistId(input.url);
  if (!playlistId) throw new Error("Could not extract YouTube playlist ID from URL");

  const playlistItems = await fetchPlaylistItems(playlistId, env);
  const errors: YouTubePlaylistImportPreview["errors"] = [];
  const videoIds = playlistItems
    .map((item, index) => {
      const videoId = item.contentDetails?.videoId ?? item.snippet.resourceId?.videoId;
      if (!videoId) errors.push({ row: index + 1, error: "Playlist item is missing a video ID." });
      return videoId;
    })
    .filter((videoId): videoId is string => Boolean(videoId));

  const details = await fetchVideoDetails([...new Set(videoIds)], env);
  const rows: YouTubePlaylistImportRow[] = [];

  playlistItems.forEach((playlistItem, index) => {
    const videoId = playlistItem.contentDetails?.videoId ?? playlistItem.snippet.resourceId?.videoId;
    if (!videoId) return;

    const detail = details.get(videoId);
    if (!detail) {
      errors.push({ row: index + 1, error: `Video ${videoId} is unavailable or private.` });
      return;
    }

    const thumb = pickThumb(detail.snippet.thumbnails) ?? pickThumb(playlistItem.snippet.thumbnails);
    const channelTitle = detail.snippet.channelTitle || playlistItem.snippet.videoOwnerChannelTitle || playlistItem.snippet.channelTitle;
    const channelId = detail.snippet.channelId || playlistItem.snippet.videoOwnerChannelId || playlistItem.snippet.channelId;
    const releaseDate = detail.snippet.publishedAt?.slice(0, 10) || playlistItem.contentDetails?.videoPublishedAt?.slice(0, 10);

    const row: YouTubePlaylistImportRow = {
      title: detail.snippet.title,
      contentType: input.contentType,
      status: input.status ?? "suggestions",
      creator: channelTitle || undefined,
      description: detail.snippet.description?.slice(0, 500) || undefined,
      coverUrl: thumb,
      releaseDate,
      durationMins: parseDuration(detail.contentDetails.duration),
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      externalId: videoId,
      metadata: JSON.stringify({
        channelId,
        playlistId,
        playlistItemId: playlistItem.id,
        playlistPosition: playlistItem.snippet.resourceId ? index : undefined,
        importedFrom: "youtube_playlist",
      }),
      sourceRecordId: videoId,
      sourceMetadata: {
        playlistId,
        playlistItemId: playlistItem.id,
        playlistPosition: index,
      },
    };
    rows.push(row);
  });

  return {
    rows,
    preview: rows.slice(0, 6).map((row, index) => ({ rowNumber: index + 1, ...row })),
    errors,
  };
}
