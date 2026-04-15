// Gemini API service for SirajHub AI features.
// Model: gemini-2.5-flash (free tier: 20 req/day, 250K TPM)

// Model is now resolved per-user in ai.ts route handler (falls back to "gemini-2.5-flash")

export interface CategorizeResult {
  content_type: string;
  confidence: number;
  suggested_tags: string[];
  suggested_status: string;
}

export interface AnalysisResult {
  summary: string;
  key_points: string[];
  recommendation: string;
  mood?: string;
}

export interface RankedItem {
  id: string;
  rank: number;
  reason: string;
}

// ── Core Gemini fetch ─────────────────────────────────────────────────────────

async function callGemini(apiKey: string, model: string, prompt: string, schema: object): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");

  return JSON.parse(text);
}

// ── Auto-categorize (lightweight) ────────────────────────────────────────────
// Called on new item creation to confirm/correct content_type and suggest tags.

export async function categorizeItem(
  apiKey: string,
  model: string,
  item: {
    title: string;
    description?: string | null;
    sourceUrl?: string | null;
    contentType: string;
  }
): Promise<CategorizeResult> {
  let domain = "unknown";
  try {
    if (item.sourceUrl) domain = new URL(item.sourceUrl).hostname.replace("www.", "");
  } catch {
    // ignore invalid URLs
  }

  const prompt = `Classify this content item for a personal media tracker.
Title: ${item.title}
Description: ${item.description ?? "none"}
URL domain: ${domain}
Current type assigned by user: ${item.contentType}

Valid content types: book, movie, tv, podcast, youtube, article, tweet
Return the best matching type, your confidence (0-1), 1-4 short lowercase tags, and suggested status.`;

  return callGemini(apiKey, model, prompt, {
    type: "object",
    properties: {
      content_type: { type: "string" },
      confidence: { type: "number" },
      suggested_tags: { type: "array", items: { type: "string" } },
      suggested_status: { type: "string" },
    },
    required: ["content_type", "confidence", "suggested_tags", "suggested_status"],
  }) as Promise<CategorizeResult>;
}

// ── On-demand item analysis ───────────────────────────────────────────────────
// Generates a summary, key points, recommendation, and mood for any content item.

const TYPE_GUIDE: Record<string, string> = {
  book: "Focus on: main themes, writing style, key insights, and who would most enjoy it.",
  movie: "Focus on: premise, tone, cinematography, themes, and emotional impact (no spoilers).",
  tv: "Focus on: premise, pacing, season count/commitment, and what makes it worth watching.",
  podcast: "Focus on: topics covered, host style, episode quality, and target audience.",
  youtube: "Focus on: content type, production quality, creator style, and educational/entertainment value.",
  article: "Focus on: main argument, key takeaways, source credibility, and time investment.",
  tweet: "Focus on: the core idea, significance, and context of the observation.",
};

export async function analyzeItem(
  apiKey: string,
  model: string,
  item: {
    title: string;
    contentType: string;
    creator?: string | null;
    description?: string | null;
    releaseDate?: string | null;
    durationMins?: number | null;
  }
): Promise<AnalysisResult> {
  const guide = TYPE_GUIDE[item.contentType] ?? "Provide a general analysis.";

  const prompt = `Analyze this ${item.contentType} for a personal content tracker.
Title: ${item.title}
Creator/Author/Director/Channel: ${item.creator ?? "unknown"}
Release date: ${item.releaseDate ?? "unknown"}
Duration: ${item.durationMins != null ? `${item.durationMins} mins` : "unknown"}
Description: ${item.description ?? "none"}

${guide}

Be concise. Key points should be 2-4 bullets. Recommendation should be one sentence.
Mood is optional — include only for movies, TV, or books (e.g. "dark thriller", "feel-good comedy").`;

  return callGemini(apiKey, model, prompt, {
    type: "object",
    properties: {
      summary: { type: "string" },
      key_points: { type: "array", items: { type: "string" } },
      recommendation: { type: "string" },
      mood: { type: "string" },
    },
    required: ["summary", "key_points", "recommendation"],
  }) as Promise<AnalysisResult>;
}

// ── "Next to Consume" ranking ─────────────────────────────────────────────────
// Takes all suggestion-status items and returns them ranked best-first with reasoning.

export async function rankNextList(
  apiKey: string,
  model: string,
  suggestions: Array<{
    id: string;
    title: string;
    contentType: string;
    creator?: string | null;
    description?: string | null;
  }>,
  preferences: string | null
): Promise<RankedItem[]> {
  if (suggestions.length === 0) return [];

  const itemLines = suggestions
    .map((s) => `- [${s.id}] "${s.title}" (${s.contentType}${s.creator ? ` by ${s.creator}` : ""})`)
    .join("\n");

  const prefLine = preferences
    ? `User taste preferences: ${preferences}`
    : "No specific preferences provided — use general quality signals.";

  const prompt = `Rank these ${suggestions.length} content items from best to consume next (#1) to last.
${prefLine}

Items:
${itemLines}

Return all ${suggestions.length} items ranked. Each item needs its exact id, rank number (1 = best), and a brief 1-sentence reason.`;

  return callGemini(apiKey, model, prompt, {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        rank: { type: "integer" },
        reason: { type: "string" },
      },
      required: ["id", "rank", "reason"],
    },
  }) as Promise<RankedItem[]>;
}
