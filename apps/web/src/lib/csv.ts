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

function normalizeHeader(value: string) {
  return value.replace(/\s+/g, "").replace(/-/g, "_").toLowerCase();
}

function normalizeContentType(value: string): ContentTypeId | null {
  return CONTENT_TYPE_ALIASES[value.replace(/\s+/g, "").toLowerCase()] ?? null;
}

function normalizeStatus(value: string): StatusId | null {
  return STATUS_ALIASES[value.replace(/\s+/g, "").toLowerCase()] ?? null;
}
