import type { ContentTypeId, StatusId } from "./constants";

export type InterestWeight = "low" | "medium" | "high";
export interface InterestChip {
  id: string;
  label: string;
  weight: InterestWeight;
}

export type InterestProfiles = Partial<Record<ContentTypeId, InterestChip[]>>;
export interface AiPrompts {
  analyze: string;
  score: string;
}

export interface AiModelDescriptor {
  id: string;
  label: string;
  description: string;
  family: "gemini" | "gemma";
  supportLevel: "stable" | "experimental";
  capabilities: {
    analyze: "schema" | "prompt_json";
    score: "schema" | "prompt_json";
  };
}

// ── Item type (mirrors DB schema) ─────────────────────────────────────────────

export interface Item {
  id: string;
  userId: string;
  contentType: ContentTypeId;
  status: StatusId;
  title: string;
  subtitle: string | null;
  creator: string | null;
  description: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  durationMins: number | null;
  sourceUrl: string | null;
  externalId: string | null;
  metadata: string | null;
  position: number | null;
  rating: number | null;
  notes: string | null;
  progressPercent: number | null;
  progressCurrent: number | null;
  progressTotal: number | null;
  lastTouchedAt: number | null;
  suggestMetricBase: number | null;
  suggestMetricFinal: number | null;
  suggestMetricUpdatedAt: number | null;
  suggestMetricReason: string | null;
  suggestMetricNeedsMoreInfo: boolean;
  suggestMetricMoreInfoRequest: string | null;
  suggestMetricModelUsed: string | null;
  trendingBoostEnabled: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateItemInput {
  title: string;
  contentType: ContentTypeId;
  status?: StatusId;
  creator?: string;
  description?: string;
  coverUrl?: string;
  releaseDate?: string;
  rating?: number;
  notes?: string;
  sourceUrl?: string;
  externalId?: string;
  progressPercent?: number | null;
  progressCurrent?: number | null;
  progressTotal?: number | null;
}

export interface DuplicateItemSummary {
  id: string;
  title: string;
  creator: string | null;
  contentType: ContentTypeId;
  status: StatusId;
  coverUrl: string | null;
  sourceUrl: string | null;
  reason: "source_url" | "external_id" | "title_creator";
}

export interface DuplicateGroup {
  id: string;
  reason: "source_url" | "external_id" | "title_creator";
  items: Array<{
    id: string;
    title: string;
    creator: string | null;
    contentType: ContentTypeId;
    status: StatusId;
    coverUrl: string | null;
    sourceUrl: string | null;
    updatedAt: number;
  }>;
}

export interface BulkImportResult {
  created: Item[];
  createdCount: number;
  duplicateCount: number;
  failedCount: number;
  duplicates: { row: number; title?: string; duplicate: DuplicateItemSummary }[];
  errors: { row: number; title?: string; error: string }[];
  importJobId: string;
}

export interface ImportRowInput extends CreateItemInput {
  sourceRecordId?: string;
  sourceMetadata?: unknown;
}

export type UpdateItemInput = Partial<
  Pick<Item,
    | "title" | "contentType" | "status" | "creator" | "description"
    | "coverUrl" | "releaseDate" | "sourceUrl" | "rating" | "notes" | "position"
    | "trendingBoostEnabled"
    | "externalId"
    | "progressPercent" | "progressCurrent" | "progressTotal" | "lastTouchedAt"
    | "startedAt" | "finishedAt"
  >
>;

// ── Fetch helper ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError((body as { error?: string }).error ?? `HTTP ${res.status}`, res.status, body);
  }
  return res.json() as Promise<T>;
}

// ── Ingest / metadata fetch ───────────────────────────────────────────────────

export interface FetchedMetadata {
  title: string;
  contentType: ContentTypeId;
  creator?: string;
  description?: string;
  coverUrl?: string;
  releaseDate?: string;
  durationMins?: number;
  sourceUrl?: string;
  externalId?: string;
  metadata?: string;
}

export interface SearchSuggestion {
  provider: string;
  contentType: ContentTypeId;
  title: string;
  creator?: string;
  description?: string;
  coverUrl?: string;
  releaseDate?: string;
  sourceUrl?: string;
  externalId?: string;
  metadata?: string;
}

export const ingestApi = {
  fetch(input: {
    url?: string;
    query?: string;
    content_type?: ContentTypeId;
  }): Promise<FetchedMetadata> {
    return request<FetchedMetadata>("/api/ingest", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  search(input: {
    query: string;
    content_type: ContentTypeId;
  }): Promise<{ suggestions: SearchSuggestion[] }> {
    return request<{ suggestions: SearchSuggestion[] }>("/api/ingest/search", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  resolve(suggestion: SearchSuggestion): Promise<FetchedMetadata> {
    return request<FetchedMetadata>("/api/ingest/resolve", {
      method: "POST",
      body: JSON.stringify({ suggestion }),
    });
  },
};

// ── AI API ────────────────────────────────────────────────────────────────────

export interface AiAnalysis {
  summary: string;
  contentAnalysis: string;
  tagSuggestions: string[];
  topicSuggestions: string[];
}

export interface RankedSuggestion {
  id: string;
  score: number | null;
  baseScore: number | null;
  explanation: string | null;
  boosts: {
    recent: number;
    trending: number;
  };
  pending: boolean;
  updatedAt: number | null;
  needsMoreInfo: boolean;
  moreInfoRequest: string | null;
  modelUsed: string | null;
}

export interface AiJobSummary {
  id: string;
  itemId?: string | null;
  jobType: "analyze_item" | "score_item";
  status: "queued" | "processing" | "completed" | "failed";
  runAfter: number;
  completedAt: number | null;
  lastError: string | null;
  result: unknown | null;
  modelUsed: string | null;
  modelFamily: "gemini" | "gemma" | null;
  supportLevel: "stable" | "experimental" | null;
  attempts: number;
  createdAt: number;
  updatedAt: number;
}

export interface AiQueueJob extends AiJobSummary {
  itemTitle?: string | null;
}

export interface SavedAnalysisResponse {
  cached: boolean;
  result: AiAnalysis | null;
  savedAt: number | null;
  modelUsed: string | null;
  job: AiJobSummary | null;
}

export interface QueuedAnalysisResponse {
  queued: boolean;
  result: AiAnalysis | null;
  savedAt: number | null;
  modelUsed: string | null;
  intervalMinutes: number;
  job: AiJobSummary;
}

export interface QueuedScoreResponse {
  queued: boolean;
  intervalMinutes: number;
  job: AiJobSummary;
}

export interface NextListResponse {
  result: RankedSuggestion[];
  savedAt: number | null;
  modelUsed: string | null;
  job: AiJobSummary | null;
}

export const aiApi = {
  getAnalysis(itemId: string): Promise<SavedAnalysisResponse> {
    return request(`/api/ai/analyze/${itemId}`);
  },

  analyze(itemId: string): Promise<QueuedAnalysisResponse> {
    return request(`/api/ai/analyze/${itemId}`, { method: "POST" });
  },

  score(itemId: string): Promise<QueuedScoreResponse> {
    return request(`/api/ai/score/${itemId}`, { method: "POST" });
  },

  getNextList(contentType?: string): Promise<NextListResponse> {
    const params = new URLSearchParams();
    if (contentType) params.set("content_type", contentType);
    const qs = params.toString();
    return request(`/api/ai/next${qs ? `?${qs}` : ""}`);
  },

  listJobs(): Promise<{ jobs: AiQueueJob[] }> {
    return request("/api/ai/jobs");
  },

  retryJob(jobId: string): Promise<{ ok: true; job: AiJobSummary }> {
    return request(`/api/ai/jobs/${jobId}/retry`, { method: "POST" });
  },

  repeatJob(jobId: string): Promise<{ ok: true; job: AiJobSummary }> {
    return request(`/api/ai/jobs/${jobId}/repeat`, { method: "POST" });
  },

  deleteJob(jobId: string): Promise<{ ok: true }> {
    return request(`/api/ai/jobs/${jobId}`, { method: "DELETE" });
  },
};

// ── Tags API ──────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export const tagsApi = {
  list(): Promise<Tag[]> {
    return request<Tag[]>("/api/tags");
  },

  create(data: { name: string; color?: string }): Promise<Tag> {
    return request<Tag>("/api/tags", { method: "POST", body: JSON.stringify(data) });
  },

  delete(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/tags/${id}`, { method: "DELETE" });
  },

  getItemTags(itemId: string): Promise<Tag[]> {
    return request<Tag[]>(`/api/tags/item/${itemId}`);
  },

  addToItem(itemId: string, tagId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/tags/item/${itemId}`, {
      method: "POST",
      body: JSON.stringify({ tagId }),
    });
  },

  removeFromItem(itemId: string, tagId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/tags/item/${itemId}/${tagId}`, { method: "DELETE" });
  },
};

// ── User API ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: string | null;
}

export const userApi = {
  getMe(): Promise<UserProfile> {
    return request<UserProfile>("/api/user/me");
  },

  updateMe(data: { name?: string; preferences?: string }): Promise<UserProfile> {
    return request<UserProfile>("/api/user/me", { method: "PATCH", body: JSON.stringify(data) });
  },

  exportItems(): Promise<Response> {
    return fetch("/api/user/export", { credentials: "include" });
  },

  clearAiCache(): Promise<{ ok: boolean; cleared: number }> {
    return request<{ ok: boolean; cleared: number }>("/api/user/ai-cache", { method: "DELETE" });
  },
};

// ── User Settings API ─────────────────────────────────────────────────────────

export interface UserSettings {
  gemini: "set" | null;
  tmdb: "set" | null;
  youtube: "set" | null;
  googleBooks: "set" | null;
  podcastIndexKey: "set" | null;
  podcastIndexSecret: "set" | null;
  aiModel: string | null;
  aiModels: AiModelDescriptor[];
  aiQueueIntervalMinutes: number;
  interestProfiles: InterestProfiles;
  aiPrompts: AiPrompts;
}

export interface UserSettingsModelTestResponse {
  ok: boolean;
  model: string;
  family: "gemini" | "gemma";
  supportLevel: "stable" | "experimental";
  capabilities: {
    analyze: boolean;
    score: boolean;
  };
  message: string;
}

export interface SavedViewFilters {
  status?: StatusId;
  contentType?: ContentTypeId;
  minScore?: number;
  maxDuration?: number;
  onlyTrending?: boolean;
  query?: string;
}

export interface SavedView {
  id: string;
  userId: string;
  name: string;
  scope: "collection" | "dashboard";
  contentType: ContentTypeId | null;
  filters: SavedViewFilters;
  createdAt: number;
  updatedAt: number;
}

export interface ImportSourceDescriptor {
  id: string;
  label: string;
  status: "available" | "planned";
  description: string;
}

export interface ImportJobSummary {
  id: string;
  userId: string;
  source: string;
  sourceLabel: string;
  status: "queued" | "processing" | "completed" | "failed";
  duplicateStrategy: string;
  totalRows: number;
  createdCount: number;
  duplicateCount: number;
  failedCount: number;
  metadata: unknown | null;
  result: unknown | null;
  lastError: string | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export const userSettingsApi = {
  getSettings(): Promise<UserSettings> {
    return request<UserSettings>("/api/user/settings");
  },

  updateKey(service: string, key: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>("/api/user/settings", {
      method: "PATCH",
      body: JSON.stringify({ service, key }),
    });
  },

  testKey(service: string, key?: string): Promise<{ ok: boolean; message: string }> {
    return request<{ ok: boolean; message: string }>("/api/user/settings/test", {
      method: "POST",
      body: JSON.stringify({ service, key }),
    });
  },

  testModel(model: string, key?: string): Promise<UserSettingsModelTestResponse> {
    return request<UserSettingsModelTestResponse>("/api/user/settings/test-model", {
      method: "POST",
      body: JSON.stringify({ model, key }),
    });
  },

  updateInterestProfiles(interestProfiles: InterestProfiles): Promise<{ ok: boolean; interestProfiles: InterestProfiles }> {
    return request<{ ok: boolean; interestProfiles: InterestProfiles }>("/api/user/settings", {
      method: "PATCH",
      body: JSON.stringify({ interestProfiles }),
    });
  },

  updateAiPrompts(aiPrompts: AiPrompts): Promise<{ ok: boolean; aiPrompts: AiPrompts }> {
    return request<{ ok: boolean; aiPrompts: AiPrompts }>("/api/user/settings", {
      method: "PATCH",
      body: JSON.stringify({ aiPrompts }),
    });
  },
};

// ── Items API ─────────────────────────────────────────────────────────────────

export const itemsApi = {
  list(filters?: { status?: StatusId; content_type?: ContentTypeId; q?: string }): Promise<Item[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.content_type) params.set("content_type", filters.content_type);
    if (filters?.q) params.set("q", filters.q);
    const qs = params.toString();
    return request<Item[]>(`/api/items${qs ? `?${qs}` : ""}`);
  },

  create(data: CreateItemInput): Promise<Item> {
    return request<Item>("/api/items", { method: "POST", body: JSON.stringify(data) });
  },

  importCsv(rows: ImportRowInput[]): Promise<BulkImportResult> {
    return request<BulkImportResult>("/api/items/import/csv", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  },

  importSource(source: string, rows: ImportRowInput[]): Promise<BulkImportResult> {
    return request<BulkImportResult>("/api/items/import/source", {
      method: "POST",
      body: JSON.stringify({ source, rows }),
    });
  },

  listImportSources(): Promise<{ sources: ImportSourceDescriptor[] }> {
    return request("/api/items/import/sources");
  },

  listImportJobs(): Promise<{ jobs: ImportJobSummary[] }> {
    return request("/api/items/import/jobs");
  },

  listDuplicates(): Promise<{ groups: DuplicateGroup[] }> {
    return request("/api/items/duplicates");
  },

  merge(sourceId: string, targetId: string): Promise<Item> {
    return request("/api/items/merge", {
      method: "POST",
      body: JSON.stringify({ sourceId, targetId }),
    });
  },

  update(id: string, data: UpdateItemInput): Promise<Item> {
    return request<Item>(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  delete(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/items/${id}`, { method: "DELETE" });
  },
};

export const savedViewsApi = {
  list(filters?: { scope?: "collection" | "dashboard"; content_type?: ContentTypeId }): Promise<{ views: SavedView[] }> {
    const params = new URLSearchParams();
    if (filters?.scope) params.set("scope", filters.scope);
    if (filters?.content_type) params.set("content_type", filters.content_type);
    const qs = params.toString();
    return request(`/api/views${qs ? `?${qs}` : ""}`);
  },

  create(data: {
    name: string;
    scope?: "collection" | "dashboard";
    contentType?: ContentTypeId | null;
    filters?: SavedViewFilters;
  }): Promise<SavedView> {
    return request("/api/views", { method: "POST", body: JSON.stringify(data) });
  },

  update(id: string, data: { name?: string; filters?: SavedViewFilters }): Promise<SavedView> {
    return request(`/api/views/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  delete(id: string): Promise<{ ok: true }> {
    return request(`/api/views/${id}`, { method: "DELETE" });
  },
};
