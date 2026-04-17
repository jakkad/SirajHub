import { MoreHorizontal, Sparkles, Trash2, Archive } from "lucide-react";
import { useState } from "react";

import type { Item } from "../lib/api";
import { CONTENT_TYPES } from "../lib/constants";
import { useAnalyzeItem, useSavedAnalysis } from "../hooks/useAI";
import { useDeleteItem, useUpdateItem } from "../hooks/useItems";
import type { Tag } from "../hooks/useTags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const { mutate: updateItem } = useUpdateItem();
  const { mutate: deleteItem } = useDeleteItem();
  const { data: analysisState, error: analyzeError } = useSavedAnalysis(item.id, analysisOpen);
  const { mutate: queueAnalysis, isPending: analyzing } = useAnalyzeItem(item.id);

  const contentType = CONTENT_TYPES.find((t) => t.id === item.contentType);
  const analysis = analysisState?.result;

  function handleAnalyze() {
    setAnalysisOpen(true);
    if (!analysisState?.result && !analysisState?.job) {
      queueAnalysis(item.id);
    }
  }

  return (
    <Card className={isDragging ? "rotate-1" : "transition-transform hover:-translate-y-0.5"}>
      <CardContent className="relative flex flex-col gap-3 p-3">
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-full border border-[hsl(var(--border))] bg-card p-2 shadow-[var(--shadow-subtle)]"
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
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  if (window.confirm(`Delete "${item.title}"?`)) {
                    deleteItem(item.id);
                  }
                }}
                className="text-destructive focus:text-destructive"
              >
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
          <div className="cover-frame flex h-28 items-center justify-center overflow-hidden rounded-[20px]">
            {item.coverUrl ? (
              <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl">{contentType?.icon ?? "📄"}</span>
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
          <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.45)] p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.9)]">
            {analyzing ? <p className="text-xs text-muted-foreground">Queueing analysis…</p> : null}
            {analyzeError ? <p className="text-xs text-destructive">{(analyzeError as Error).message}</p> : null}
            {analysisState?.job?.status === "queued" ? (
              <p className="text-xs text-muted-foreground">
                Queued for {new Date(analysisState.job.runAfter).toLocaleString()}
              </p>
            ) : null}
            {analysis ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs leading-5 text-foreground">{analysis.summary}</p>
                <p className="text-xs text-muted-foreground">{analysis.contentAnalysis}</p>
                {analysis.topicSuggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.topicSuggestions.slice(0, 3).map((topic) => (
                      <Badge key={topic} variant="outline">{topic}</Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : !analysisState?.job ? (
              <Button size="sm" variant="outline" onClick={() => queueAnalysis(item.id)}>
                Queue Analysis
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
