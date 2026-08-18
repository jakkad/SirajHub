import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "../../../lib/api";
import type { SelectionProps } from "../TypePageLayout";
import { Button } from "@/components/ui/button";
import type { ShelfEngine, ShelfTone } from "./ShelfEngine";

interface Props {
  groups: Array<{ label: string; items: Item[] }>;
  tone: ShelfTone;
  selectionProps?: SelectionProps;
  continuous?: boolean;
}

export function BookShelfScene({ groups, tone, selectionProps, continuous = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ShelfEngine | null>(null);
  const [activeBook, setActiveBook] = useState<Item | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const allBooks = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const positionMarkers = useMemo(() => {
    if (allBooks.length <= 48) return allBooks.map((book, index) => ({ book, index }));
    return Array.from({ length: 48 }, (_, marker) => {
      const index = Math.round((marker / 47) * (allBooks.length - 1));
      return { book: allBooks[index]!, index };
    });
  }, [allBooks]);
  const sceneKey = useMemo(() => `${continuous ? "continuous" : "rows"}:${groups.map((group) => `${group.label}:${group.items.map((item) => `${item.id}:${item.pageCount}:${item.coverUrl}`).join(",")}`).join("|")}`, [continuous, groups]);
  const selectedKey = selectionProps ? [...selectionProps.selectedIds].sort().join(",") : "";
  const estimatedRows = Math.max(groups.length, Math.ceil(allBooks.length / 14));
  const canvasHeight = continuous ? "clamp(620px, calc(100vh - 180px), 920px)" : Math.min(1180, Math.max(540, 540 + (estimatedRows - 1) * 300));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setReady(false);
    setError(null);
    let cancelled = false;
    let engine: ShelfEngine | null = null;
    void import("./ShelfEngine").then(({ ShelfEngine }) => {
      if (cancelled) return;
      try {
        engine = new ShelfEngine({
          canvas,
          groups,
          tone,
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          selectionMode: selectionProps?.isSelectionMode ?? false,
          selectedIds: selectionProps?.selectedIds ?? new Set(),
          onActivate: setActiveBook,
          onInspectionChange: setInspecting,
          onToggleSelection: (id) => selectionProps?.toggleSelection(id),
          continuous,
          onReady: () => setReady(true),
          onError: setError,
        });
        engineRef.current = engine;
      } catch {
        // The engine reports WebGL initialization failures through onError.
      }
    });
    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
    };
  }, [sceneKey, tone, compact, continuous]);

  useEffect(() => {
    engineRef.current?.setInteraction(selectionProps?.isSelectionMode ?? false, selectionProps?.selectedIds ?? new Set());
  }, [selectionProps?.isSelectionMode, selectedKey]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const observer = new IntersectionObserver(([entry]) => engineRef.current?.setPaused(!entry?.isIntersecting), { rootMargin: "200px" });
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const observer = new ResizeObserver(([entry]) => setCompact((entry?.contentRect.width ?? 0) < 640));
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  function closeInspection() {
    engineRef.current?.returnToShelf();
    setInspecting(false);
  }

  if (allBooks.length === 0) return null;

  return (
    <div
      ref={shellRef}
      className="relative overflow-hidden rounded-[28px] border border-black/10 bg-[#f2eee5] shadow-[0_24px_70px_-45px_rgba(61,39,21,.8)] dark:border-white/10"
      style={{ backgroundImage: "radial-gradient(rgba(72,59,45,.095) .75px, transparent .75px)", backgroundSize: "13px 13px" }}
    >
      {!ready && !error ? <div className="absolute inset-0 z-20 grid place-items-center bg-[#f1eadc]/90 text-sm text-[#5d4a38]">Preparing the library…</div> : null}
      {error ? <AccessibleShelf groups={groups} selectionProps={selectionProps} reason={error} /> : (
        <>
          <div className="pointer-events-none absolute inset-x-5 top-5 z-10 flex items-start justify-between gap-6 text-[10px] font-semibold uppercase tracking-[.24em] text-[#36312b] sm:inset-x-8 sm:top-7 sm:text-xs">
            <div className="flex max-w-[70%] flex-wrap items-center gap-x-3 gap-y-1">
              {groups.map((group) => <span key={group.label}>{group.label}</span>)}
              <span className="h-px w-8 bg-[#36312b]/40" />
              <span>Interactive 3D library</span>
            </div>
            <span className="shrink-0 text-right text-[#59534b]">{String(allBooks.length).padStart(2, "0")} volumes</span>
          </div>
          <canvas
            ref={canvasRef}
            tabIndex={0}
            aria-label={`${allBooks.length} books in an interactive 3D shelf. Use arrow keys to browse, Enter to inspect, and Escape to return.`}
            className="block w-full cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-600 active:cursor-grabbing"
            style={{ height: canvasHeight }}
          />
          <Button size="icon" variant="outline" className={`absolute bottom-14 left-4 z-10 size-12 rounded-full border-[#4e473e]/25 bg-[#f5f0e7]/75 text-[#29251f] backdrop-blur transition hover:bg-white sm:bottom-auto sm:left-7 sm:top-1/2 sm:size-14 sm:-translate-y-1/2 ${inspecting ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"}`} aria-label="Previous book" onClick={() => engineRef.current?.browseBy(-1)}><ChevronLeft className="size-5" /></Button>
          <Button size="icon" variant="outline" className={`absolute bottom-14 right-4 z-10 size-12 rounded-full border-[#4e473e]/25 bg-[#d9d3c9]/85 text-[#29251f] shadow-md backdrop-blur transition hover:bg-white sm:bottom-auto sm:right-7 sm:top-1/2 sm:size-14 sm:-translate-y-1/2 ${inspecting ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"}`} aria-label="Next book" onClick={() => engineRef.current?.browseBy(1)}><ChevronRight className="size-5" /></Button>
          <div className={`pointer-events-none absolute inset-x-[18%] bottom-6 z-10 flex items-end gap-7 transition sm:inset-x-[12%] sm:bottom-8 ${inspecting ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"}`}>
            <div
              className="pointer-events-auto grid h-5 min-w-0 flex-1 items-end"
              style={{ gridTemplateColumns: `repeat(${positionMarkers.length}, minmax(4px, 1fr))` }}
              aria-label="Book position markers"
            >
              {positionMarkers.map(({ book, index }) => (
                <button
                  key={book.id}
                  type="button"
                  className="group relative h-5 border-b border-[#332e28]/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#332e28]"
                  aria-label={`Go to ${book.title}`}
                  aria-current={activeBook?.id === book.id ? "true" : undefined}
                  onClick={() => engineRef.current?.focusIndex(index)}
                >
                  <span className={`absolute bottom-0 left-1/2 w-px -translate-x-1/2 bg-[#332e28] transition-all group-hover:h-4 ${activeBook?.id === book.id ? "h-5 opacity-100" : "h-2 opacity-45"}`} />
                </button>
              ))}
            </div>
            <div className="hidden shrink-0 items-center gap-2 text-[8px] font-semibold uppercase tracking-[.14em] text-[#625c54] lg:flex">
              <span>Drag</span><i className="size-0.5 rounded-full bg-current" /><span>Scroll</span><i className="size-0.5 rounded-full bg-current" /><span>Arrow keys</span>
            </div>
          </div>
          {activeBook ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 px-5 pb-5 pt-14 text-[#26221d] sm:inset-x-auto sm:bottom-[clamp(9rem,20%,14rem)] sm:left-[clamp(5.75rem,5.4vw,8rem)] sm:w-[min(430px,36%)] sm:p-0">
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#f2eee5] via-[#f2eee5]/95 to-transparent sm:-bottom-10 sm:-left-12 sm:-right-24 sm:-top-10 sm:bg-gradient-to-r sm:from-[#f2eee5] sm:via-[#f2eee5]/90 sm:to-transparent" />
              <div className="relative text-[10px] font-semibold uppercase tracking-[.2em] sm:text-xs">
                {String(Math.max(1, allBooks.findIndex((book) => book.id === activeBook.id) + 1)).padStart(2, "0")}
                <span className="mx-3 inline-block h-px w-10 align-middle bg-[#353029]/45" />
                {String(allBooks.length).padStart(2, "0")}
              </div>
              <h4 className="relative mt-4 line-clamp-3 max-w-[78vw] text-balance font-serif text-[clamp(2rem,10vw,3.5rem)] font-medium leading-[.92] tracking-[-.045em] sm:max-w-[430px] sm:text-[clamp(2.25rem,3.4vw,4.5rem)]">{activeBook.title}</h4>
              {activeBook.creator ? <p className="mt-4 font-serif text-base italic text-[#716a61] sm:text-xl">{activeBook.creator}</p> : null}
              <div className="mt-5 hidden text-[10px] font-medium uppercase tracking-[.16em] text-[#6c655d] sm:flex sm:gap-4">
                <span>{activeBook.pageCount?.toLocaleString() ?? "Unknown"} pages</span>
                <span>{activeBook.rating ? `${activeBook.rating} / 7` : "Unrated"}</span>
                <span className="capitalize">{activeBook.status.replace("_", " ")}</span>
              </div>
              <div className="pointer-events-auto mt-6 flex items-center gap-4">
                {inspecting ? (
                  <button type="button" className="group inline-flex items-center gap-3 border-b border-[#29251f]/70 pb-2 text-[11px] font-semibold uppercase tracking-[.18em] transition-colors hover:border-[#29251f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#29251f]/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#f2eee5]" onClick={closeInspection}>
                    <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                    Return to shelf
                  </button>
                ) : (
                  <Button variant="ghost" className="h-auto border-b border-[#29251f] px-0 py-2 text-[11px] font-semibold uppercase tracking-[.18em] hover:bg-transparent" onClick={() => engineRef.current?.inspect(activeBook.id)}>Inspect volume <ArrowUpRight className="ml-3 size-4" /></Button>
                )}
                <Link to="/item/$id" params={{ id: activeBook.id }} className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#6d655c] underline-offset-4 hover:underline">Full details</Link>
              </div>
            </div>
          ) : null}
        </>
      )}
      {!error ? <AccessibleShelf groups={groups} selectionProps={selectionProps} visuallyHidden={!selectionProps?.isSelectionMode} /> : null}
    </div>
  );
}

function AccessibleShelf({ groups, selectionProps, reason, visuallyHidden = false }: Pick<Props, "groups" | "selectionProps"> & { reason?: string; visuallyHidden?: boolean }) {
  return (
    <div className={visuallyHidden ? "sr-only" : "grid gap-6 bg-[#f7f0e4] p-6 text-[#382a20]"}>
      {reason ? <p role="status">The 3D shelf is unavailable ({reason}). All books remain accessible below.</p> : null}
      {groups.map((group) => (
        <section key={group.label}>
          <h4 className="font-serif text-lg font-semibold">{group.label}</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((book) => selectionProps?.isSelectionMode ? (
              <button key={book.id} type="button" onClick={() => selectionProps.toggleSelection(book.id)} aria-pressed={selectionProps.selectedIds.has(book.id)} className="rounded-xl border border-[#6e5845]/20 bg-white/60 p-3 text-left">
                {book.title} · {book.pageCount ? `${book.pageCount} pages` : "pages unknown"}
              </button>
            ) : (
              <Link key={book.id} to="/item/$id" params={{ id: book.id }} className="rounded-xl border border-[#6e5845]/20 bg-white/60 p-3">{book.title} · {book.pageCount ? `${book.pageCount} pages` : "pages unknown"}</Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
