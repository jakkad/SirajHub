import type { Env } from "../../types";
import type { FetchedMetadata, SearchSuggestion } from "./types";

// ── Open Library ──────────────────────────────────────────────────────────────

interface OLSearchResult {
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  isbn?: string[];
  key?: string;
}

interface OLSearch {
  docs?: OLSearchResult[];
}

// ── Google Books ──────────────────────────────────────────────────────────────

interface GBVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    infoLink?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
  };
}

interface GBSearch {
  items?: GBVolume[];
}

export async function fetchBooks(input: string, env: Env): Promise<FetchedMetadata> {
  if (isGoodreadsUrl(input)) {
    return fetchGoodreadsBook(input);
  }

  // ── Primary: Open Library (no key needed) ─────────────────────────────────
  const olRes = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(input)}` +
      `&fields=title,author_name,cover_i,first_publish_year,isbn,key&limit=5`
  );

  if (olRes.ok) {
    const olData = (await olRes.json()) as OLSearch;
    const book = olData.docs?.[0];
    if (book) {
      return {
        title: book.title,
        contentType: "book",
        creator: book.author_name?.[0],
        coverUrl: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
          : undefined,
        releaseDate: book.first_publish_year
          ? String(book.first_publish_year)
          : undefined,
        sourceUrl: book.key
          ? `https://openlibrary.org${book.key}`
          : `https://openlibrary.org/search?q=${encodeURIComponent(input)}`,
        metadata: JSON.stringify({ isbn: book.isbn?.[0] }),
      };
    }
  }

  // ── Fallback: Google Books ─────────────────────────────────────────────────
  const gbRes = await fetch(
    `https://www.googleapis.com/books/v1/volumes` +
      `?q=${encodeURIComponent(input)}&key=${env.GOOGLE_BOOKS_API_KEY}&maxResults=5`
  );
  if (!gbRes.ok) throw new Error(`Book not found for "${input}"`);

  const gbData = (await gbRes.json()) as GBSearch;
  const vol = gbData.items?.[0]?.volumeInfo;
  if (!vol) throw new Error(`Book not found for "${input}"`);

  const isbn = gbData.items?.[0]?.volumeInfo.industryIdentifiers?.find(
    (i) => i.type === "ISBN_13"
  )?.identifier;

  return {
    title: vol.title,
    contentType: "book",
    creator: vol.authors?.[0],
    description: vol.description?.slice(0, 500),
    coverUrl: vol.imageLinks?.thumbnail?.replace("http:", "https:"),
    releaseDate: vol.publishedDate,
    sourceUrl: vol.infoLink,
    externalId: gbData.items?.[0]?.id,
    metadata: JSON.stringify({
      isbn,
      pageCount: vol.pageCount,
      categories: vol.categories,
    }),
  };
}

export async function searchBooks(query: string, env: Env): Promise<SearchSuggestion[]> {
  const suggestions: SearchSuggestion[] = [];

  const olRes = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}` +
      `&fields=title,author_name,cover_i,first_publish_year,isbn,key&limit=5`
  );

  if (olRes.ok) {
    const olData = (await olRes.json()) as OLSearch;
    for (const book of olData.docs ?? []) {
      suggestions.push({
        provider: "openlibrary",
        contentType: "book",
        title: book.title,
        creator: book.author_name?.[0],
        coverUrl: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
          : undefined,
        releaseDate: book.first_publish_year ? String(book.first_publish_year) : undefined,
        sourceUrl: book.key ? `https://openlibrary.org${book.key}` : undefined,
        externalId: book.key,
        metadata: JSON.stringify({ isbn: book.isbn?.[0] }),
      });
    }
  }

  if (suggestions.length > 0) {
    return suggestions.slice(0, 5);
  }

  const gbRes = await fetch(
    `https://www.googleapis.com/books/v1/volumes` +
      `?q=${encodeURIComponent(query)}&key=${env.GOOGLE_BOOKS_API_KEY}&maxResults=5`
  );
  if (!gbRes.ok) throw new Error(`Book search failed for "${query}"`);

  const gbData = (await gbRes.json()) as GBSearch;
  return (gbData.items ?? []).slice(0, 5).map((item) => ({
    provider: "googlebooks",
    contentType: "book",
    title: item.volumeInfo.title,
    creator: item.volumeInfo.authors?.[0],
    description: item.volumeInfo.description?.slice(0, 500),
    coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:"),
    releaseDate: item.volumeInfo.publishedDate,
    sourceUrl: item.volumeInfo.infoLink,
    externalId: item.id,
    metadata: JSON.stringify({
      categories: item.volumeInfo.categories,
      pageCount: item.volumeInfo.pageCount,
      isbn: item.volumeInfo.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier,
    }),
  }));
}

function isGoodreadsUrl(input: string) {
  try {
    const url = new URL(input);
    return /(^|\.)goodreads\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

async function fetchGoodreadsBook(url: string): Promise<FetchedMetadata> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SirajHub/1.0; +https://sirajhub.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Goodreads book: HTTP ${res.status}`);
  }

  const html = await res.text();

  let pageTitle = "";
  let ogTitle = "";
  let twitterTitle = "";
  let ogDesc = "";
  let richDescription = "";
  let ogImage = "";
  let author = "";
  let isbn = "";

  const rewriter = new HTMLRewriter()
    .on("title", {
      text(chunk) {
        pageTitle += chunk.text;
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        ogTitle = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[name="twitter:title"]', {
      element(el) {
        twitterTitle = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[property="og:description"]', {
      element(el) {
        ogDesc = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        if (!ogDesc) ogDesc = el.getAttribute("content") ?? "";
      },
    })
    .on('[data-testid="description"]', {
      text(chunk) {
        richDescription += chunk.text;
      },
    })
    .on(".BookPageMetadataSection__description", {
      text(chunk) {
        richDescription += chunk.text;
      },
    })
    .on(".Formatted", {
      text(chunk) {
        richDescription += chunk.text;
      },
    })
    .on('meta[property="og:image"]', {
      element(el) {
        ogImage = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[name="author"]', {
      element(el) {
        author = el.getAttribute("content") ?? "";
      },
    })
    .on('meta[property="books:isbn"]', {
      element(el) {
        isbn = el.getAttribute("content") ?? "";
      },
    });

  await rewriter.transform(new Response(html)).text();

  const structured = extractGoodreadsStructuredBookData(html);
  const rawTitle = structured.title || ogTitle || twitterTitle || pageTitle.trim();
  const { title, creator } = splitGoodreadsTitle(rawTitle, structured.creator || author);

  if (!title) {
    throw new Error("Could not extract Goodreads title");
  }

  const description =
    structured.description ||
    normalizeDescription(richDescription) ||
    normalizeDescription(ogDesc);

  return {
    title,
    contentType: "book",
    creator: creator || undefined,
    description: description || undefined,
    coverUrl: ogImage || undefined,
    releaseDate: structured.releaseDate || undefined,
    sourceUrl: url,
    externalId: extractGoodreadsBookId(url),
    metadata: JSON.stringify({
      isbn: isbn || undefined,
      provider: "goodreads",
    }),
  };
}

function splitGoodreadsTitle(rawTitle: string, fallbackAuthor: string) {
  const cleaned = rawTitle
    .replace(/\s*\|\s*Goodreads\s*$/i, "")
    .replace(/\s*-\s*Goodreads\s*$/i, "")
    .trim();

  const byMatch = cleaned.match(/^(.*?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return {
      title: byMatch[1]?.trim() ?? "",
      creator: byMatch[2]?.trim() || fallbackAuthor.trim(),
    };
  }

  return {
    title: cleaned,
    creator: fallbackAuthor.trim(),
  };
}

function extractGoodreadsBookId(url: string) {
  const match = url.match(/\/book\/show\/(\d+)/i);
  return match?.[1] ?? undefined;
}

function normalizeDescription(text: string) {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\s*\.{3,}\s*/g, "... ")
    .trim();

  if (!cleaned) return "";
  return cleaned.slice(0, 1400);
}

function extractGoodreadsStructuredBookData(html: string) {
  const result = {
    title: "",
    creator: "",
    description: "",
    releaseDate: "",
  };

  const ldJsonMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of ldJsonMatches) {
    const script = match[1]?.trim();
    if (!script) continue;
    const parsed = safeParseJson(script);
    const book = findBookLikeRecord(parsed);
    if (!book) continue;

    result.title ||= asNonEmptyString(book.name);
    result.description ||= normalizeDescription(asNonEmptyString(book.description));
    result.creator ||= extractAuthorName(book.author);
    result.releaseDate ||= normalizeReleaseDate(asNonEmptyString(book.datePublished));

    if (result.title || result.description || result.creator || result.releaseDate) {
      break;
    }
  }

  if (!result.description) {
    const escapedJsonDescription = html.match(/"description"\s*:\s*"((?:\\.|[^"\\])*)"/i)?.[1];
    if (escapedJsonDescription) {
      result.description = normalizeDescription(decodeJsonText(escapedJsonDescription));
    }
  }

  return result;
}

function safeParseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function findBookLikeRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findBookLikeRecord(entry);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  const typeValue = record["@type"];
  const types = Array.isArray(typeValue) ? typeValue : [typeValue];
  if (types.some((type) => typeof type === "string" && /book/i.test(type))) {
    return record;
  }
  for (const nested of Object.values(record)) {
    const found = findBookLikeRecord(nested);
    if (found) return found;
  }
  return null;
}

function asNonEmptyString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractAuthorName(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractAuthorName(entry);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string" && record.name.trim()) {
      return record.name.trim();
    }
  }
  return "";
}

function normalizeReleaseDate(value: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function decodeJsonText(value: string) {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\\\/g, "\\");
}
