import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";
import { STATUSES } from "../../lib/constants";

import type { SelectionProps } from "./TypePageLayout";
import { SelectionOverlay } from "./SelectionOverlay";

interface BookshelfViewProps {
  items: Item[];
  selectionProps?: SelectionProps;
}

function idToHash(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function hashToColor(hash: number) {
  const hue = hash % 360;
  const saturation = 34 + (hash % 26);
  const lightness = 28 + (hash % 18);
  return { hue, saturation, lightness };
}

function hasArabicText(value: string) {
  return /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(value);
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    hue: Math.round(h * 360),
    saturation: Math.round(s * 100),
    lightness: Math.round(l * 100),
  };
}

function useCoverColor(coverUrl: string | null, fallback: ReturnType<typeof hashToColor>) {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    setColor(fallback);
    if (!coverUrl) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 24;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;

        context.drawImage(img, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < pixels.length; i += 16) {
          const alpha = pixels[i + 3] ?? 0;
          if (alpha < 180) continue;
          r += pixels[i] ?? 0;
          g += pixels[i + 1] ?? 0;
          b += pixels[i + 2] ?? 0;
          count++;
        }

        if (!cancelled && count > 0) {
          const next = rgbToHsl(Math.round(r / count), Math.round(g / count), Math.round(b / count));
          setColor({
            hue: next.hue,
            saturation: Math.max(24, Math.min(next.saturation, 58)),
            lightness: Math.max(24, Math.min(next.lightness, 44)),
          });
        }
      } catch {
        if (!cancelled) setColor(fallback);
      }
    };

    img.onerror = () => {
      if (!cancelled) setColor(fallback);
    };
    img.src = coverUrl;

    return () => {
      cancelled = true;
    };
  }, [coverUrl, fallback.hue, fallback.lightness, fallback.saturation]);

  return color;
}

function Book({ item, selectionProps }: { item: Item; selectionProps?: SelectionProps }) {
  const hash = idToHash(item.id);
  const isArabicTitle = hasArabicText(item.title);
  
  // Deterministic spine generation
  const spineHeight = 180 + (hash % 100); // 180px - 280px height
  const spineWidth = 26 + (hash % 24);    // 26px - 50px width
  const coverWidth = spineHeight * 0.65;  // Native book aspect ratio (appx 2:3)
  
  const fallbackColor = hashToColor(hash);
  const coverColor = useCoverColor(item.coverUrl, fallbackColor);
  const spineColor = `hsl(${coverColor.hue}, ${coverColor.saturation}%, ${coverColor.lightness}%)`;
  const spineDark = `hsl(${coverColor.hue}, ${Math.min(coverColor.saturation + 8, 70)}%, ${Math.max(coverColor.lightness - 12, 12)}%)`;
  const spineLight = `hsl(${coverColor.hue}, ${Math.max(coverColor.saturation - 8, 18)}%, ${Math.min(coverColor.lightness + 14, 62)}%)`;
  const ornamentColor = coverColor.lightness > 36 ? "hsl(42 64% 22% / 0.72)" : "hsl(43 74% 76% / 0.78)";
  const textColor = coverColor.lightness > 36 ? "hsl(40 42% 12%)" : "hsl(42 78% 88%)";
  
  const bookCssVars = {
    '--spine-w': `${spineWidth}px`,
    '--cover-w': `${coverWidth}px`,
    '--spine-base': spineColor,
    '--spine-dark': spineDark,
    '--spine-light': spineLight,
    '--spine-ornament': ornamentColor,
    '--spine-text': textColor,
  } as React.CSSProperties;

  return (
    <Link to="/item/$id" params={{ id: item.id }} style={{ textDecoration: "none" }} className="block outline-none">
      <div
        className="group relative flex-shrink-0 flex items-end justify-center transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer overflow-hidden origin-bottom z-10 w-[var(--spine-w)] hover:w-[var(--cover-w)] hover:z-50 hover:shadow-[20px_20px_40px_rgba(0,0,0,0.4)] shadow-[4px_0_10px_rgba(0,0,0,0.2)] border-y border-r border-black/20"
        style={{
          height: spineHeight,
          ...bookCssVars,
        }}
      >
        {selectionProps?.isSelectionMode && (
          <SelectionOverlay 
            isSelected={selectionProps.selectedIds.has(item.id)} 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectionProps.toggleSelection(item.id);
            }} 
          />
        )}
        {/* Absolute Cover Container (Always rendered at coverWidth, hides behind spineWidth overflow otherwise) */}
        <div 
           className="absolute bottom-0 left-0 h-full transition-all duration-500"
           style={{ width: coverWidth, background: spineColor }}
        >
          {item.coverUrl ? (
             <img src={item.coverUrl} className="w-full h-full object-cover transition-all duration-300 contrast-125 saturate-110" alt={item.title} />
          ) : (
             <div className="w-full h-full flex items-center justify-center relative p-6 bg-gradient-to-br from-white/10 to-transparent">
               {/* Pattern overlay for books missing covers */}
               <div className="absolute inset-x-0 top-10 h-1 bg-black/20" />
               <div className="absolute inset-x-0 bottom-10 h-1 bg-black/20" />
               <span className="text-xl font-serif text-center font-bold tracking-tight drop-shadow-md line-clamp-4" style={{ color: textColor }}>{item.title}</span>
             </div>
          )}
          
          {/* Inner spine crease overlay to make it look like a real book cover fold */}
          <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Generated antique spine. It covers the clipped cover until hover reveals the real art. */}
        <div 
          className="absolute left-0 bottom-0 top-0 flex items-center justify-center overflow-hidden transition-opacity duration-300 group-hover:opacity-0 pointer-events-none"
          style={{ width: spineWidth }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--spine-dark)_0%,var(--spine-base)_18%,var(--spine-light)_48%,var(--spine-base)_75%,var(--spine-dark)_100%)]" />
          <div className="absolute inset-y-0 left-0 w-[3px] bg-black/35" />
          <div className="absolute inset-y-0 right-0 w-[2px] bg-white/20" />
          <div className="absolute inset-x-[18%] top-3 h-px bg-[var(--spine-ornament)]" />
          <div className="absolute inset-x-[24%] top-5 h-px bg-[var(--spine-ornament)] opacity-70" />
          <div className="absolute inset-x-[24%] bottom-5 h-px bg-[var(--spine-ornament)] opacity-70" />
          <div className="absolute inset-x-[18%] bottom-3 h-px bg-[var(--spine-ornament)]" />
          <div className="absolute left-1/2 top-9 h-6 w-px -translate-x-1/2 bg-[var(--spine-ornament)] opacity-60" />
          <div className="absolute bottom-9 left-1/2 h-6 w-px -translate-x-1/2 bg-[var(--spine-ornament)] opacity-60" />
          {isArabicTitle ? (
            <span
              className="relative block max-w-[72%] truncate whitespace-nowrap text-center font-semibold leading-none text-[var(--spine-text)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
              dir="rtl"
              style={{
                direction: "rtl",
                fontFamily: '"Noto Naskh Arabic", "Amiri", "Geeza Pro", "Arial", sans-serif',
                fontSize: Math.max(12, Math.min(spineWidth * 0.44, 17)),
                transform: "rotate(90deg)",
                unicodeBidi: "plaintext",
                width: spineHeight * 0.72,
              }}
            >
              {item.title}
            </span>
          ) : (
            <span
              className="relative whitespace-nowrap overflow-hidden font-serif font-semibold uppercase leading-none text-[var(--spine-text)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontSize: Math.max(10, Math.min(spineWidth * 0.34, 14)),
                letterSpacing: "0.11em",
                maxHeight: "76%",
              }}
            >
              {item.title}
            </span>
          )}
        </div>

      </div>
    </Link>
  );
}

function Shelf({ label, items, selectionProps }: { label: string; items: Item[]; selectionProps?: SelectionProps }) {
  if (items.length === 0) return null;

  return (
    <div className="mb-20">
      {/* Shelf label */}
      <h3 className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-4 pl-4 border-l-2 border-[var(--hero-accent)]">
        {label} <span className="opacity-50 ml-2">({items.length})</span>
      </h3>

      {/* Actual Physical Shelf Row Container */}
      <div className="w-full overflow-x-auto pb-8 pt-4 px-4 custom-scrollbar">
        {/* The Books */}
        <div className="flex items-end min-w-min" style={{ gap: "2px" }}>
          {items.map((item) => (
            <Book key={item.id} item={item} selectionProps={selectionProps} />
          ))}
        </div>
        
        {/* The Wooden/Concrete physical shelf line that books rest on */}
        <div className="w-full h-4 mt-0 bg-[hsl(var(--card))] rounded-b shadow-[0_15px_15px_-10px_rgba(0,0,0,0.3)] border-t-2 border-black/10 dark:border-white/5 relative z-0">
          <div className="w-full h-1 bg-black/10" />
        </div>
      </div>
    </div>
  );
}

export function BookshelfView({ items, selectionProps }: BookshelfViewProps) {
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground p-8">No books saved yet.</div>;
  }

  const shelves = STATUSES.map((s) => ({
    id: s.id,
    label: s.label,
    items: [...items.filter((i) => i.status === s.id)].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  })).filter((s) => s.items.length > 0);

  return (
    <div>
      {shelves.map((shelf) => (
        <Shelf key={shelf.id} label={shelf.label} items={shelf.items} selectionProps={selectionProps} />
      ))}
    </div>
  );
}
