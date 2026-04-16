export interface AnalysisResult {
  summary: string;
  contentAnalysis: string;
  tagSuggestions: string[];
  topicSuggestions: string[];
}

export interface SuggestMetricResult {
  score: number;
  explanation: string;
  needsMoreInfo: boolean;
  moreInfoRequest: string | null;
}

function toTrimmedString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
}

async function callGemini(apiKey: string, model: string, prompt: string, schema: object): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const isGemmaModel = model.startsWith("gemma-");
  const effectivePrompt = isGemmaModel
    ? `${prompt}

Return only a valid JSON object matching this schema exactly:
${JSON.stringify(schema)}`
    : prompt;
  let lastParseError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await fetch(`${url}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: effectivePrompt }] }],
        generationConfig: isGemmaModel
          ? {
              temperature: 0.25,
              maxOutputTokens: 1400,
            }
          : {
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.25,
              maxOutputTokens: 1400,
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

    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      lastParseError = error instanceof Error ? error : new Error("Failed to parse Gemini JSON response");
      if (attempt === 1) {
        throw new Error(`${lastParseError.message}. Raw response: ${cleaned.slice(0, 300)}`);
      }
    }
  }

  throw lastParseError ?? new Error("Failed to parse Gemini response");
}

export async function analyzeItem(
  apiKey: string,
  model: string,
  promptTemplate: string,
  item: {
    title: string;
    contentType: string;
    creator?: string | null;
    description?: string | null;
    releaseDate?: string | null;
    durationMins?: number | null;
    sourceUrl?: string | null;
    metadata?: string | null;
    tags?: string[];
  }
): Promise<AnalysisResult> {
  const metadataBlock = item.metadata?.trim() ? item.metadata.slice(0, 2500) : "none";
  const tagBlock = item.tags && item.tags.length > 0 ? item.tags.join(", ") : "none";

  const prompt = `${promptTemplate}

Item metadata:
Title: ${item.title}
Content type: ${item.contentType}
Creator: ${item.creator ?? "unknown"}
Release date: ${item.releaseDate ?? "unknown"}
Duration: ${item.durationMins != null ? `${item.durationMins} mins` : "unknown"}
Source URL: ${item.sourceUrl ?? "unknown"}
Current tags: ${tagBlock}
Description: ${item.description ?? "none"}
Stored metadata: ${metadataBlock}

Return:
- summary: a short plain-English overview
- contentAnalysis: a more detailed paragraph on the content itself, value, tone, or themes
- tagSuggestions: 3-6 concise tags for organizing this item
- topicSuggestions: 3-6 concise topics/themes discussed or represented by this item

Stay practical and avoid filler.`;

  const result = await callGemini(apiKey, model, prompt, {
    type: "object",
    properties: {
      summary: { type: "string" },
      contentAnalysis: { type: "string" },
      tagSuggestions: { type: "array", items: { type: "string" } },
      topicSuggestions: { type: "array", items: { type: "string" } },
    },
    required: ["summary", "contentAnalysis", "tagSuggestions", "topicSuggestions"],
  }) as Partial<AnalysisResult>;

  return {
    summary: toTrimmedString(result.summary),
    contentAnalysis: toTrimmedString(result.contentAnalysis),
    tagSuggestions: toStringArray(result.tagSuggestions),
    topicSuggestions: toStringArray(result.topicSuggestions),
  };
}

export async function scoreSuggestMetric(
  apiKey: string,
  model: string,
  promptTemplate: string,
  item: {
    title: string;
    contentType: string;
    creator?: string | null;
    description?: string | null;
    sourceUrl?: string | null;
    releaseDate?: string | null;
    metadata?: string | null;
    analysisSummary?: string | null;
    analysisContent?: string | null;
    analysisTags?: string[];
    analysisTopics?: string[];
  },
  interestLines: string[]
): Promise<SuggestMetricResult> {
  let domain = "unknown";
  try {
    if (item.sourceUrl) domain = new URL(item.sourceUrl).hostname.replace("www.", "");
  } catch {
    // ignore invalid URLs
  }

  const safeInterestLines = Array.isArray(interestLines) ? interestLines : [];

  const interestBlock =
    safeInterestLines.length > 0
      ? safeInterestLines.map((entry) => `- ${entry}`).join("\n")
      : "- No custom interests configured for this media type.";

  const metadataBlock = item.metadata?.trim() ? item.metadata.slice(0, 2000) : "none";
  const analysisSummary = item.analysisSummary?.trim() || "none";
  const analysisContent = item.analysisContent?.trim() || "none";
  const analysisTags = Array.isArray(item.analysisTags) && item.analysisTags.length > 0 ? item.analysisTags.join(", ") : "none";
  const analysisTopics = Array.isArray(item.analysisTopics) && item.analysisTopics.length > 0 ? item.analysisTopics.join(", ") : "none";

  const prompt = `${promptTemplate}

Item metadata:
Title: ${item.title}
Content type: ${item.contentType}
Creator: ${item.creator ?? "unknown"}
Description: ${item.description ?? "none"}
Release date: ${item.releaseDate ?? "unknown"}
Source domain: ${domain}
Stored metadata: ${metadataBlock}
Saved analysis summary: ${analysisSummary}
Saved analysis content: ${analysisContent}
Saved analysis tag suggestions: ${analysisTags}
Saved analysis topic suggestions: ${analysisTopics}

Interest profile for this media type:
${interestBlock}

Return:
- score: integer from 0 to 1000
- explanation: one short explanation for the score
- needsMoreInfo: true if the item is too under-described to score confidently
- moreInfoRequest: one short sentence describing what extra info would improve the score, otherwise null

Always return a score even if needsMoreInfo is true.`;

  const result = await callGemini(apiKey, model, prompt, {
    type: "object",
    properties: {
      score: { type: "integer" },
      explanation: { type: "string" },
      needsMoreInfo: { type: "boolean" },
      moreInfoRequest: { type: "string", nullable: true },
    },
    required: ["score", "explanation", "needsMoreInfo", "moreInfoRequest"],
  }) as Partial<SuggestMetricResult>;

  return {
    score: Math.max(0, Math.min(1000, Math.round(typeof result.score === "number" ? result.score : 0))),
    explanation: toTrimmedString(result.explanation),
    needsMoreInfo: Boolean(result.needsMoreInfo),
    moreInfoRequest: toTrimmedString(result.moreInfoRequest, "") || null,
  };
}

export async function testGeminiModel(apiKey: string, model: string): Promise<void> {
  await callGemini(
    apiKey,
    model,
    "Return a JSON object with {\"ok\": true}.",
    {
      type: "object",
      properties: {
        ok: { type: "boolean" },
      },
      required: ["ok"],
    }
  );
}
