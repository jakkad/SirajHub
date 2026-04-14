import type { FetchedMetadata } from "./types";

export async function fetchArticle(url: string): Promise<FetchedMetadata> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SirajHub/1.0; +https://sirajhub.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch article: HTTP ${res.status}`);

  // Collect meta values via HTMLRewriter (Cloudflare Workers built-in)
  let title = "";
  let ogTitle = "";
  let ogDesc = "";
  let ogImage = "";
  let ogSiteName = "";
  let author = "";
  let publishedTime = "";

  const rewriter = new HTMLRewriter()
    .on("title", {
      text(chunk) {
        title += chunk.text;
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        ogTitle = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        ogDesc = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        // Only use as fallback if og:description wasn't found yet
        if (!ogDesc) ogDesc = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[property="og:image"]', {
      element(el) {
        ogImage = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[property="og:site_name"]', {
      element(el) {
        ogSiteName = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[name="author"]', {
      element(el) {
        author = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[property="article:author"]', {
      element(el) {
        author = author || (el.getAttribute("content") ?? "");
      },
    })
    .on('meta[property="article:published_time"]', {
      element(el) {
        publishedTime = el.getAttribute("content") ?? "";
      },
    });

  // Consume the full response through the rewriter
  await rewriter.transform(res).text();

  const resolvedTitle = ogTitle || title.trim();
  if (!resolvedTitle) throw new Error("Could not extract title from article");

  return {
    title: resolvedTitle,
    contentType: "article",
    creator: author || undefined,
    description: ogDesc || undefined,
    coverUrl: ogImage || undefined,
    releaseDate: publishedTime ? publishedTime.slice(0, 10) : undefined,
    sourceUrl: url,
    metadata: JSON.stringify({ siteName: ogSiteName || undefined }),
  };
}
