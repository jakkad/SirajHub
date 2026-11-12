import { useUserSettings } from "../../hooks/useUser";

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

export function CoverOverlay({ year, title, rating }: {
  year: number | null;
  title?: string;
  rating?: number | null;
}) {
  const stars = rating ? "★".repeat(rating) : "";
  if (!title && year == null && !stars) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 px-2.5 pt-7 pb-2.5 text-left opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:data-[has-year=true]:opacity-100"
      data-has-year={year != null}
      style={{ background: "linear-gradient(to top, oklch(0% 0 0 / 0.85) 0%, transparent 100%)" }}
    >
      {title && (
        <div dir="auto" className="line-clamp-2 text-start text-[11px] font-bold leading-[1.3] text-white">
          {title}
        </div>
      )}
      {(year != null || stars) && (
        <div className="mt-[3px] text-[10px] text-white/70">
          {year != null && <span><span className="sr-only">Finished in </span>{year}</span>}
          {year != null && stars && " · "}
          {stars}
        </div>
      )}
    </div>
  );
}
