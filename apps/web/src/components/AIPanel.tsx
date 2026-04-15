import { useState } from "react";
import { useAnalyzeItem, useCategorizeItem } from "../hooks/useAI";
import type { Item } from "../lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AIPanelProps {
  item: Item;
  onSuggestTags?: (tags: string[]) => void;
}

export function AIPanel({ item, onSuggestTags }: AIPanelProps) {
  const { mutate: analyze, isPending: analyzing } = useAnalyzeItem();
  const { mutate: categorize, isPending: categorizing } = useCategorizeItem();
  const [analysis, setAnalysis] = useState<{
    summary: string;
    key_points: string[];
    recommendation: string;
    mood?: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  function handleAnalyze() {
    setAnalysisError(null);
    analyze(item.id, {
      onSuccess: (data) => setAnalysis(data.result),
      onError: (err) => setAnalysisError(err.message),
    });
  }

  function handleSuggestTags() {
    categorize(
      {
        title: item.title,
        description: item.description,
        sourceUrl: item.sourceUrl,
        contentType: item.contentType,
      },
      {
        onSuccess: (result) => {
          if (onSuggestTags) onSuggestTags(result.suggested_tags);
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleAnalyze} disabled={analyzing} variant="outline" size="sm">
          {analyzing ? "Analyzing…" : "✨ Analyze"}
        </Button>

        {onSuggestTags && (
          <Button onClick={handleSuggestTags} disabled={categorizing} variant="secondary" size="sm">
            {categorizing ? "…" : "Suggest Tags"}
          </Button>
        )}
      </div>

      {analysisError && (
        <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {analysisError}
        </div>
      )}

      {analysis && (
        <div className="flex flex-col gap-4">
          {analysis.mood ? <Badge variant="secondary" className="w-fit">{analysis.mood}</Badge> : null}
          <div>
            <AiLabel>Summary</AiLabel>
            <p className="m-0 text-sm leading-7 text-foreground">{analysis.summary}</p>
          </div>

          <div>
            <AiLabel>Key Points</AiLabel>
            <ul className="flex list-disc flex-col gap-1 pl-4">
              {analysis.key_points.map((pt, i) => (
                <li key={i} className="text-sm leading-6 text-foreground">
                  {pt}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.45)] px-4 py-3">
            <AiLabel>Recommendation</AiLabel>
            <p className="m-0 text-sm leading-6">{analysis.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AiLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </div>
  );
}
