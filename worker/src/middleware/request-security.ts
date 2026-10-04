import { createMiddleware } from "hono/factory";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isTrustedOrigin(origin: string, requestUrl: string): boolean {
  try {
    const source = new URL(origin);
    const target = new URL(requestUrl);
    return source.origin === target.origin || (
      LOCAL_HOSTS.has(source.hostname) && LOCAL_HOSTS.has(target.hostname) &&
      source.protocol === "http:" && target.protocol === "http:"
    );
  } catch {
    return false;
  }
}

/** CORS controls response access; independently reject cross-origin mutations. */
export const requestSecurity = createMiddleware(async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "no-store");
  if (!SAFE_METHODS.has(c.req.method)) {
    const origin = c.req.header("Origin");
    if ((origin && !isTrustedOrigin(origin, c.req.url)) ||
        (!origin && c.req.header("Sec-Fetch-Site") === "cross-site")) {
      return c.json({ error: "Untrusted request origin" }, 403);
    }
  }
  await next();
});
