import { useNextList } from "../../hooks/useAI";
import { useItems } from "../../hooks/useItems";
import { CONTENT_TYPES, type ContentTypeId } from "../../lib/constants";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, Sparkles, AlertCircle } from "lucide-react";

interface NextToConsumeProps {
  contentType?: ContentTypeId;
  title?: string;
  description?: string;
}

export function NextToConsume({
  contentType,
  title = "Next To Consume",
  description = "AI recommended queue.",
}: NextToConsumeProps) {
  const { data: aiData, isLoading } = useNextList(contentType);
  const { data: allItems = [] } = useItems();

  const ranked = aiData?.result ?? [];
  const itemMap = Object.fromEntries(allItems.map((i) => [i.id, i]));
  
  const getAiStatusBadge = () => {
    if (isLoading) return <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 animate-pulse"><Loader2 className="mr-1.5 size-3 animate-spin"/> Syncing</Badge>;
    if (!aiData?.job) return null;
    
    switch (aiData.job.status) {
      case "queued": return <Badge variant="secondary" className="bg-card/50 backdrop-blur"><Bot className="mr-1.5 size-3"/> Queued</Badge>;
      case "processing": return <Badge variant="outline" className="border-fuchsia-500/50 text-fuchsia-500 bg-fuchsia-500/10 animate-pulse"><Loader2 className="mr-1.5 size-3 animate-spin"/> Processing</Badge>;
      case "failed": return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-transparent"><AlertCircle className="mr-1.5 size-3"/> Scoring Failed</Badge>;
      case "completed": return <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10"><Sparkles className="mr-1.5 size-3"/> Scored</Badge>;
      default: return null;
    }
  };

  if (!isLoading && ranked.length === 0) return null;

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
               {title}
            </h2>
            {getAiStatusBadge()}
          </div>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>

      {ranked.length > 0 && (
         <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
           {ranked.slice(0, 5).map((r) => {
             const item = itemMap[r.id];
             if (!item) return null;
             const ct = CONTENT_TYPES.find((c) => c.id === item.contentType);
             return (
               <Link key={r.id} to="/item/$id" params={{ id: r.id }} className="block no-underline group h-full">
                 <div className="paper-card h-full rounded-3xl p-4 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 border border-[hsl(var(--border)_/_0.5)]">
                   
                   <div className="flex items-start gap-4">
                     <div className="cover-frame flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] shadow-sm">
                       {item.coverUrl ? (
                         <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                       ) : (
                         <span className="text-2xl">{ct?.icon ?? "📄"}</span>
                       )}
                     </div>
                     <div className="flex flex-col min-w-0">
                       <span className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.title}</span>
                       <span className="text-xs text-muted-foreground truncate">{item.creator || ct?.label}</span>
                     </div>
                   </div>

                   <div className="flex flex-col gap-2 mt-auto">
                     <div className="text-[11.5px] leading-relaxed text-muted-foreground line-clamp-3">
                       {r.explanation ?? "Waiting for AI score."}
                     </div>
                     <div className="flex items-center justify-between mt-1 pt-3 border-t border-[hsl(var(--border)_/_0.4)]">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70">AI Score</span>
                        <span className="text-lg font-bold font-mono text-primary">{r.score ?? "…"}</span>
                     </div>
                   </div>

                 </div>
               </Link>
             );
           })}
         </div>
      )}
    </div>
  );
}
