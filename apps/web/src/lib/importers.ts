import type { CreateItemInput } from "./api";
import { parseCsv, prepareCsvImport } from "./csv";
import type { ContentTypeId, StatusId } from "./constants";

export type ImportSourceId =
  | "csv"
  | "goodreads"
  | "letterboxd"
  | "imdb"
  | "trakt"
  | "pocket"
  | "raindrop"
  | "youtube_history"
  | "apple_podcasts_opml"
  | "x_bookmarks";

export interface PreparedImportRow extends CreateItemInput {
  sourceRecordId?: string;
  sourceMetadata?: unknown;
}

export interface PreparedImportPreview extends PreparedImportRow {
  rowNumber: number;
}

export interface PreparedImportResult {
  rows: PreparedImportRow[];
  preview: PreparedImportPreview[];
  errors: { row: number; error: string }[];
}

function normalizeStatus(value?: string | null): StatusId | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  if (["suggestions", "suggestion", "wanttoread", "towatch", "listenlater", "queued", "unread"].includes(normalized)) return "suggestions";
  if (["inprogress", "currentlyreading", "watching", "listening", "reading", "active"].includes(normalized)) return "in_progress";
  if (["finished", "done", "completed", "watched", "read", "listened"].includes(normalized)) return "finished";
  if (["archived", "archive"].includes(normalized)) return "archived";
  return undefined;
}

function pushRow(
  target: PreparedImportResult,
  rowNumber: number,
  row: PreparedImportRow | null,
  error?: string
) {
  if (!row) {
    if (error) target.errors.push({ row: rowNumber, error });
    return;
  }
  target.rows.push(row);
  if (target.preview.length < 6) target.preview.push({ rowNumber, ...row });
}

function csvHeadersMap(text: string) {
  const parsed = parseCsv(text);
  const headers = parsed.headers.map((header) => header.trim().toLowerCase());
  return { parsed, headers };
}

function getCell(row: string[], headers: string[], names: string[]) {
  for (const name of names) {
    const idx = headers.indexOf(name.toLowerCase());
    if (idx >= 0) {
      const value = row[idx]?.trim();
      if (value) return value;
    }
  }
  return "";
}

function parseGoodreads(text: string): PreparedImportResult {
  const result: PreparedImportResult = { rows: [], preview: [], errors: [] };
  const { parsed, headers } = csvHeadersMap(text);
  parsed.rows.forEach((row, index) => {
    const title = getCell(row, headers, ["title"]);
    if (!title) return pushRow(result, index + 2, null, "Missing Goodreads title.");
    const creator = getCell(row, headers, ["author", "authors"]);
    const shelf = getCell(row, headers, ["exclusive shelf", "exclusive_shelf", "bookshelves"]);
    const isbn = getCell(row, headers, ["isbn13", "isbn"]);
    const ratingValue = Number.parseInt(getCell(row, headers, ["my rating"]), 10);
    pushRow(result, index + 2, {
      title,
      contentType: "book",
      creator: creator || undefined,
      status: normalizeStatus(shelf) ?? "suggestions",
      rating: Number.isFinite(ratingValue) && ratingValue > 0 ? ratingValue : undefined,
      releaseDate: getCell(row, headers, ["year published", "original publication year"]) || undefined,
      externalId: isbn || undefined,
      sourceMetadata: { shelf, isbn },
      sourceRecordId: isbn || title,
    });
  });
  return result;
}

function parseLetterboxd(text: string): PreparedImportResult {
  const result: PreparedImportResult = { rows: [], preview: [], errors: [] };
  const { parsed, headers } = csvHeadersMap(text);
  parsed.rows.forEach((row, index) => {
    const title = getCell(row, headers, ["name", "title"]);
    if (!title) return pushRow(result, index + 2, null, "Missing Letterboxd title.");
    const year = getCell(row, headers, ["year"]);
    const url = getCell(row, headers, ["letterboxd uri", "letterboxd_uri", "url"]);
    const ratingRaw = getCell(row, headers, ["rating"]);
    const ratingFive = ratingRaw ? Math.round(Math.min(10, Number.parseFloat(ratingRaw)) / 2) : undefined;
    pushRow(result, index + 2, {
      title,
      contentType: "movie",
      status: normalizeStatus(getCell(row, headers, ["watched date", "diary date"])) ?? "finished",
      releaseDate: year || undefined,
      sourceUrl: url || undefined,
      rating: ratingFive && ratingFive > 0 ? ratingFive : undefined,
      sourceRecordId: url || `${title}:${year}`,
      sourceMetadata: { year, source: "letterboxd" },
    });
  });
  return result;
}

function parseImdb(text: string): PreparedImportResult {
  const result: PreparedImportResult = { rows: [], preview: [], errors: [] };
  const { parsed, headers } = csvHeadersMap(text);
  parsed.rows.forEach((row, index) => {
    const title = getCell(row, headers, ["title", "name"]);
    if (!title) return pushRow(result, index + 2, null, "Missing IMDb title.");
    const typeValue = getCell(row, headers, ["title type", "titletype", "type"]).toLowerCase();
    const contentType: ContentTypeId =
      typeValue.includes("tv") || typeValue.includes("series")
        ? "tv"
        : typeValue.includes("podcast")
          ? "podcast"
          : "movie";
    const constId = getCell(row, headers, ["const", "titleconst", "id"]);
    const url = getCell(row, headers, ["url", "title url"]);
    const ratingValue = Number.parseInt(getCell(row, headers, ["your rating", "rating"]), 10);
    pushRow(result, index + 2, {
      title,
      contentType,
      status: normalizeStatus(getCell(row, headers, ["watched date", "date rated"])) ?? "finished",
      creator: getCell(row, headers, ["directors", "director", "author"]) || undefined,
      releaseDate: getCell(row, headers, ["year", "release year"]) || undefined,
      sourceUrl: url || undefined,
      externalId: constId || undefined,
      rating: Number.isFinite(ratingValue) && ratingValue > 0 ? Math.min(5, Math.round(ratingValue / 2)) : undefined,
      sourceRecordId: constId || url || title,
      sourceMetadata: { typeValue },
    });
  });
  return result;
}

function parseTrakt(text: string): PreparedImportResult {
  const result: PreparedImportResult = { rows: [], preview: [], errors: [] };
  const parsed = JSON.parse(text) as Record<string, unknown> | unknown[];
  const entries = Array.isArray(parsed)
    ? parsed
    : Object.values(parsed).flatMap((value) => (Array.isArray(value) ? value : []));

  entries.forEach((entry, index) => {
    const record = entry as Record<string, unknown>;
    const movie = record.movie as Record<string, unknown> | undefined;
    const show = record.show as Record<string, unknown> | undefined;
    const item = movie ?? show ?? record;
    const title = typeof item?.title === "string" ? item.title : "";
    if (!title) return pushRow(result, index + 2, null, "Missing Trakt title.");
    const ids = (item?.ids as Record<string, unknown> | undefined) ?? {};
    pushRow(result, index + 2, {
      title,
      contentType: movie ? "movie" : show ? "tv" : "movie",
      status: normalizeStatus((record.type as string | undefined) ?? "finished") ?? "finished",
      releaseDate: typeof item?.year === "number" ? String(item.year) : undefined,
      externalId: typeof ids.trakt === "number" ? String(ids.trakt) : undefined,
      sourceRecordId: typeof ids.trakt === "number" ? String(ids.trakt) : title,
      sourceMetadata: record,
    });
  });
  return result;
}

function parsePocket(text: string): PreparedImportResult {
  const result: PreparedImportResult = { rows: [], preview: [], errors: [] };
  if (text.includes("<!DOCTYPE NETSCAPE-Bookmark-file-1>") || text.includes("<DT><A")) {
    const doc = new DOMParser().parseFromString(text, "text/html");
    const links = [...doc.querySelectorAll("a")];
    links.forEach((link, index) => {
      const title = link.textContent?.trim() || link.getAttribute("href") || "";
      if (!title) return;
      pushRow(result, index + 2, {
        title,
        contentType: "article",
        status: "suggestions",
        sourceUrl: link.getAttribute("href") || undefined,
        sourceRecordId: link.getAttribute("href") || title,
        sourceMetadata: { addDate: link.getAttribute("add_date"), tags: link.getAttribute("tags") },
      });
    });
    return result;
  }

  const { parsed, headers } = csvHeadersMap(text);
  parsed.rows.forEach((row, index) => {
    const title = getCell(row, headers, ["title", "resolved_title", "given_title"]);
    const url = getCell(row, headers, ["url", "resolved_url", "given_url"]);
    if (!title && !url) return pushRow(result, index + 2, null, "Missing Pocket title/url.");
    pushRow(result, index + 2, {
      title: title || url,
      contentType: "article",
      status: normalizeStatus(getCell(row, headers, ["status"])) ?? "suggestions",
      sourceUrl: url || undefined,
      sourceRecordId: url || title,
      sourceMetadata: { tags: getCell(row, headers, ["tags"]) },
    });
  });
  return result;
}

function parseRaindrop(text: string): PreparedImportResult {
  const result: PreparedImportResult = { rows: [], preview: [], errors: [] };
  const { parsed, headers } = csvHeadersMap(text);
  parsed.rows.forEach((row, index) => {
    const title = getCell(row, headers, ["title", "name"]);
    const url = getCell(row, headers, ["link", "url"]);
    if (!title && !url) return pushRow(result, index + 2, null, "Missing Raindrop title/url.");
    pushRow(result, index + 2, {
      title: title || url,
      contentType: "article",
      status: "suggestions",
      description: getCell(row, headers, ["excerpt", "note"]) || undefined,
      sourceUrl: url || undefined,
      coverUrl: getCell(row, headers, ["cover", "image"]) || undefined,
      notes: getCell(row, headers, ["note"]) || undefined,
      sourceRecordId: url || title,
      sourceMetadata: { collection: getCell(row, headers, ["folder", "collection"]), tags: getCell(row, headers, ["tags"]) },
    });
  });
  return result;
}

function parseYouTube(text: string): PreparedImportResult {
  const result: PreparedImportResult = { rows: [], preview: [], errors: [] };
  if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
    const parsed = JSON.parse(text) as unknown[];
    const entries = Array.isArray(parsed) ? parsed : [];
    entries.forEach((entry, index) => {
      const record = entry as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title : typeof record.name === "string" ? record.name : "";
      const url = typeof record.url === "string" ? record.url : typeof record.videoUrl === "string" ? record.videoUrl : "";
      if (!title && !url) return pushRow(result, index + 2, null, "Missing YouTube title/url.");
      pushRow(result, index + 2, {
        title: title || url,
        contentType: "youtube",
        status: normalizeStatus((record.status as string | undefined) ?? "finished") ?? "finished",
        creator: typeof record.channel === "string" ? record.channel : typeof record.channelTitle === "string" ? record.channelTitle : undefined,
        sourceUrl: url || undefined,
        coverUrl: typeof record.thumbnail === "string" ? record.thumbnail : undefined,
        sourceRecordId: typeof record.videoId === "string" ? record.videoId : url || title,
        sourceMetadata: record,
      });
    });
    return result;
  }

  const { parsed, headers } = csvHeadersMap(text);
  parsed.rows.forEach((row, index) => {
    const title = getCell(row, headers, ["title", "video title", "name"]);
    const url = getCell(row, headers, ["url", "video url", "link"]);
    if (!title && !url) return pushRow(result, index + 2, null, "Missing YouTube title/url.");
    pushRow(result, index + 2, {
      title: title || url,
      contentType: "youtube",
      status: normalizeStatus(getCell(row, headers, ["status"])) ?? "finished",
      creator: getCell(row, headers, ["channel", "channel title"]) || undefined,
      sourceUrl: url || undefined,
      releaseDate: getCell(row, headers, ["published", "publishedat"]) || undefined,
      sourceRecordId: getCell(row, headers, ["videoid", "video id"]) || url || title,
      sourceMetadata: { playlist: getCell(row, headers, ["playlist", "playlist title"]) },
    });
  });
  return result;
}

function parseApplePodcastsOpml(text: string): PreparedImportResult {
  const result: PreparedImportResult = { rows: [], preview: [], errors: [] };
  const xml = new DOMParser().parseFromString(text, "text/xml");
  const outlines = [...xml.querySelectorAll("outline[xmlUrl]")];
  outlines.forEach((outline, index) => {
    const title = outline.getAttribute("text") || outline.getAttribute("title") || outline.getAttribute("xmlUrl") || "";
    pushRow(result, index + 2, {
      title,
      contentType: "podcast",
      status: "suggestions",
      sourceUrl: outline.getAttribute("htmlUrl") || outline.getAttribute("xmlUrl") || undefined,
      creator: outline.getAttribute("description") || undefined,
      sourceRecordId: outline.getAttribute("xmlUrl") || title,
      sourceMetadata: {
        xmlUrl: outline.getAttribute("xmlUrl"),
        htmlUrl: outline.getAttribute("htmlUrl"),
      },
    });
  });
  return result;
}

function parseXBookmarks(text: string): PreparedImportResult {
  const result: PreparedImportResult = { rows: [], preview: [], errors: [] };
  const parsed = JSON.parse(text) as unknown[];
  const entries = Array.isArray(parsed) ? parsed : [];
  entries.forEach((entry, index) => {
    const record = entry as Record<string, unknown>;
    const title =
      typeof record.full_text === "string"
        ? record.full_text
        : typeof record.text === "string"
          ? record.text
          : "";
    const url =
      typeof record.url === "string"
        ? record.url
        : typeof record.permalink === "string"
          ? record.permalink
          : "";
    if (!title && !url) return pushRow(result, index + 2, null, "Missing X bookmark text/url.");
    pushRow(result, index + 2, {
      title: (title || url).slice(0, 280),
      contentType: "tweet",
      status: "suggestions",
      creator:
        typeof record.screen_name === "string"
          ? record.screen_name
          : typeof record.username === "string"
            ? record.username
            : undefined,
      description: title || undefined,
      sourceUrl: url || undefined,
      sourceRecordId: typeof record.id_str === "string" ? record.id_str : url || title,
      sourceMetadata: record,
    });
  });
  return result;
}

export function prepareImportFile(source: ImportSourceId, text: string): PreparedImportResult {
  switch (source) {
    case "goodreads":
      return parseGoodreads(text);
    case "letterboxd":
      return parseLetterboxd(text);
    case "imdb":
      return parseImdb(text);
    case "trakt":
      return parseTrakt(text);
    case "pocket":
      return parsePocket(text);
    case "raindrop":
      return parseRaindrop(text);
    case "youtube_history":
      return parseYouTube(text);
    case "apple_podcasts_opml":
      return parseApplePodcastsOpml(text);
    case "x_bookmarks":
      return parseXBookmarks(text);
    case "csv":
    default: {
      const csv = prepareCsvImport(parseCsv(text));
      return {
        rows: csv.items,
        preview: csv.preview,
        errors: csv.errors,
      };
    }
  }
}
