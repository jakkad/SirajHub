import { useState } from "react";
import type { Item, AiAnalysis } from "../lib/api";
import { CONTENT_TYPES } from "../lib/constants";
import { useDeleteItem, useUpdateItem } from "../hooks/useItems";
import { useAnalyzeItem } from "../hooks/useAI";

interface Props {
  item: Item;
  isDragging?: boolean;
}

export function ItemCard({ item, isDragging }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const { mutate: updateItem } = useUpdateItem();
  const { mutate: deleteItem } = useDeleteItem();
  const { mutate: analyzeItem, isPending: analyzing, error: analyzeError } = useAnalyzeItem();

  const contentType = CONTENT_TYPES.find((t) => t.id === item.contentType);

  function handleAnalyze() {
    setMenuOpen(false);
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
    <div
      style={{
        background: "var(--color-surface)",
        border: isDragging
          ? "1px solid var(--color-accent)"
          : "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "12px",
        cursor: "grab",
        boxShadow: isDragging ? "0 8px 24px oklch(0% 0 0 / 0.4)" : "none",
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* Cover */}
      {item.coverUrl ? (
        <img
          src={item.coverUrl}
          alt={item.title}
          style={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            borderRadius: 6,
            marginBottom: 10,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: 70,
            borderRadius: 6,
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            background: "var(--color-surface-hover)",
          }}
        >
          {contentType?.icon ?? "📄"}
        </div>
      )}

      {/* Title */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.35,
          marginBottom: 3,
          paddingRight: 20,
        }}
      >
        {item.title}
      </div>

      {/* Creator */}
      {item.creator && (
        <div
          style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 8 }}
        >
          {item.creator}
        </div>
      )}

      {/* Content type badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {contentType && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 999,
              background: `color-mix(in oklch, ${contentType.color} 18%, transparent)`,
              color: contentType.color,
            }}
          >
            {contentType.label}
          </span>
        )}
        {item.rating != null && (
          <span style={{ fontSize: 11, color: "var(--color-muted)" }}>
            {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
          </span>
        )}
      </div>

      {/* AI Analysis panel */}
      {analysisOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--color-border)",
          }}
        >
          {analyzing && (
            <p style={{ fontSize: 11, color: "var(--color-muted)", margin: 0 }}>
              Analyzing…
            </p>
          )}
          {analyzeError && (
            <p style={{ fontSize: 11, color: "oklch(65% 0.2 25)", margin: 0 }}>
              {(analyzeError as Error).message}
            </p>
          )}
          {analysis && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {analysis.mood && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "color-mix(in oklch, var(--color-accent) 15%, transparent)",
                    color: "var(--color-accent)",
                    alignSelf: "flex-start",
                  }}
                >
                  {analysis.mood}
                </span>
              )}
              <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0, color: "var(--color-foreground)" }}>
                {analysis.summary}
              </p>
              {analysis.key_points.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                  {analysis.key_points.map((pt, i) => (
                    <li key={i} style={{ fontSize: 11, color: "var(--color-muted)", lineHeight: 1.4 }}>
                      {pt}
                    </li>
                  ))}
                </ul>
              )}
              <p
                style={{
                  fontSize: 11,
                  fontStyle: "italic",
                  color: "var(--color-muted)",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {analysis.recommendation}
              </p>
            </div>
          )}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setAnalysisOpen(false); }}
            style={{
              marginTop: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              color: "var(--color-muted)",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* 3-dot menu */}
      <div style={{ position: "absolute", top: 6, right: 6 }}>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "2px 5px",
            borderRadius: 4,
            color: "var(--color-muted)",
            fontSize: 15,
            lineHeight: 1,
          }}
        >
          ···
        </button>

        {menuOpen && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 10 }}
              onClick={() => setMenuOpen(false)}
            />
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 4px)",
                zIndex: 20,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                boxShadow: "0 4px 16px oklch(0% 0 0 / 0.3)",
                overflow: "hidden",
                minWidth: 140,
              }}
            >
              <MenuButton
                label={analysisOpen ? "Hide Analysis" : "Analyze"}
                onClick={handleAnalyze}
              />
              {item.status !== "archived" && (
                <MenuButton
                  label="Archive"
                  onClick={() => {
                    updateItem({ id: item.id, status: "archived" });
                    setMenuOpen(false);
                  }}
                />
              )}
              <MenuButton
                label="Delete"
                danger
                onClick={() => {
                  if (window.confirm(`Delete "${item.title}"?`)) {
                    deleteItem(item.id);
                  }
                  setMenuOpen(false);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuButton({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 14px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        color: danger ? "oklch(65% 0.2 25)" : "var(--color-foreground)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--color-surface-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}
