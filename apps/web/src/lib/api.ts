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
  hiddenFromRecommendations: boolean;
  manualBoost: number;
  cooldownUntil: number | null;
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
  durationMins?: number;
  rating?: number;
  notes?: string;
  sourceUrl?: string;
  externalId?: string;
  metadata?: string | null;
  progressPercent?: number | null;
  progressCurrent?: number | null;
  progressTotal?: number | null;
  finishedAt?: number | null;
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
    | "hiddenFromRecommendations"
    | "manualBoost"
    | "cooldownUntil"
    | "externalId"
    | "durationMins"
    | "metadata"
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
    manual: number;
  };
  pending: boolean;
  updatedAt: number | null;
  needsMoreInfo: boolean;
  moreInfoRequest: string | null;
  modelUsed: string | null;
  hidden?: boolean;
  cooldownUntil?: number | null;
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

export interface CustomList {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  itemCount: number;
}

export interface CustomListDetail extends CustomList {
  items: Array<Item & { listPosition: number; listAddedAt: number }>;
}

export interface ItemListMembership extends CustomList {
  containsItem: boolean;
  membership: { addedAt: number; position: number } | null;
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

export interface Reminder {
  id: string;
  type: "untouched_30_days" | "resume_in_progress" | "high_score_waiting";
  title: string;
  message: string;
  dueAt: number;
  ageDays: number;
  item: Item;
}

export interface NoteEntry {
  id: string;
  userId: string;
  itemId: string;
  entryType: "highlight" | "quote" | "takeaway" | "reflection";
  content: string;
  context: string | null;
  position: number;
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

export const remindersApi = {
  list(): Promise<{ reminders: Reminder[] }> {
    return request("/api/reminders");
  },

  update(itemId: string, type: Reminder["type"], action: "dismiss" | "snooze" | "clear"): Promise<{ ok: true }> {
    return request(`/api/reminders/${itemId}/${type}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
  },
};

export const notesApi = {
  list(itemId: string): Promise<{ entries: NoteEntry[] }> {
    return request(`/api/notes/item/${itemId}`);
  },

  create(itemId: string, data: { entryType: NoteEntry["entryType"]; content: string; context?: string }): Promise<NoteEntry> {
    return request(`/api/notes/item/${itemId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: { entryType?: NoteEntry["entryType"]; content?: string; context?: string | null }): Promise<NoteEntry> {
    return request(`/api/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<{ ok: true }> {
    return request(`/api/notes/${id}`, { method: "DELETE" });
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

  async importCsv(rows: ImportRowInput[], resyncMetadata?: boolean): Promise<BulkImportResult> {
    const CHUNK_SIZE = 50;
    const combined: BulkImportResult = {
      created: [],
      createdCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      duplicates: [],
      errors: [],
      importJobId: "",
    };

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const res = await request<BulkImportResult>("/api/items/import/csv", {
        method: "POST",
        body: JSON.stringify({ rows: chunk, resyncMetadata }),
      });
      combined.created.push(...res.created);
      combined.createdCount += res.createdCount;
      combined.duplicateCount += res.duplicateCount;
      combined.failedCount += res.failedCount;
      // Adjust row numbers to be absolute instead of relative to chunk
      combined.duplicates.push(...res.duplicates.map(d => ({ ...d, row: i + d.row })));
      combined.errors.push(...res.errors.map(e => ({ ...e, row: i + e.row })));
      combined.importJobId = res.importJobId;
    }
    return combined;
  },

  async importSource(source: string, rows: ImportRowInput[], resyncMetadata?: boolean): Promise<BulkImportResult> {
    const CHUNK_SIZE = 50;
    const combined: BulkImportResult = {
      created: [],
      createdCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      duplicates: [],
      errors: [],
      importJobId: "",
    };

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const res = await request<BulkImportResult>("/api/items/import/source", {
        method: "POST",
        body: JSON.stringify({ source, rows: chunk, resyncMetadata }),
      });
      combined.created.push(...res.created);
      combined.createdCount += res.createdCount;
      combined.duplicateCount += res.duplicateCount;
      combined.failedCount += res.failedCount;
      // Adjust row numbers to be absolute instead of relative to chunk
      combined.duplicates.push(...res.duplicates.map(d => ({ ...d, row: i + d.row })));
      combined.errors.push(...res.errors.map(e => ({ ...e, row: i + e.row })));
      combined.importJobId = res.importJobId;
    }
    return combined;
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

  bulkDelete(ids: string[]): Promise<{ ok: boolean; deletedCount: number }> {
    return request<{ ok: boolean; deletedCount: number }>("/api/items/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },
};

export const listsApi = {
  list(): Promise<{ lists: CustomList[] }> {
    return request("/api/lists");
  },

  reorder(orderedIds: string[]): Promise<{ ok: true }> {
    return request("/api/lists/reorder", {
      method: "PATCH",
      body: JSON.stringify({ orderedIds }),
    });
  },

  create(data: { name: string; description?: string; color?: string }): Promise<CustomList> {
    return request("/api/lists", { method: "POST", body: JSON.stringify(data) });
  },

  get(id: string): Promise<CustomListDetail> {
    return request(`/api/lists/${id}`);
  },

  update(id: string, data: { name?: string; description?: string | null; color?: string }): Promise<CustomList> {
    return request(`/api/lists/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  delete(id: string): Promise<{ ok: true }> {
    return request(`/api/lists/${id}`, { method: "DELETE" });
  },

  getItemLists(itemId: string): Promise<{ lists: ItemListMembership[] }> {
    return request(`/api/lists/item/${itemId}`);
  },

  addItem(itemId: string, listId: string): Promise<{ ok: true; alreadyPresent?: boolean }> {
    return request(`/api/lists/item/${itemId}`, {
      method: "POST",
      body: JSON.stringify({ listId }),
    });
  },

  reorderItems(listId: string, orderedItemIds: string[]): Promise<{ ok: true }> {
    return request(`/api/lists/${listId}/items/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ orderedItemIds }),
    });
  },

  removeItem(itemId: string, listId: string): Promise<{ ok: true }> {
    return request(`/api/lists/item/${itemId}/${listId}`, { method: "DELETE" });
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
