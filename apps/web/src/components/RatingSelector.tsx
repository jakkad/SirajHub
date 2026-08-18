import { getRatingLabel, RATING_VALUES } from "../lib/ratings";

interface RatingSelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
}

export function RatingSelector({ value, onChange, className = "" }: RatingSelectorProps) {
  const label = getRatingLabel(value);

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Personal rating">
        {RATING_VALUES.map((rating) => (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${rating} ${rating === 1 ? "star" : "stars"} — ${getRatingLabel(rating)}`}
            onClick={() => onChange(value === rating ? null : rating)}
            className={`text-xl leading-none transition-all hover:scale-110 ${
              (value ?? 0) >= rating
                ? "opacity-100 drop-shadow-md"
                : "opacity-20 hover:opacity-50"
            }`}
            style={(value ?? 0) >= rating ? { color: "var(--hero-accent, hsl(var(--primary)))" } : undefined}
          >
            ★
          </button>
        ))}
      </div>
      <span className="min-w-[7.5rem] text-xs font-medium text-muted-foreground" aria-live="polite">
        {value && label ? `${value} — ${label}` : "Unrated"}
      </span>
    </div>
  );
}
