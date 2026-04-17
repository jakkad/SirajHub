import type { Item, SavedViewFilters } from "./api";

function normalizeString(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function matchesSavedViewFilters(item: Item, filters: SavedViewFilters) {
  if (filters.status && item.status !== filters.status) return false;
  if (filters.contentType && item.contentType !== filters.contentType) return false;
  if (filters.minScore != null && (item.suggestMetricFinal ?? -Infinity) < filters.minScore) return false;
  if (filters.maxDuration != null && (item.durationMins ?? Infinity) > filters.maxDuration) return false;
  if (filters.onlyTrending && !item.trendingBoostEnabled) return false;

  const query = normalizeString(filters.query);
  if (query) {
    const haystack = [item.title, item.creator, item.description].map(normalizeString).join(" ");
    if (!haystack.includes(query)) return false;
  }

  return true;
}

export function summarizeSavedViewFilters(filters: SavedViewFilters) {
  const parts: string[] = [];
  if (filters.status) parts.push(filters.status.replace("_", " "));
  if (filters.minScore != null) parts.push(`score ${filters.minScore}+`);
  if (filters.maxDuration != null) parts.push(`<= ${filters.maxDuration} min`);
  if (filters.onlyTrending) parts.push("trending only");
  if (filters.query) parts.push(`matches "${filters.query}"`);
  return parts.join(" · ") || "Custom view";
}
