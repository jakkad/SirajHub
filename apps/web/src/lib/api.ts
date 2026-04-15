import type { ContentTypeId, StatusId } from "./constants";

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
}

export type UpdateItemInput = Partial<
  Pick<Item,
    | "title" | "contentType" | "status" | "creator" | "description"
    | "coverUrl" | "releaseDate" | "rating" | "notes" | "position"
    | "startedAt" | "finishedAt"
  >
>;

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
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
};

// ── AI API ────────────────────────────────────────────────────────────────────

export interface AiAnalysis {
  summary: string;
  key_points: string[];
  recommendation: string;
  mood?: string;
}

export interface RankedSuggestion {
  id: string;
  rank: number;
  reason: string;
}

export interface CategorizeResult {
  content_type: string;
  confidence: number;
  suggested_tags: string[];
  suggested_status: string;
}

export const aiApi = {
  analyze(itemId: string): Promise<{ cached: boolean; result: AiAnalysis }> {
    return request(`/api/ai/analyze/${itemId}`, { method: "POST" });
  },

  getNextList(refresh = false): Promise<{ cached: boolean; result: RankedSuggestion[] }> {
    return request(`/api/ai/next${refresh ? "?refresh=1" : ""}`);
  },

  categorize(input: {
    title: string;
    description?: string | null;
    sourceUrl?: string | null;
    contentType: string;
  }): Promise<CategorizeResult> {
    return request<CategorizeResult>("/api/ai/categorize", {
      method: "POST",
      body: JSON.stringify(input),
    });
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

  update(id: string, data: UpdateItemInput): Promise<Item> {
    return request<Item>(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  delete(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/items/${id}`, { method: "DELETE" });
  },
};
