import type { CreateItemInput } from "./api";
import type { ContentTypeId, StatusId } from "./constants";

export interface ParsedCsvFile {
  headers: string[];
  rows: string[][];
}

export interface CsvImportPreviewRow extends CreateItemInput {
  rowNumber: number;
}

export interface CsvImportPreparation {
  items: CreateItemInput[];
  preview: CsvImportPreviewRow[];
  errors: { row: number; error: string }[];
}

export interface ManualCsvMapping {
  title: string;
  contentType: string;
  fixedContentType: ContentTypeId | "";
  status: string;
  fixedStatus: StatusId | "";
  creator: string;
  fixedCreator: string;
  description: string;
  fixedDescription: string;
  coverUrl: string;
  fixedCoverUrl: string;
  releaseDate: string;
  fixedReleaseDate: string;
  rating: string;
  fixedRating: string;
  notes: string;
  fixedNotes: string;
  sourceUrl: string;
  fixedSourceUrl: string;
}

const HEADER_ALIASES: Record<string, keyof CreateItemInput | "skip"> = {
  title: "title",
  name: "title",
  contenttype: "contentType",
  content_type: "contentType",
  type: "contentType",
  status: "status",
  creator: "creator",
  author: "creator",
  director: "creator",
  channel: "creator",
  publisher: "creator",
  description: "description",
  summary: "description",
  cover: "coverUrl",
  coverurl: "coverUrl",
  cover_url: "coverUrl",
  image: "coverUrl",
  poster: "coverUrl",
  releasedate: "releaseDate",
  release_date: "releaseDate",
  date: "releaseDate",
  rating: "rating",
  notes: "notes",
  note: "notes",
  sourceurl: "sourceUrl",
  source_url: "sourceUrl",
  source: "sourceUrl",
  url: "sourceUrl",
  link: "sourceUrl",
  subtitle: "skip",
};

const CONTENT_TYPE_ALIASES: Record<string, ContentTypeId> = {
  book: "book",
  books: "book",
  movie: "movie",
  movies: "movie",
  film: "movie",
  films: "movie",
  tv: "tv",
  tvshow: "tv",
  tvshows: "tv",
  tvseries: "tv",
  show: "tv",
  shows: "tv",
  podcast: "podcast",
  podcasts: "podcast",
  youtube: "youtube",
  video: "youtube",
  videos: "youtube",
  article: "article",
  articles: "article",
  tweet: "tweet",
  tweets: "tweet",
  x: "tweet",
};

const STATUS_ALIASES: Record<string, StatusId> = {
  suggestions: "suggestions",
  suggestion: "suggestions",
  suggested: "suggestions",
  inprogress: "in_progress",
  in_progress: "in_progress",
  active: "in_progress",
  finished: "finished",
  complete: "finished",
  completed: "finished",
  done: "finished",
  archived: "archived",
  archive: "archived",
};

export function parseCsv(text: string): ParsedCsvFile {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        currentCell += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  const cleaned = rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (cleaned.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = cleaned[0] ?? [];
  const dataRows = cleaned.slice(1);
  return { headers, rows: dataRows };
}

export function prepareCsvImport(parsed: ParsedCsvFile): CsvImportPreparation {
  const headers = parsed.headers.map(normalizeHeader);
  const items: CreateItemInput[] = [];
  const preview: CsvImportPreviewRow[] = [];
  const errors: { row: number; error: string }[] = [];

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const mapped: Partial<CreateItemInput> = {};

    headers.forEach((header, headerIndex) => {
      const target = HEADER_ALIASES[header];
      const value = row[headerIndex]?.trim();
      if (!target || target === "skip" || !value) return;

      if (target === "contentType") {
        const normalized = normalizeContentType(value);
        if (normalized) mapped.contentType = normalized;
        return;
      }

      if (target === "status") {
        const normalized = normalizeStatus(value);
        if (normalized) mapped.status = normalized;
        return;
      }

      if (target === "rating") {
        const parsedRating = Number.parseInt(value, 10);
        if (Number.isFinite(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
          mapped.rating = parsedRating;
        }
        return;
      }

      if (
        target === "title" ||
        target === "creator" ||
        target === "description" ||
        target === "coverUrl" ||
        target === "releaseDate" ||
        target === "notes" ||
        target === "sourceUrl" ||
        target === "externalId"
      ) {
        mapped[target] = value;
      }
    });

    if (!mapped.title?.trim()) {
      errors.push({ row: rowNumber, error: "Missing required title column value." });
      return;
    }

    if (!mapped.contentType) {
      errors.push({ row: rowNumber, error: "Missing or unsupported content type." });
      return;
    }

    const item: CreateItemInput = {
      title: mapped.title.trim(),
      contentType: mapped.contentType,
      status: mapped.status ?? "suggestions",
      creator: mapped.creator?.trim() || undefined,
      description: mapped.description?.trim() || undefined,
      coverUrl: mapped.coverUrl?.trim() || undefined,
      releaseDate: mapped.releaseDate?.trim() || undefined,
      rating: mapped.rating,
      notes: mapped.notes?.trim() || undefined,
      sourceUrl: mapped.sourceUrl?.trim() || undefined,
    };

    items.push(item);
    if (preview.length < 6) {
      preview.push({ rowNumber, ...item });
    }
  });

  return { items, preview, errors };
}

export function createDefaultManualCsvMapping(parsed: ParsedCsvFile): ManualCsvMapping {
  const headers = parsed.headers;
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  const isLetterboxd = normalizedHeaders.includes("letterboxduri") || normalizedHeaders.includes("letterboxd_uri");
  return {
    title: findHeader(headers, ["title", "name"]) ?? "",
    contentType: findHeader(headers, ["contenttype", "content_type", "type"]) ?? "",
    fixedContentType: isLetterboxd ? "movie" : "",
    status: findHeader(headers, ["status"]) ?? "",
    fixedStatus: isLetterboxd ? "finished" : "",
    creator: findHeader(headers, ["creator", "author", "director", "channel", "publisher"]) ?? "",
    fixedCreator: "",
    description: findHeader(headers, ["description", "summary"]) ?? "",
    fixedDescription: "",
    coverUrl: findHeader(headers, ["coverurl", "cover_url", "cover", "image", "poster"]) ?? "",
    fixedCoverUrl: "",
    releaseDate: findHeader(headers, ["releasedate", "release_date", "date", "year"]) ?? "",
    fixedReleaseDate: "",
    rating: findHeader(headers, ["rating", "your rating", "my rating"]) ?? "",
    fixedRating: "",
    notes: findHeader(headers, ["notes", "note"]) ?? "",
    fixedNotes: "",
    sourceUrl: findHeader(headers, ["sourceurl", "source_url", "source", "url", "link", "letterboxd uri"]) ?? "",
    fixedSourceUrl: "",
  };
}

export function prepareMappedCsvImport(parsed: ParsedCsvFile, mapping: ManualCsvMapping): CsvImportPreparation {
  const items: CreateItemInput[] = [];
  const preview: CsvImportPreviewRow[] = [];
  const errors: { row: number; error: string }[] = [];

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const mappedTitle = getMappedCell(parsed.headers, row, mapping.title);
    const mappedContentType = mapping.fixedContentType || normalizeContentType(getMappedCell(parsed.headers, row, mapping.contentType));
    const mappedStatus = mapping.fixedStatus || normalizeStatus(getMappedCell(parsed.headers, row, mapping.status)) || "suggestions";
    const ratingValue = parseMappedRating(getMappedCell(parsed.headers, row, mapping.rating) || mapping.fixedRating);

    if (!mappedTitle.trim()) {
      errors.push({ row: rowNumber, error: "Missing title value for the selected title column." });
      return;
    }

    if (!mappedContentType) {
      errors.push({ row: rowNumber, error: "Missing or unsupported content type." });
      return;
    }

    const item: CreateItemInput = {
      title: mappedTitle.trim(),
      contentType: mappedContentType,
      status: mappedStatus,
      creator: (getMappedCell(parsed.headers, row, mapping.creator) || mapping.fixedCreator).trim() || undefined,
      description: (getMappedCell(parsed.headers, row, mapping.description) || mapping.fixedDescription).trim() || undefined,
      coverUrl: (getMappedCell(parsed.headers, row, mapping.coverUrl) || mapping.fixedCoverUrl).trim() || undefined,
      releaseDate: normalizeReleaseDate(getMappedCell(parsed.headers, row, mapping.releaseDate) || mapping.fixedReleaseDate) || undefined,
      rating: ratingValue ?? undefined,
      notes: (getMappedCell(parsed.headers, row, mapping.notes) || mapping.fixedNotes).trim() || undefined,
      sourceUrl: (getMappedCell(parsed.headers, row, mapping.sourceUrl) || mapping.fixedSourceUrl).trim() || undefined,
    };

    items.push(item);
    if (preview.length < 6) {
      preview.push({ rowNumber, ...item });
    }
  });

  return { items, preview, errors };
}

function normalizeHeader(value: string) {
  return value.replace(/\s+/g, "").replace(/-/g, "_").toLowerCase();
}

function findHeader(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
  return headers.find((header) => normalizedAliases.includes(normalizeHeader(header))) ?? null;
}

function getMappedCell(headers: string[], row: string[], headerName: string) {
  if (!headerName) return "";
  const index = headers.findIndex((header) => header === headerName);
  return index >= 0 ? (row[index] ?? "").trim() : "";
}

function normalizeContentType(value: string): ContentTypeId | null {
  return CONTENT_TYPE_ALIASES[value.replace(/\s+/g, "").toLowerCase()] ?? null;
}

function normalizeStatus(value: string): StatusId | null {
  return STATUS_ALIASES[value.replace(/\s+/g, "").toLowerCase()] ?? null;
}

function parseMappedRating(value: string) {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.min(5, Math.round(parsed)));
}

function normalizeReleaseDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^\d{4}$/.test(trimmed) ? trimmed : trimmed;
}
