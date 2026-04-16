import { useAnalyzeItem, useSavedAnalysis } from "../hooks/useAI";
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

  const analysis = analysisState?.result;
  const job = analysisState?.job;

  function handleAnalyze() {
    queueAnalysis(item.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleAnalyze} disabled={queueing} variant="outline" size="sm">
          {queueing ? "Queueing…" : analysis ? "Refresh Analysis" : "Queue Analysis"}
        </Button>
        {onSuggestTags && analysis?.tagSuggestions.length ? (
          <Button onClick={() => onSuggestTags(analysis.tagSuggestions)} variant="secondary" size="sm">
            Use Suggested Tags
          </Button>
        ) : null}
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
            {analysisState?.modelUsed ? <Badge variant="outline">{analysisState.modelUsed}</Badge> : null}
          </div>
          <div>
            <AiLabel>Summary</AiLabel>
            <p className="m-0 text-sm leading-7 text-foreground">{analysis.summary}</p>
          </div>

          <div>
            <AiLabel>Content Analysis</AiLabel>
            <p className="m-0 text-sm leading-7 text-foreground">{analysis.contentAnalysis}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.45)] px-4 py-3">
              <AiLabel>Tag Suggestions</AiLabel>
              {analysis.tagSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.tagSuggestions.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              ) : (
                <p className="m-0 text-sm leading-6 text-muted-foreground">No suggested tags.</p>
              )}
            </div>

            <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.45)] px-4 py-3">
              <AiLabel>Topic Suggestions</AiLabel>
              {analysis.topicSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.topicSuggestions.map((topic) => (
                    <Badge key={topic} variant="outline">{topic}</Badge>
                  ))}
                </div>
              ) : (
                <p className="m-0 text-sm leading-6 text-muted-foreground">No suggested topics.</p>
              )}
            </div>
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
