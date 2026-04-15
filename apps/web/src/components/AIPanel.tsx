import { useAnalyzeItem, useCategorizeItem, useSavedAnalysis } from "../hooks/useAI";
import type { Item } from "../lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AIPanelProps {
  item: Item;
  onSuggestTags?: (tags: string[]) => void;
}

export function AIPanel({ item, onSuggestTags }: AIPanelProps) {
  const { data: analysisState, error: analysisError } = useSavedAnalysis(item.id);
  const { mutate: queueAnalysis, isPending: queueing } = useAnalyzeItem(item.id);
  const { mutate: categorize, isPending: categorizing } = useCategorizeItem();

  const analysis = analysisState?.result;
  const job = analysisState?.job;

  function handleAnalyze() {
    queueAnalysis(item.id);
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
        <Button onClick={handleAnalyze} disabled={queueing} variant="outline" size="sm">
          {queueing ? "Queueing…" : analysis ? "Refresh Analysis" : "Queue Analysis"}
        </Button>

        {onSuggestTags && (
          <Button onClick={handleSuggestTags} disabled={categorizing} variant="secondary" size="sm">
            {categorizing ? "…" : "Suggest Tags"}
          </Button>
        )}
      </div>

      {job ? (
        <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] px-4 py-3 text-sm text-muted-foreground">
          {job.status === "queued" ? `Analysis queued for ${new Date(job.runAfter).toLocaleString()}.` : null}
          {job.status === "processing" ? "Analysis is currently processing." : null}
          {job.status === "failed" ? `Last queue attempt failed: ${job.lastError ?? "Unknown error"}` : null}
          {job.status === "completed" && analysisState?.savedAt ? `Latest saved analysis updated ${new Date(analysisState.savedAt).toLocaleString()}.` : null}
        </div>
      ) : null}

      {analysisError ? (
        <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(analysisError as Error).message}
        </div>
      ) : null}

      {analysis ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {analysis.mood ? <Badge variant="secondary" className="w-fit">{analysis.mood}</Badge> : null}
            {analysisState?.modelUsed ? <Badge variant="outline">{analysisState.modelUsed}</Badge> : null}
          </div>
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
      ) : (
        <div className="rounded-[20px] border border-dashed border-[hsl(var(--border))] px-4 py-5 text-sm text-muted-foreground">
          No saved analysis yet. Queue one and it will be generated automatically using your AI queue interval.
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
