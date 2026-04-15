import { MoreHorizontal, Sparkles, Trash2, Archive } from "lucide-react";
import { useState } from "react";

import type { Item, AiAnalysis } from "../lib/api";
import { CONTENT_TYPES } from "../lib/constants";
import { useAnalyzeItem } from "../hooks/useAI";
import { useDeleteItem, useUpdateItem } from "../hooks/useItems";
import type { Tag } from "../hooks/useTags";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  item: Item;
  isDragging?: boolean;
  allTags?: Tag[];
  onTitleClick?: () => void;
}

export function ItemCard({ item, isDragging, allTags = [], onTitleClick }: Props) {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const { mutate: updateItem } = useUpdateItem();
  const { mutate: deleteItem } = useDeleteItem();
  const { mutate: analyzeItem, isPending: analyzing, error: analyzeError } = useAnalyzeItem();

  const contentType = CONTENT_TYPES.find((t) => t.id === item.contentType);

  function handleAnalyze() {
    setAnalysisOpen(true);
    if (!analysis) {
      analyzeItem(item.id, {
        onSuccess(data) {
          setAnalysis(data.result);
        },
      });
    }
  }

  return (
    <Card className={isDragging ? "rotate-1" : "transition-transform hover:-translate-y-1"}>
      <CardContent className="relative flex flex-col gap-3 p-3">
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-full border-2 border-[hsl(var(--border-strong))] bg-background p-2 shadow-[2px_2px_0_hsl(var(--shadow-ink))]"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAnalyze}>
                <Sparkles />
                {analysisOpen ? "Show Analysis" : "Analyze"}
              </DropdownMenuItem>
              {item.status !== "archived" ? (
                <DropdownMenuItem onClick={() => updateItem({ id: item.id, status: "archived" })}>
                  <Archive />
                  Archive
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => window.confirm(`Delete "${item.title}"?`) && deleteItem(item.id)} className="text-destructive focus:text-destructive">
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div
          onClick={onTitleClick ? (e) => { e.stopPropagation(); onTitleClick(); } : undefined}
          onPointerDown={onTitleClick ? (e) => e.stopPropagation() : undefined}
          className="cursor-pointer"
        >
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-[20px] border-2 border-[hsl(var(--border-strong))] bg-secondary">
            {item.coverUrl ? (
              <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-4xl">{contentType?.icon ?? "📄"}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div
            onClick={onTitleClick ? (e) => { e.stopPropagation(); onTitleClick(); } : undefined}
            onPointerDown={onTitleClick ? (e) => e.stopPropagation() : undefined}
            className="line-clamp-2 cursor-pointer text-sm font-semibold text-foreground"
          >
            {item.title}
          </div>
          {item.creator ? <div className="text-xs text-muted-foreground">{item.creator}</div> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {contentType ? <Badge variant="outline">{contentType.label}</Badge> : null}
          {item.rating != null ? <Badge variant="secondary">{`${item.rating}/5`}</Badge> : null}
        </div>

        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="outline" style={{ color: tag.color }}>
                {tag.name}
              </Badge>
            ))}
            {allTags.length > 3 ? <Badge variant="outline">+{allTags.length - 3}</Badge> : null}
          </div>
        ) : null}

        {analysisOpen ? (
          <div className="rounded-[20px] border-2 border-[hsl(var(--border-strong))] bg-background p-3 shadow-[3px_3px_0_hsl(var(--shadow-ink))]">
            {analyzing ? <p className="text-xs text-muted-foreground">Analyzing…</p> : null}
            {analyzeError ? <p className="text-xs text-destructive">{(analyzeError as Error).message}</p> : null}
            {analysis ? (
              <div className="flex flex-col gap-2">
                {analysis.mood ? <Badge variant="secondary" className="w-fit">{analysis.mood}</Badge> : null}
                <p className="text-xs leading-5 text-foreground">{analysis.summary}</p>
                {analysis.key_points.length > 0 ? (
                  <ul className="list-disc pl-4 text-xs text-muted-foreground">
                    {analysis.key_points.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-xs italic text-muted-foreground">{analysis.recommendation}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
