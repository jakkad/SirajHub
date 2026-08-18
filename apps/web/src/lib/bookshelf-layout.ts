import type { Item } from "./api";

export const BOOK_THICKNESS_MIN = 0.2;
export const BOOK_THICKNESS_MAX = 0.5;
export const BOOK_THICKNESS_MISSING = 0.35;

export interface ShelfLayoutBook {
  item: Item;
  thickness: number;
  height: number;
  x: number;
  row: number;
}

export interface ShelfLayoutGroup {
  label: string;
  books: ShelfLayoutBook[];
  firstRow: number;
  rowCount: number;
}

export function pageCountToThickness(pageCount: number | null | undefined) {
  if (pageCount == null || !Number.isFinite(pageCount)) return BOOK_THICKNESS_MISSING;
  const clamped = Math.max(80, Math.min(1200, pageCount));
  return BOOK_THICKNESS_MIN + ((clamped - 80) / (1200 - 80)) * (BOOK_THICKNESS_MAX - BOOK_THICKNESS_MIN);
}

export function stableBookHash(id: string) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function packShelfGroups(groups: Array<{ label: string; items: Item[] }>, shelfWidth: number) {
  const safeWidth = Math.max(1.8, shelfWidth);
  const result: ShelfLayoutGroup[] = [];
  let rowOffset = 0;

  for (const group of groups) {
    let row = 0;
    let cursor = -safeWidth / 2;
    const books: ShelfLayoutBook[] = [];

    for (const item of group.items) {
      const thickness = pageCountToThickness(item.pageCount);
      const gap = 0.035;
      if (cursor + thickness > safeWidth / 2 && books.some((book) => book.row === rowOffset + row)) {
        row += 1;
        cursor = -safeWidth / 2;
      }
      books.push({
        item,
        thickness,
        height: 1.65 + (stableBookHash(item.id) % 27) / 100,
        x: cursor + thickness / 2,
        row: rowOffset + row,
      });
      cursor += thickness + gap;
    }

    for (let localRow = 0; localRow <= row; localRow += 1) {
      const rowBooks = books.filter((book) => book.row === rowOffset + localRow);
      if (!rowBooks.length) continue;
      const left = Math.min(...rowBooks.map((book) => book.x - book.thickness / 2));
      const right = Math.max(...rowBooks.map((book) => book.x + book.thickness / 2));
      const shift = -(left + right) / 2;
      rowBooks.forEach((book) => { book.x += shift; });
    }

    const rowCount = books.length ? row + 1 : 0;
    result.push({ label: group.label, books, firstRow: rowOffset, rowCount });
    rowOffset += rowCount;
  }

  return { groups: result, rowCount: rowOffset, shelfWidth: safeWidth };
}

export function finishedRatingGroups(items: Item[]) {
  const groups: Array<{ label: string; items: Item[] }> = [];
  const labels: Record<number, string> = {
    7: "7 — Great",
    6: "6 — Very good",
    5: "5 — Good",
    4: "4 — Meh",
    3: "3 — Bad",
    2: "2 — Very Bad",
    1: "1 — Worst thing",
  };
  for (let rating = 7; rating >= 1; rating -= 1) {
    const matching = items.filter((item) => item.rating === rating);
    if (matching.length) groups.push({ label: labels[rating]!, items: matching });
  }
  const unrated = items.filter((item) => item.rating == null);
  if (unrated.length) groups.push({ label: "Unrated", items: unrated });
  return groups;
}
