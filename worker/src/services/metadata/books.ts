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
