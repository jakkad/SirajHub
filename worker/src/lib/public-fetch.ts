const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** URL-level protection; deployment egress must also reject private DNS answers. */
export function parsePublicUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!host.includes(".") || host.includes(":") ||
        ["localhost", "local", "internal", "home", "lan", "test", "invalid"].some(
          (suffix) => host === suffix || host.endsWith(`.${suffix}`)
        )) return null;

    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a = 0, b = 0] = host.split(".").map(Number);
      if (a === 0 || a === 10 || a === 127 || a >= 224 ||
          (a === 100 && b >= 64 && b <= 127) ||
          (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
          (a === 192 && [0, 168].includes(b)) || (a === 198 && [18, 19].includes(b))) return null;
    }
    return url;
  } catch {
    return null;
  }
}

/** GET untrusted public content with one deadline and validation at every redirect. */
export async function fetchPublicResource(
  input: string,
  options: { accept: string; maxBytes?: number; timeoutMs?: number }
): Promise<Response> {
  const initialUrl = parsePublicUrl(input);
  if (!initialUrl) throw new Error("Unsupported public URL");
  let url: URL = initialUrl;
  const signal = AbortSignal.timeout(options.timeoutMs ?? 15_000);
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;

  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal,
      headers: { Accept: options.accept, "User-Agent": "SirajHub/1.0" },
    });
    if (REDIRECT_STATUSES.has(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("Location");
      const nextUrl = location ? parsePublicUrl(new URL(location, url).href) : null;
      if (!nextUrl) throw new Error("Unsafe resource redirect");
      url = nextUrl;
      continue;
    }
    if (Number(response.headers.get("Content-Length")) > maxBytes) {
      await response.body?.cancel();
      throw new Error("Resource exceeds size limit");
    }
    // Bound actual streamed bytes too: Content-Length may be absent or inaccurate.
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) throw new Error("Resource exceeds size limit");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const headers = new Headers(response.headers);
    headers.delete("Content-Encoding");
    headers.delete("Content-Length");
    return new Response([204, 205, 304].includes(response.status) ? null : body, {
      status: response.status, headers,
    });
  }
  throw new Error("Too many resource redirects");
}
