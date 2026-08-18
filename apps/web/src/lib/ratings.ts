export const RATING_MIN = 1;
export const RATING_MAX = 7;

export const RATING_LABELS = {
  1: "Worst thing",
  2: "Very Bad",
  3: "Bad",
  4: "Meh",
  5: "Good",
  6: "Very good",
  7: "Great",
} as const;

export type RatingValue = keyof typeof RATING_LABELS;

export const RATING_VALUES = Object.keys(RATING_LABELS).map(Number) as RatingValue[];

export function getRatingLabel(value: number | null | undefined) {
  return value != null && value in RATING_LABELS
    ? RATING_LABELS[value as RatingValue]
    : null;
}

export function parseSevenStarRating(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= RATING_MIN && parsed <= RATING_MAX
    ? (parsed as RatingValue)
    : null;
}

export function normalizeRatingScale(value: number, sourceMin: number, sourceMax: number) {
  if (!Number.isFinite(value) || value <= 0 || sourceMax <= sourceMin) return null;
  const clamped = Math.max(sourceMin, Math.min(sourceMax, value));
  return Math.round(
    RATING_MIN + ((clamped - sourceMin) / (sourceMax - sourceMin)) * (RATING_MAX - RATING_MIN),
  ) as RatingValue;
}
