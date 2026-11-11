import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const origin = new URL(process.env.BASE_URL ?? "http://127.0.0.1:8789");
if (origin.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) {
  throw Error("Run this smoke test only against a disposable local SirajHub database.");
}

async function send(path, status, { method = "GET", headers, data } = {}) {
  const response = await fetch(new URL(path, origin), {
    method, headers: { "Content-Type": "application/json", ...headers },
    ...(data !== undefined && { body: JSON.stringify(data) }),
  });
  assert.equal(response.status, status, `${method} ${path}`);
  return { response, body: await response.json() };
}

async function signUp() {
  const { response } = await send("/api/auth/sign-up/email", 200, {
    method: "POST", headers: { Origin: origin.origin },
    data: { email: `smoke-${randomUUID()}@example.com`, name: "Sync smoke test", password: randomUUID() },
  });
  const cookie = response.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
  assert.ok(cookie, "Sign-up created a session");
  return { Cookie: cookie, Origin: origin.origin };
}

const first = await signUp();
const second = await signUp();
const keyPath = "/api/user/sync-keys";
await send(keyPath, 401);
const { body: issued } = await send(keyPath, 201, { method: "POST", headers: first });
assert.ok(/^srj_sync_[a-f0-9]{64}$/.test(issued.key), "A valid sync key was issued");
const { body: listed } = await send(keyPath, 200, { headers: first });
assert.deepEqual(listed.keys, [{ id: issued.id, createdAt: issued.createdAt }]);
assert.deepEqual((await send(keyPath, 200, { headers: second })).body.keys, []);
await send(`${keyPath}/${issued.id}`, 404, { method: "DELETE", headers: second });

const key = { Authorization: `Bearer ${issued.key}` };
await send(keyPath, 403, { headers: key });
await send("/api/user/export", 403, { headers: key });
await send("/api/sync/account", 200, { headers: key });
const listPath = "/api/sync/items";
const title = `Obsidian sync ${randomUUID()}`;
const { body: privateItem } = await send("/api/items", 201, {
  method: "POST", headers: second, data: { title: `Private ${title}`, contentType: "book" },
});
const { body: item } = await send("/api/items", 201, {
  method: "POST", headers: key, data: { title, contentType: "book", rating: 5 },
});
const page = (await send(listPath, 200, { headers: key })).body;
assert.deepEqual(page.items.map(({ id }) => id), [item.id]);
assert.equal(page.next, null);
assert.deepEqual((await send(`${listPath}?after=${item.id}`, 200, { headers: key })).body.items, []);
const path = `/api/items/${item.id}`;
const patch = (path, status, data, headers = key) => send(path, status, { method: "PATCH", data, headers });
const match = { ...key, "If-Match": `"${item.updatedAt}"` };
await patch(`/api/items/${privateItem.id}`, 404, { rating: 1 }, match);
await patch(path, 428, { rating: 7 });
await patch(path, 400, { hiddenFromRecommendations: true }, match);
const { body: edited } = await patch(path, 200, { rating: 7, notes: "From Obsidian" }, match);
assert.equal(edited.rating, 7);
assert.equal(edited.notes, "From Obsidian");
assert.ok(edited.updatedAt > item.updatedAt);
await patch(path, 412, { rating: 2 }, match);
assert.equal((await send(listPath, 200, { headers: key })).body.items[0].rating, 7);
await send(path, 403, { method: "DELETE", headers: key });
await send(`${keyPath}/${issued.id}`, 200, { method: "DELETE", headers: first });
await send(listPath, 401, { headers: key });
console.log("PASS: key creation, scope, account isolation, item round trip, stale writes, revocation");
