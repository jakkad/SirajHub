import { useState } from "react";
import { useAnalyzeItem, useCategorizeItem } from "../hooks/useAI";
import type { Item } from "../lib/api";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--color-accent)",
            background: "transparent",
            color: "var(--color-accent)",
            fontSize: 12,
            fontWeight: 600,
            cursor: analyzing ? "not-allowed" : "pointer",
            opacity: analyzing ? 0.7 : 1,
          }}
        >
          {analyzing ? "Analyzing…" : "✨ Analyze"}
        </button>

        {onSuggestTags && (
          <button
            onClick={handleSuggestTags}
            disabled={categorizing}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px dashed var(--color-accent)",
              background: "transparent",
              color: "var(--color-accent)",
              fontSize: 12,
              fontWeight: 600,
              cursor: categorizing ? "not-allowed" : "pointer",
              opacity: categorizing ? 0.7 : 1,
            }}
          >
            {categorizing ? "…" : "Suggest Tags"}
          </button>
        )}
      </div>

      {analysisError && (
        <div style={{ fontSize: 12, color: "oklch(65% 0.2 25)", padding: "8px 10px", borderRadius: 8, background: "oklch(18% 0.04 25)", border: "1px solid oklch(30% 0.08 25)" }}>
          {analysisError}
        </div>
      )}

      {analysis && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {analysis.mood && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: 999,
                background: "var(--color-surface-hover)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-muted)",
                width: "fit-content",
              }}
            >
              {analysis.mood}
            </div>
          )}

          <div>
            <AiLabel>Summary</AiLabel>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "var(--color-foreground)" }}>
              {analysis.summary}
            </p>
          </div>

          <div>
            <AiLabel>Key Points</AiLabel>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {analysis.key_points.map((pt, i) => (
                <li key={i} style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-foreground)" }}>
                  {pt}
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "oklch(20% 0.04 265 / 0.3)",
              border: "1px solid oklch(35% 0.08 265 / 0.4)",
            }}
          >
            <AiLabel>Recommendation</AiLabel>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{analysis.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AiLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
      {children}
    </div>
  );
}
