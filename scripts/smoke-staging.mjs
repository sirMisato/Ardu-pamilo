const baseUrl = normalizeBaseUrl(process.env.PAMILO_BASE_URL ?? "http://127.0.0.1:8080");
const origin = process.env.PAMILO_SMOKE_ORIGIN ?? baseUrl.origin;
const timeoutMs = Number(process.env.PAMILO_SMOKE_TIMEOUT_MS ?? "10000");

const checks = [];

try {
  await runSmoke();
  console.log(`Staging smoke passed: ${checks.join(", ")}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown smoke failure.";
  console.error(`Staging smoke failed: ${message}`);
  process.exitCode = 1;
}

async function runSmoke() {
  const live = await request("/health/live");
  expectStatus(live, 200, "health live");
  expectHeader(live, "x-frame-options", "DENY");
  expectHeader(live, "x-content-type-options", "nosniff");
  checks.push("health/security headers");

  const ready = await requestJson("/health/ready");
  expectStatus(ready.response, 200, "health ready");
  expectEqual(ready.body.status, "ok", "ready status");
  expectEqual(ready.body.dependencies?.telemetry, "in_memory_local", "ready telemetry dependency");
  expectEqual(ready.body.dependencies?.weather, "in_memory_local", "ready weather dependency");
  checks.push("readiness");

  const login = await requestJson("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: "farmer-a@example.test",
      password: "local-demo-password",
      tenant_id: "tenant-a"
    })
  });
  expectStatus(login.response, 200, "login");
  expectEqual(login.body.data?.active_tenant?.id, "tenant-a", "login tenant");
  checks.push("login");

  const cookieHeader = extractCookieHeader(login.response);
  const csrfToken = login.body.data?.csrf_token;
  if (typeof csrfToken !== "string" || !csrfToken) {
    throw new Error("login did not return csrf_token");
  }

  const farms = await requestJson("/api/v1/farms", {
    headers: {
      cookie: cookieHeader
    }
  });
  expectStatus(farms.response, 200, "farm list");
  if (!Array.isArray(farms.body.data) || farms.body.data.length < 1) {
    throw new Error("farm list did not return seeded farm data");
  }
  checks.push("farm list");

  const farmCreate = await requestJson("/api/v1/farms", {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      "content-type": "application/json",
      origin,
      "x-csrf-token": csrfToken
    },
    body: JSON.stringify({
      name: "Smoke Staging Farm",
      timezone: "Asia/Jakarta"
    })
  });
  expectStatus(farmCreate.response, 201, "csrf farm create");
  expectEqual(farmCreate.body.data?.name, "Smoke Staging Farm", "created farm name");
  checks.push("csrf mutation");

  const telemetry = await requestJson("/api/v1/plots/plot-a/telemetry/latest", {
    headers: {
      cookie: cookieHeader
    }
  });
  expectStatus(telemetry.response, 200, "telemetry latest");
  if (!Array.isArray(telemetry.body.data) || telemetry.body.data.length < 1) {
    throw new Error("telemetry latest did not return seeded readings");
  }
  checks.push("telemetry");

  const weather = await requestJson("/api/v1/plots/plot-a/weather", {
    headers: {
      cookie: cookieHeader
    }
  });
  expectStatus(weather.response, 200, "weather");
  expectEqual(weather.body.data?.attribution, "BMKG", "weather attribution");
  checks.push("weather");
}

async function requestJson(path, init = {}) {
  const response = await request(path, init);
  const text = await response.text();

  try {
    return {
      response,
      body: JSON.parse(text)
    };
  } catch {
    throw new Error(`${path} did not return JSON: ${text.slice(0, 120)}`);
  }
}

async function request(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(new URL(path, baseUrl), {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractCookieHeader(response) {
  const headers = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : splitSetCookie(response.headers.get("set-cookie"));
  const cookies = headers
    .flatMap((header) => [
      header.match(/pamilo_session=[^;,]+/)?.[0],
      header.match(/pamilo_csrf=[^;,]+/)?.[0]
    ])
    .filter(Boolean);

  if (cookies.length < 2) {
    throw new Error("login did not return session and csrf cookies");
  }

  return cookies.join("; ");
}

function splitSetCookie(header) {
  if (!header) {
    return [];
  }

  return header.split(/,(?=\s*[A-Za-z0-9_]+=)/);
}

function expectStatus(response, expected, label) {
  if (response.status !== expected) {
    throw new Error(`${label} expected HTTP ${expected}, got ${response.status}`);
  }
}

function expectHeader(response, name, expected) {
  const value = response.headers.get(name);
  if (value !== expected) {
    throw new Error(`${name} expected ${expected}, got ${value ?? "missing"}`);
  }
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${String(actual)}`);
  }
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return url;
}
