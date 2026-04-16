const baseUrl = process.env.BASE_URL?.trim();
const sessionCookie = process.env.SESSION_COOKIE?.trim();

if (!baseUrl) {
  console.error("Missing BASE_URL. Example: BASE_URL=http://localhost:5173 pnpm smoke:api");
  process.exit(1);
}

function buildHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    ...extra,
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { response, body };
}

async function run() {
  const checks = [];

  const health = await request("/api/health");
  checks.push({
    name: "public health",
    ok: health.response.ok && health.body?.ok === true,
    details: health.body ?? health.response.status,
  });

  if (sessionCookie) {
    const settings = await request("/api/user/settings");
    checks.push({
      name: "authenticated settings",
      ok: settings.response.ok && Array.isArray(settings.body?.aiModels),
      details: settings.body ?? settings.response.status,
    });

    const items = await request("/api/items");
    checks.push({
      name: "authenticated items list",
      ok: items.response.ok && Array.isArray(items.body),
      details: Array.isArray(items.body) ? `${items.body.length} items` : items.body ?? items.response.status,
    });
  } else {
    checks.push({
      name: "authenticated settings",
      ok: false,
      details: "Skipped (set SESSION_COOKIE to include authenticated checks)",
    });
  }

  const failed = checks.filter((check) => !check.ok && !String(check.details).startsWith("Skipped"));

  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "INFO"}  ${check.name}:`, check.details);
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("Smoke test failed:", error);
  process.exit(1);
});
