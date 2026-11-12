import { useUserSettings } from "../../hooks/useUser";
import type { Item } from "../../lib/api";
import { getRatingLabel, RATING_MAX } from "../../lib/ratings";

export function useFinishedYear() {
  const { data: settings, isPending } = useUserSettings();
  const showFinishedYear = settings?.showFinishedYear ?? !isPending;

  return (finishedAt: number | null) => {
    if (!showFinishedYear || finishedAt == null) return null;
    // The date editor stores calendar dates at UTC midnight.
    const year = new Date(finishedAt).getUTCFullYear();
    return Number.isFinite(year) ? year : null;
  };
}

export function CoverOverlay({ item, year }: {
  item: Pick<Item, "title" | "rating">;
  year: number | null;
}) {
  const { title, rating } = item;
  const stars = rating != null && getRatingLabel(rating) ? "★".repeat(rating) : "";
  const hasDetails = year != null || Boolean(stars);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 px-2.5 pt-7 pb-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:data-[has-details=true]:opacity-100"
      data-has-details={hasDetails}
      style={{ background: "linear-gradient(to top, oklch(0% 0 0 / 0.85) 0%, transparent 100%)" }}
    >
      <div dir="auto" className="truncate text-start text-[11px] font-bold leading-[1.3] text-white">
        {title}
      </div>
      {hasDetails && (
        <div dir="ltr" className="mt-[3px] flex items-center justify-between gap-1 text-[10px] text-white/70">
          {year != null && <span><span className="sr-only">Finished in </span>{year}</span>}
          {stars && (
            <span className="ml-auto whitespace-nowrap">
              <span className="sr-only">Rated {rating} out of {RATING_MAX}</span>
              <span aria-hidden="true">{stars}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
