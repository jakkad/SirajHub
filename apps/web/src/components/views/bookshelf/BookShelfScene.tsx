import { ChevronLeft, ChevronRight, ExternalLink, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "../../../lib/api";
import type { SelectionProps } from "../TypePageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ShelfEngine, ShelfTone } from "./ShelfEngine";

interface Props {
  groups: Array<{ label: string; items: Item[] }>;
  tone: ShelfTone;
  selectionProps?: SelectionProps;
}

export function BookShelfScene({ groups, tone, selectionProps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ShelfEngine | null>(null);
  const [activeBook, setActiveBook] = useState<Item | null>(null);
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
  const sceneKey = useMemo(() => groups.map((group) => `${group.label}:${group.items.map((item) => `${item.id}:${item.pageCount}:${item.coverUrl}`).join(",")}`).join("|"), [groups]);
  const selectedKey = selectionProps ? [...selectionProps.selectedIds].sort().join(",") : "";
  const estimatedRows = Math.max(groups.length, Math.ceil(allBooks.length / 14));
  const canvasHeight = Math.min(720, Math.max(380, 270 + estimatedRows * 86));

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
          onToggleSelection: (id) => selectionProps?.toggleSelection(id),
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
  }, [sceneKey, tone, compact]);

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
    setActiveBook(null);
  }

  if (allBooks.length === 0) return null;

  return (
    <div ref={shellRef} className="relative overflow-hidden rounded-[28px] border border-black/10 bg-[#f1eadc] shadow-[0_24px_70px_-45px_rgba(61,39,21,.8)] dark:border-white/10">
      {!ready && !error ? <div className="absolute inset-0 z-20 grid place-items-center bg-[#f1eadc]/90 text-sm text-[#5d4a38]">Preparing the library…</div> : null}
      {error ? <AccessibleShelf groups={groups} selectionProps={selectionProps} reason={error} /> : (
        <>
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[52%] flex-wrap gap-1.5">
            {groups.map((group) => <span key={group.label} className="rounded-full border border-[#5f4934]/20 bg-[#fffaf0]/85 px-2.5 py-1 text-[10px] font-semibold text-[#5d4633] shadow-sm backdrop-blur">{group.label} · {group.items.length}</span>)}
          </div>
          <canvas
            ref={canvasRef}
            tabIndex={0}
            aria-label={`${allBooks.length} books in an interactive 3D shelf. Use arrow keys to browse, Enter to inspect, and Escape to return.`}
            className="block w-full cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-600 active:cursor-grabbing"
            style={{ height: canvasHeight }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#24170f]/70 via-[#24170f]/15 to-transparent p-4 pt-16">
            <div className="pointer-events-auto flex gap-2">
              <Button size="icon" variant="secondary" aria-label="Previous book" onClick={() => engineRef.current?.browseBy(-1)}><ChevronLeft className="size-4" /></Button>
              <Button size="icon" variant="secondary" aria-label="Next book" onClick={() => engineRef.current?.browseBy(1)}><ChevronRight className="size-4" /></Button>
            </div>
            <div className="pointer-events-auto flex max-w-[55%] flex-wrap justify-end gap-1" aria-label="Book position markers">
              {positionMarkers.map(({ book, index }) => (
                <button
                  key={book.id}
                  type="button"
                  className="size-2.5 rounded-full border border-white/60 bg-white/35 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={`Go to ${book.title}`}
                  onClick={() => engineRef.current?.focusIndex(index)}
                />
              ))}
            </div>
          </div>
          {activeBook ? (
            <div className="absolute inset-x-4 top-4 z-10 ml-auto w-[min(92%,340px)] rounded-3xl border border-white/40 bg-[#fffaf0]/95 p-5 text-[#35261c] shadow-2xl backdrop-blur dark:border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Badge variant="outline" className="border-[#715944]/25 bg-white/40 text-[#5c4736]">Inspection view</Badge>
                  <h4 className="mt-3 text-balance font-serif text-2xl font-semibold leading-tight">{activeBook.title}</h4>
                  {activeBook.creator ? <p className="mt-1 text-sm text-[#6e5948]">{activeBook.creator}</p> : null}
                </div>
                <Button size="icon" variant="ghost" aria-label="Return book to shelf" onClick={closeInspection}><RotateCcw className="size-4" /></Button>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs uppercase tracking-wide text-[#806b58]">Pages</dt><dd className="font-semibold">{activeBook.pageCount?.toLocaleString() ?? "Unknown"}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-[#806b58]">Rating</dt><dd className="font-semibold">{activeBook.rating ? `${activeBook.rating} / 7` : "Unrated"}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-[#806b58]">Status</dt><dd className="font-semibold capitalize">{activeBook.status.replace("_", " ")}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-[#806b58]">Progress</dt><dd className="font-semibold">{activeBook.progressPercent == null ? "—" : `${activeBook.progressPercent}%`}</dd></div>
              </dl>
              <Button asChild className="mt-5 w-full bg-[#5b3d29] text-[#fff8eb] hover:bg-[#432d20]">
                <a href={`/item/${activeBook.id}`}>Open full details <ExternalLink className="ml-2 size-4" /></a>
              </Button>
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
              <a key={book.id} href={`/item/${book.id}`} className="rounded-xl border border-[#6e5845]/20 bg-white/60 p-3">{book.title} · {book.pageCount ? `${book.pageCount} pages` : "pages unknown"}</a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
