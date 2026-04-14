import type { FetchedMetadata } from "./types";

interface TwitterOEmbed {
  html: string;
  author_name: string;
  author_url: string;
  url?: string;
}

/** Strip HTML tags and collapse whitespace */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchTweet(url: string): Promise<FetchedMetadata> {
  const oembedUrl =
    `https://publish.twitter.com/oembed` +
    `?url=${encodeURIComponent(url)}&omit_script=true&hide_thread=true`;

  const res = await fetch(oembedUrl);
  if (!res.ok) throw new Error(`Twitter oEmbed error: HTTP ${res.status}`);

  const data = (await res.json()) as TwitterOEmbed;
  const text = stripHtml(data.html);

  // oEmbed HTML contains a date like "— Author (@handle) Month DD, YYYY"
  const dateMatch = data.html.match(
    /([A-Z][a-z]+ \d{1,2}, \d{4})|(\d{4}-\d{2}-\d{2})/
  );
  let releaseDate: string | undefined;
  if (dateMatch?.[0]) {
    const parsed = new Date(dateMatch[0]);
    if (!isNaN(parsed.getTime())) {
      releaseDate = parsed.toISOString().slice(0, 10);
    }
  }

  // Use first 120 chars of tweet text as title
  const title = text.length > 120 ? text.slice(0, 120) + "…" : text;

  return {
    title,
    contentType: "tweet",
    creator: data.author_name,
    description: text || undefined,
    sourceUrl: url,
    releaseDate,
    metadata: JSON.stringify({
      authorUrl: data.author_url,
      embedHtml: data.html,
    }),
  };
}
