const KEY_PREFIX = "srj_sync_";

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createSyncKey() {
  return KEY_PREFIX + hex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function digestSyncKey(key: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))));
}

export function isSyncKey(key: string) {
  return /^srj_sync_[a-f0-9]{64}$/.test(key);
}

export function canUseSyncKey(method: string, path: string) {
  if (method === "GET") return path === "/api/sync/account" || path === "/api/sync/items";
  if (method === "POST") return path === "/api/items";
  return method === "PATCH" && /^\/api\/items\/[0-9A-HJKMNP-TV-Z]{26}$/.test(path);
}

const editableText = new Set(["creator", "description", "coverUrl", "releaseDate", "sourceUrl", "externalId", "notes"]);
const statuses = new Set(["suggestions", "in_progress", "finished", "archived"]);

export function validSyncWrite(body: unknown, creating: boolean) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const fields = body as Record<string, unknown>;
  if (!Object.keys(fields).length || (creating && (!fields.title || !fields.contentType))) return false;
  return Object.entries(fields).every(([field, value]) => {
    if (field === "title") return typeof value === "string" && !!value.trim();
    if (field === "contentType") return creating && typeof value === "string";
    if (field === "status") return typeof value === "string" && statuses.has(value);
    if (field === "rating" || field === "durationMins" || field === "pageCount") {
      return value === null || (typeof value === "number" && Number.isSafeInteger(value));
    }
    return editableText.has(field) && (value === null || typeof value === "string");
  });
}
