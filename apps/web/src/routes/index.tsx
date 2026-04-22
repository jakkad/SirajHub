import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useItems, useSavedViews } from "../hooks/useItems";
import { TypeStats } from "../components/dashboard/TypeStats";
import { RecentlyAdded } from "../components/dashboard/RecentlyAdded";
import { InProgressItems } from "../components/dashboard/InProgressItems";
import { NextToConsume } from "../components/dashboard/NextToConsume";
import { ReminderInbox } from "../components/dashboard/ReminderInbox";
import { useLabs } from "../hooks/useLabs";
import { CONTENT_TYPES } from "../lib/constants";
import { matchesSavedViewFilters, summarizeSavedViewFilters } from "../lib/saved-views";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Sparkles, FolderArchive, Layers, PlayCircle, Clock } from "lucide-react";

const CONTENT_TYPE_ROUTE_MAP = {
  book: "/books",
  movie: "/movies",
  tv: "/tv",
  podcast: "/podcasts",
  youtube: "/videos",
  article: "/articles",
  tweet: "/tweets",
} as const;

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: allItems = [], isLoading } = useItems();
  const { labs } = useLabs();
  const { data: savedViewsData } = useSavedViews({ scope: "dashboard" }, { enabled: labs.smartViews });
  
  const suggestions = allItems.filter((item) => item.status === "suggestions");
  const inProgress = allItems.filter((item) => item.status === "in_progress");
  const finished = allItems.filter((item) => item.status === "finished");
  const completionRate = allItems.length > 0 ? Math.round((finished.length / allItems.length) * 100) : 0;
  
  const savedViews = labs.smartViews ? (savedViewsData?.views ?? []) : [];

  return (
    <div className="flex flex-col gap-10 pb-20 w-full overflow-hidden">
      
      {/* ─── RADIANT COMMAND CENTER HERO ──────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 lg:p-14 border border-[hsl(var(--border)_/_0.4)] shadow-[0_20px_50px_-20px_rgba(var(--primary)_/_0.2)] group w-full bg-[hsl(var(--card)_/_0.6)] backdrop-blur-3xl">
        {/* Soft immersive glowing blobs */}
        <div className="absolute top-0 right-0 w-full h-[50vh] bg-gradient-to-b from-[hsl(var(--primary)_/_0.15)] to-transparent opacity-80 pointer-events-none" />
        <div className="absolute -top-32 -right-32 size-[40vw] max-w-[600px] bg-[hsl(var(--primary)_/_0.15)] blur-3xl rounded-full pointer-events-none transition-transform duration-1000 group-hover:scale-105" />
        <div className="absolute -bottom-32 -left-32 size-[30vw] max-w-[400px] bg-[hsl(var(--accent)_/_0.1)] blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-10">
          <div className="max-w-2xl flex flex-col gap-4">
             <div className="flex items-center gap-3 mb-2">
                 <Sparkles className="size-5 text-[hsl(var(--primary))]" />
                 <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Control Room</span>
             </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] drop-shadow-sm">
              Your media universe,<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))]">perfectly synced.</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground/90 font-medium max-w-xl leading-relaxed mt-2">
              Everything you want to read, watch, and listen to, organized in one completely frictionless dashboard.
            </p>
          </div>

          {/* Consolidated Core Metrics Tile */}
          <div className="flex items-center gap-3 pb-2 w-full xl:w-auto">
            <MetricModule icon={<Layers />} label="Total Items" value={allItems.length} tone="hsl(var(--primary))" delay="0ms" />
            <MetricModule icon={<PlayCircle />} label="Active Now" value={inProgress.length} tone="hsl(var(--accent))" delay="100ms" />
            <MetricModule icon={<FolderArchive />} label="Completion" value={`${completionRate}%`} tone="hsl(var(--success))" delay="200ms" />
          </div>
        </div>
      </section>

      {/* ─── SMART VIEWS SHELF (Only rendered if available) ──────────────────── */}
      {labs.smartViews && savedViews.length > 0 && (
         <div className="w-full">
            <h3 className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-4 pl-3 border-l-2 border-[hsl(var(--primary)_/_0.5)]">Smart Views</h3>
            <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {savedViews.map((view) => {
                const matched = allItems.filter((item) => matchesSavedViewFilters(item, view.filters));
                const targetType = view.contentType ? CONTENT_TYPES.find((entry) => entry.id === view.contentType) : null;
                const urlTarget = view.contentType ? CONTENT_TYPE_ROUTE_MAP[view.contentType] : "/";
                
                return (
                  <Link key={view.id} to={urlTarget} className="no-underline shrink-0 group block outline-none">
                     <div className="paper-card rounded-3xl p-5 min-w-[280px] w-[300px] flex flex-col gap-3 border border-[hsl(var(--border)_/_0.6)] group-hover:border-[hsl(var(--primary)_/_0.3)] transition-all duration-300 group-hover:-translate-y-1 shadow-sm group-hover:shadow-[0_10px_30px_-10px_rgba(var(--primary)_/_0.2)]">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-bold text-foreground truncate ">{view.name}</span>
                            <span className="text-[11px] text-muted-foreground truncate">{summarizeSavedViewFilters(view.filters) || "All Items"}</span>
                          </div>
                          <Badge variant="outline" className="bg-background/50 backdrop-blur rounded-full px-2 py-0.5 text-xs text-foreground shrink-0 shadow-sm border-[hsl(var(--border)_/_0.7)] group-hover:bg-[hsl(var(--primary)_/_0.1)] group-hover:text-[hsl(var(--primary))] transition-colors border-0 ring-1 ring-inset">{matched.length}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                           <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest bg-[hsl(var(--secondary)_/_0.4)] text-muted-foreground">{targetType?.label || "Library"}</Badge>
                           {view.filters.status && <Badge variant="secondary" className="text-[10px] uppercase tracking-widest font-bold bg-[hsl(var(--secondary)_/_0.4)] text-muted-foreground">{view.filters.status.replace("_", " ")}</Badge>}
                        </div>
                     </div>
                  </Link>
                );
              })}
            </div>
         </div>
      )}

      {/* ─── 2-COLUMN FLOW LAYOUT ───────────────────────────────────────────── */}
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,380px)] w-full">
        
        {/* Main River (Left Column 65%) */}
        <div className="flex flex-col gap-14 w-full">
           
           {/* Section: Next to Consume */}
           <section className="w-full">
              <NextToConsume />
           </section>

           {/* Section: In Progress */}
           <section className="w-full">
              <div className="flex items-center justify-between mb-6">
                 <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                       <PlayCircle className="size-5 text-[hsl(var(--accent))]" /> Active Right Now
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Jump right back into the media currently holding your attention.</p>
                 </div>
                 <Badge variant="outline" className="border-[hsl(var(--accent)_/_0.3)] text-[hsl(var(--accent))] bg-[hsl(var(--accent)_/_0.05)] rounded-full px-3">{inProgress.length} active</Badge>
              </div>
              
              <div className="paper-card rounded-[2.5rem] p-6 sm:p-8 border border-[hsl(var(--border)_/_0.5)] shadow-sm w-full">
                {isLoading ? <Skeleton className="h-64 w-full rounded-2xl" /> : <InProgressItems items={allItems} />}
              </div>
           </section>
        </div>

        {/* Radar Sidebar (Right Column 35%) */}
        <div className="flex flex-col gap-8 w-full sticky top-10">
           
           {/* Reminder Inbox Widget */}
           {labs.reminders ? (
           <section className="soft-panel rounded-[2rem] p-6 border flex flex-col border-[hsl(var(--border)_/_0.7)] shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Clock className="size-4 text-[hsl(var(--primary))]" /> Reminder Inbox
                  </h3>
                  <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px]">Strong candidates pulled back into focus so they don't get buried.</p>
                </div>
              </div>
              <div className="w-full">
                <ReminderInbox limit={3} />
              </div>
           </section>
           ) : null}

           {/* Recently Added Widget */}
           <section className="paper-card rounded-[2rem] p-6 border flex flex-col border-[hsl(var(--border)_/_0.5)] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-bold">Recently Added</h3>
                 <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">Latest Saves</span>
              </div>
              <div className="w-full">
                {isLoading ? <Skeleton className="h-[400px] w-full rounded-[1.5rem]" /> : <RecentlyAdded items={allItems} />}
              </div>
           </section>

        </div>
      </div>

      {/* ─── LIBRARY TYPES FOOTER ───────────────────────────────────────────── */}
      <section className="mt-8 pt-8 border-t border-[hsl(var(--border)_/_0.5)] w-full">
        <div className="flex items-center justify-between mb-8 pl-3 border-l-2 border-[hsl(var(--accent)_/_0.5)]">
           <div>
              <h3 className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Library Snapshot</h3>
              <p className="text-xs text-muted-foreground opacity-70 mt-1">Global distribution of your saved media across different platforms.</p>
           </div>
        </div>
        <div className="w-full soft-panel rounded-[2.5rem] p-6 md:p-10 border-none shadow-none">
          <TypeStats items={allItems} />
        </div>
      </section>

    </div>
  );
}

{/* Micro Metric Tile Component optimized for the Hero Banner */}
function MetricModule({ label, value, tone, icon, delay }: { label: string; value: number | string; tone: string; icon: React.ReactNode; delay: string }) {
  return (
    <div 
      className="flex flex-col gap-2 rounded-3xl bg-[hsl(var(--background)_/_0.7)] backdrop-blur-xl border border-[hsl(var(--border)_/_0.6)] p-4 flex-1 min-w-[110px] xl:min-w-[130px] shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700" 
      style={{ animationDelay: delay, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-1.5 opacity-80" style={{ color: tone }}>
         <div className="[&>svg]:size-4">{icon}</div>
         <span className="text-[10px] uppercase font-bold tracking-widest max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      </div>
      <div className="text-2xl xl:text-3xl font-black tracking-tighter text-foreground drop-shadow-sm font-mono mt-1">{value}</div>
    </div>
  );
}
