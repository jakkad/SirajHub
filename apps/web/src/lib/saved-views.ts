import type { Item, ItemSortBy, SavedViewFilters, SortDirection } from "./api";

export const DEFAULT_SORT_BY: ItemSortBy = "updatedAt";
export const DEFAULT_SORT_DIRECTION: SortDirection = "desc";

function normalizeString(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function matchesSavedViewFilters(item: Item, filters: SavedViewFilters) {
  if (filters.status && item.status !== filters.status) return false;
  if (filters.contentType && item.contentType !== filters.contentType) return false;
  if (filters.minScore != null && (item.suggestMetricFinal ?? -Infinity) < filters.minScore) return false;
  if (filters.minRating != null && (item.rating ?? -Infinity) < filters.minRating) return false;
  if (filters.maxDuration != null && (item.durationMins ?? Infinity) > filters.maxDuration) return false;
  if (filters.onlyTrending && !item.trendingBoostEnabled) return false;

  const query = normalizeString(filters.query);
  if (query) {
    const haystack = [item.title, item.creator, item.description].map(normalizeString).join(" ");
    if (!haystack.includes(query)) return false;
  }

  return true;
}

function normalizeSortBy(value: ItemSortBy | undefined): ItemSortBy {
  return value ?? DEFAULT_SORT_BY;
}

function normalizeSortDirection(value: SortDirection | undefined): SortDirection {
  return value ?? DEFAULT_SORT_DIRECTION;
}

function parseDateValue(value: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareNullable<T>(a: T | null | undefined, b: T | null | undefined, direction: SortDirection) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const result = a > b ? 1 : a < b ? -1 : 0;
  return direction === "asc" ? result : -result;
}

function getSortValue(item: Item, sortBy: ItemSortBy): string | number | null {
  switch (sortBy) {
    case "score":
      return item.suggestMetricFinal;
    case "title":
      return normalizeString(item.title);
    case "creator":
      return normalizeString(item.creator);
    case "releaseDate":
      return parseDateValue(item.releaseDate);
    default:
      return item[sortBy];
  }
}

export function sortItems(items: Item[], filters: SavedViewFilters) {
  const sortBy = normalizeSortBy(filters.sortBy);
  const sortDirection = normalizeSortDirection(filters.sortDirection);

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const result = compareNullable(getSortValue(a.item, sortBy), getSortValue(b.item, sortBy), sortDirection);
      if (result !== 0) return result;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function summarizeSavedViewFilters(filters: SavedViewFilters) {
  const parts: string[] = [];
  if (filters.status) parts.push(filters.status.replace("_", " "));
  if (filters.minScore != null) parts.push(`score ${filters.minScore}+`);
  if (filters.minRating != null) parts.push(`rating ${filters.minRating}+`);
  if (filters.maxDuration != null) parts.push(`<= ${filters.maxDuration} min`);
  if (filters.onlyTrending) parts.push("trending only");
  if (filters.query) parts.push(`matches "${filters.query}"`);
  if (filters.sortBy && (filters.sortBy !== DEFAULT_SORT_BY || filters.sortDirection !== DEFAULT_SORT_DIRECTION)) {
    parts.push(`sort ${filters.sortBy} ${normalizeSortDirection(filters.sortDirection)}`);
  }
  return parts.join(" · ") || "Custom view";
}
