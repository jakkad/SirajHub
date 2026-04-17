import { Link } from "@tanstack/react-router";
import type { Item } from "../../lib/api";
import { STATUSES } from "../../lib/constants";

interface BookshelfViewProps {
  items: Item[];
}

function idToHash(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function Book({ item }: { item: Item }) {
  const hash = idToHash(item.id);
  
  // Deterministic spine generation
  const spineHeight = 180 + (hash % 100); // 180px - 280px height
  const spineWidth = 26 + (hash % 24);    // 26px - 50px width
  const coverWidth = spineHeight * 0.65;  // Native book aspect ratio (appx 2:3)
  
  const hue = hash % 360;
  const saturation = 40 + (hash % 40);
  const lightness = 20 + (hash % 30);
  
  const spineColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const textColor = lightness > 45 ? '#000' : '#fff';
  
  const bookCssVars = {
    '--spine-w': `${spineWidth}px`,
    '--cover-w': `${coverWidth}px`,
    '--current-w': 'var(--spine-w)',
  } as React.CSSProperties;

  return (
    <Link to="/item/$id" params={{ id: item.id }} style={{ textDecoration: "none" }} className="block outline-none">
      <div
        className="group relative flex-shrink-0 flex items-end justify-center transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer overflow-hidden origin-bottom z-10 hover:z-50 hover:shadow-[20px_20px_40px_rgba(0,0,0,0.4)] shadow-[4px_0_10px_rgba(0,0,0,0.2)] border-y border-r border-black/20"
        style={{
          height: spineHeight,
          width: 'var(--current-w)',
          ...bookCssVars,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.setProperty('--current-w', 'var(--cover-w)');
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.setProperty('--current-w', 'var(--spine-w)');
        }}
      >
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

        {/* The Spine Text overlay (Fades out seamlessly when width expands) */}
        <div 
          className="absolute left-0 bottom-0 top-0 flex items-center justify-center bg-black/30 group-hover:bg-transparent transition-colors duration-500 pointer-events-none"
          style={{ width: spineWidth }}
        >
          <span
            className="whitespace-nowrap font-bold tracking-widest break-words overflow-hidden opacity-100 group-hover:opacity-0 transition-opacity duration-300 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: Math.max(10, Math.min(spineWidth * 0.45, 18)),
              maxHeight: "92%",
            }}
          >
            {item.title}
          </span>
        </div>

      </div>
    </Link>
  );
}

function Shelf({ label, items }: { label: string; items: Item[] }) {
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
            <Book key={item.id} item={item} />
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

export function BookshelfView({ items }: BookshelfViewProps) {
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
        <Shelf key={shelf.id} label={shelf.label} items={shelf.items} />
      ))}
    </div>
  );
}
