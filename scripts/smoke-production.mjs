import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const baseUrl = normalizeBaseUrl(process.env.PAMILO_PRODUCTION_BASE_URL ?? "https://sedayafarm.keycloud.id");
const timeoutMs = Number(process.env.PAMILO_PRODUCTION_SMOKE_TIMEOUT_MS ?? "10000");
const approved = String(process.env.PAMILO_PRODUCTION_SMOKE_APPROVED ?? "false").toLowerCase() === "true";
const loginEnabled = String(process.env.PAMILO_PRODUCTION_SMOKE_LOGIN ?? "false").toLowerCase() === "true";
const allowedHosts = new Set((process.env.PAMILO_PRODUCTION_HOST_ALLOWLIST ?? "sedayafarm.keycloud.id")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean));
const reportDir = process.env.PAMILO_PRODUCTION_SMOKE_REPORT_DIR ?? ".local/production-release";

const credentials = {
  email: process.env.PAMILO_PRODUCTION_SMOKE_EMAIL ?? "",
  password: process.env.PAMILO_PRODUCTION_SMOKE_PASSWORD ?? "",
  tenantId: process.env.PAMILO_PRODUCTION_SMOKE_TENANT_ID ?? ""
};

const checks = [];
const failures = [];

try {
  assertApprovedTarget();
  await runSmoke();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown production smoke failure.";
  failures.push(message);
  console.error(`Production smoke failed: ${message}`);
} finally {
  const reportPath = await writeReport();
  console.log(`Production smoke report: ${reportPath}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}

async function runSmoke() {
  const live = await request("/health/live");
  expectStatus(live, 200, "health live");
  expectHeader(live, "x-frame-options", "DENY");
  expectHeader(live, "x-content-type-options", "nosniff");
  expectHeaderIncludes(live, "strict-transport-security", ["max-age=", "includesubdomains"]);
  checks.push("health/security headers");

  const ready = await requestJson("/health/ready");
  expectStatus(ready.response, 200, "health ready");
  expectEqual(ready.body.status, "ok", "ready status");

  const dependencies = ready.body.dependencies ?? {};
  for (const [name, value] of Object.entries(dependencies)) {
    if (String(value).includes("local") || String(value).includes("not_configured")) {
      throw new Error(`readiness dependency ${name} is not production-ready: ${value}`);
    }
  }
  checks.push("readiness");

  if (loginEnabled) {
    await runLoginSmoke();
  } else {
    checks.push("login skipped by configuration");
  }
}

async function runLoginSmoke() {
  if (!credentials.email || !credentials.password || !credentials.tenantId) {
    throw new Error("production login smoke requires email, password, and tenant id env values");
  }

  const login = await requestJson("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      tenant_id: credentials.tenantId
    })
  });
  expectStatus(login.response, 200, "login");
  expectEqual(login.body.data?.active_tenant?.id, credentials.tenantId, "login tenant");

  const cookieHeader = extractCookieHeader(login.response);
  const me = await requestJson("/api/v1/me", {
    headers: {
      cookie: cookieHeader
    }
  });
  expectStatus(me.response, 200, "me");
  expectEqual(me.body.data?.active_tenant?.id, credentials.tenantId, "profile tenant");
  checks.push("login/profile read-only");
}

function assertApprovedTarget() {
  if (!approved) {
    throw new Error("PAMILO_PRODUCTION_SMOKE_APPROVED=true is required before any production request.");
  }

  if (baseUrl.protocol !== "https:") {
    throw new Error("production smoke target must use HTTPS.");
  }

  if (baseUrl.username || baseUrl.password || baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
    throw new Error("production smoke target must be an origin without path, query, fragment, or credentials.");
  }

  if (!allowedHosts.has(baseUrl.hostname.toLowerCase())) {
    throw new Error("production smoke target host is not in PAMILO_PRODUCTION_HOST_ALLOWLIST.");
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("PAMILO_PRODUCTION_SMOKE_TIMEOUT_MS must be a positive integer.");
  }
}

async function writeReport() {
  await mkdir(reportDir, {
    recursive: true
  });

  const reportPath = join(reportDir, `production-smoke-${runId}.md`);
  await writeFile(reportPath, buildReport(), "utf8");
  return reportPath;
}

function buildReport() {
  const finishedAt = new Date();
  const rows = [
    ...checks.map((check) => `| PASS | ${escapeMarkdown(check)} |`),
    ...failures.map((failure) => `| FAIL | ${escapeMarkdown(failure)} |`)
  ].join("\n");

  return `# Production Smoke Evidence

Generated: ${finishedAt.toISOString()}
Target: ${baseUrl.origin}
Approved: ${approved ? "yes" : "no"}
Login smoke: ${loginEnabled ? "enabled" : "disabled"}

## Checks

| Status | Detail |
| --- | --- |
${rows || "| SKIP | No checks executed. |"}

## Notes

- This smoke script is read-only except the optional login session creation.
- It does not change DNS, deploy containers, write farm data, provision devices, or connect to MQTT.
- Password values are never written to this report.
`;
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

function expectHeaderIncludes(response, name, expectedParts) {
  const value = response.headers.get(name)?.toLowerCase();
  if (!value) {
    throw new Error(`${name} expected to be present`);
  }

  for (const part of expectedParts) {
    if (!value.includes(part)) {
      throw new Error(`${name} expected to include ${part}, got ${value}`);
    }
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

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}
