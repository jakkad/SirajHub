import assert from "node:assert/strict";
import { test } from "node:test";
import { pbkdf2Sync } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { parsePublicUrl, fetchPublicResource } from "../src/lib/public-fetch.ts";
import { hashPassword, verifyPassword } from "../src/lib/password.ts";
import { isTrustedOrigin, requestSecurity } from "../src/middleware/request-security.ts";
import { detectFromUrl } from "../src/services/metadata/detect.ts";

test("public URL policy rejects local, encoded, reserved, and credentialed destinations", () => {
  for (const url of [
    "file:///etc/passwd", "ftp://example.com/a", "http://localhost/a", "http://localhost./",
    "http://foo.local/", "http://intranet/", "http://127.1/", "http://2130706433/",
    "http://0x7f000001/", "http://10.0.0.1/", "http://169.254.169.254/",
    "http://172.16.0.1/", "http://192.168.0.1/", "http://100.64.0.1/",
    "http://198.18.0.1/", "http://224.0.0.1/", "http://[::1]/",
    "http://[::ffff:127.0.0.1]/", "https://user:pass@example.com/", "https://example.com:8443/",
  ]) assert.equal(parsePublicUrl(url), null, url);
  assert.equal(parsePublicUrl("https://example.com/path?q=1")?.hostname, "example.com");
  assert.ok(parsePublicUrl("http://8.8.8.8/"));
});

test("redirect destinations are checked before any second request", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/secret" } }));
  await assert.rejects(fetchPublicResource("https://example.com/", { accept: "text/html" }), /Unsafe/);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("relative redirects work and resource requests have a deadline", async (t) => {
  const seen: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    seen.push(url.href);
    assert.equal(init.redirect, "manual");
    assert.ok(init.signal);
    return seen.length === 1
      ? new Response(null, { status: 302, headers: { Location: "/next" } })
      : new Response("hello");
  });
  const response = await fetchPublicResource("https://example.com/start", { accept: "text/html" });
  assert.equal(await response.text(), "hello");
  assert.deepEqual(seen, ["https://example.com/start", "https://example.com/next"]);
});

test("redirect loops are bounded", async (t) => {
  const mocked = t.mock.method(globalThis, "fetch", async () =>
    new Response(null, { status: 307, headers: { Location: "/again" } }));
  await assert.rejects(fetchPublicResource("https://example.com/", { accept: "text/html" }), /Too many/);
  assert.equal(mocked.mock.callCount(), 4);
});

test("response size is enforced without trusting Content-Length", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("oversized", { headers: { "Content-Length": "1" } }));
  await assert.rejects(fetchPublicResource("https://example.com/", { accept: "text/html", maxBytes: 4 }), /size limit/);
});

test("declared oversize bodies are cancelled", async (t) => {
  let cancelled = false;
  t.mock.method(globalThis, "fetch", async () => new Response(new ReadableStream({
    cancel() { cancelled = true; },
  }), { headers: { "Content-Length": "100" } }));
  await assert.rejects(fetchPublicResource("https://example.com/", { accept: "image/png", maxBytes: 4 }), /size limit/);
  assert.equal(cancelled, true);
});

test("mutation protection rejects cross-origin requests and preserves same-origin and CLI access", async () => {
  const app = new Hono();
  app.use("*", requestSecurity);
  app.all("/api/test", (c) => c.json({ ok: true }));
  for (const method of ["POST", "PATCH", "DELETE"]) {
    assert.equal((await app.request("https://app.example/api/test", {
      method, headers: { Origin: "https://evil.example" },
    })).status, 403);
    assert.equal((await app.request("https://app.example/api/test", {
      method, headers: { Origin: "https://app.example" },
    })).status, 200);
  }
  const response = await app.request("https://app.example/api/test", { method: "POST" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal((await app.request("https://app.example/api/test", {
    method: "POST", headers: { "Sec-Fetch-Site": "cross-site" },
  })).status, 403);
  assert.equal(isTrustedOrigin("null", "https://app.example"), false);
  assert.equal(isTrustedOrigin("http://localhost:5173", "https://app.example"), false);
  assert.equal(isTrustedOrigin("http://localhost:5173", "http://127.0.0.1:8787"), true);
});

test("existing password format still round-trips, and malformed hashes fail closed", async () => {
  const salt = Buffer.alloc(16, 1);
  const legacyKey = pbkdf2Sync("test-password", salt, 100_000, 32, "sha256").toString("hex");
  assert.equal(await verifyPassword({
    hash: `pbkdf2-sha256:100000:${salt.toString("hex")}:${legacyKey}`,
    password: "test-password",
  }), true);
  const hash = await hashPassword("test-password");
  assert.equal(await verifyPassword({ hash, password: "test-password" }), true);
  assert.equal(await verifyPassword({ hash, password: "wrong" }), false);
  for (const malformed of [hash + ":extra", hash.replace("100000", "100000oops"),
    hash.replace("100000", "999999999"), "pbkdf2-sha256:100000:zz:ff", "legacy"]) {
    assert.equal(await verifyPassword({ hash: malformed, password: "test-password" }), false);
  }
});

test("body limits reject unknown-length oversized requests and preserve accepted bodies", async () => {
  const app = new Hono();
  app.use("*", bodyLimit({ maxSize: 4 }));
  app.post("/", async (c) => c.text(await c.req.text()));
  assert.equal((await app.request("http://localhost/", { method: "POST", body: "12345" })).status, 413);
  const accepted = await app.request("http://localhost/", { method: "POST", body: "1234" });
  assert.equal(accepted.status, 200);
  assert.equal(await accepted.text(), "1234");
});

test("metadata routing matches hosts rather than provider names hidden in paths", () => {
  assert.equal(detectFromUrl("https://example.com/youtube.com/watch?v=abc"), "article");
  assert.equal(detectFromUrl("https://goodreads.com.evil.example/book"), "article");
  assert.equal(detectFromUrl("https://www.youtube.com/watch?v=abc"), "youtube");
  assert.equal(detectFromUrl("https://books.google.com/books?id=abc"), "book");
  assert.equal(detectFromUrl("https://www.themoviedb.org/tv/123"), "tv");
  assert.equal(detectFromUrl("https://x.com/person/status/123"), "tweet");
});
