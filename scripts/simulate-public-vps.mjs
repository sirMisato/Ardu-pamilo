import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const defaultBaseUrl = "http://43.157.203.226:8080";
const baseUrl = parseOrigin(process.env.PAMILO_PUBLIC_VPS_BASE_URL ?? process.env.PAMILO_BASE_URL ?? defaultBaseUrl, "PAMILO_PUBLIC_VPS_BASE_URL");
const originUrl = parseOrigin(process.env.PAMILO_PUBLIC_VPS_ORIGIN ?? process.env.PAMILO_SMOKE_ORIGIN ?? baseUrl.origin, "PAMILO_PUBLIC_VPS_ORIGIN");
const environment = process.env.PAMILO_PUBLIC_VPS_ENVIRONMENT ?? "staging";
const expectedHost = process.env.PAMILO_PUBLIC_VPS_EXPECTED_HOST ?? "";
const allowHttp = parseBoolean(process.env.PAMILO_PUBLIC_VPS_ALLOW_HTTP, baseUrl.hostname === "43.157.203.226");
const allowLocal = parseBoolean(process.env.PAMILO_PUBLIC_VPS_ALLOW_LOCAL, false);
const dryRun = parseBoolean(process.env.PAMILO_PUBLIC_VPS_DRY_RUN, false);
const writeEnabled = parseBoolean(process.env.PAMILO_PUBLIC_VPS_WRITE, false);
const timeoutMs = Number(process.env.PAMILO_PUBLIC_VPS_TIMEOUT_MS ?? "10000");
const reportDir = process.env.PAMILO_PUBLIC_VPS_REPORT_DIR ?? ".local/public-vps-simulation";
const mqttEvidenceRef = process.env.PAMILO_PUBLIC_VPS_MQTT_EVIDENCE_REF ?? "";
const credentials = {
  email: process.env.PAMILO_PUBLIC_VPS_EMAIL ?? process.env.PAMILO_UAT_EMAIL ?? "farmer-a@example.test",
  password: process.env.PAMILO_PUBLIC_VPS_PASSWORD ?? process.env.PAMILO_UAT_PASSWORD ?? "local-demo-password",
  tenantId: process.env.PAMILO_PUBLIC_VPS_TENANT_ID ?? process.env.PAMILO_UAT_TENANT_ID ?? "tenant-a"
};

const results = [];
const context = {
  cookieHeader: "",
  csrfToken: "",
  activeFarmId: "",
  activePlotId: ""
};

try {
  await record("SIM-ENV-001", "PM + Security", "Target simulasi adalah public VPS staging/pilot dan aman untuk diuji.", async () => {
    assertSafeTarget();
    return `target=${baseUrl.origin}, environment=${environment}, dry_run=${dryRun}, write=${writeEnabled}`;
  });

  if (hasFailed("SIM-ENV-001")) {
    skipRemainingChecks("Target safety gagal, simulasi HTTP tidak dijalankan.");
  } else if (dryRun) {
    skipRemainingChecks("Dry run aktif, tidak ada request jaringan.");
  } else {
    await runHttpSimulation();
  }

  recordMqttEvidence();
} finally {
  const reportPath = await writeReport();
  console.log(`Public VPS simulation report: ${reportPath}`);
}

if (results.some((result) => result.status === "FAIL")) {
  process.exitCode = 1;
}

async function runHttpSimulation() {
  await record("WEB-001", "Frontend + QA/QC", "Web dapat dibuka lewat origin public VPS.", async () => {
    const response = await request("/");
    expectStatus(response, 200, "web root");
    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) {
      throw new Error(`web root expected text/html, got ${contentType || "missing content-type"}`);
    }

    if (!text.includes("PAMILO Smart Farming GIS") && !text.includes("id=\"app\"")) {
      throw new Error("web root does not look like the PAMILO app shell");
    }

    return "web root served the app shell";
  });

  await record("API-001", "Backend + DevOps + Security", "API health live dapat diakses lewat public web proxy.", async () => {
    const response = await request("/health/live");
    expectStatus(response, 200, "health live");
    expectHeader(response, "x-frame-options", "DENY");
    expectHeader(response, "x-content-type-options", "nosniff");
    expectHeader(response, "referrer-policy", "no-referrer");
    return "health live ok; baseline security headers present";
  });

  await record("API-002", "Backend + DevOps", "API readiness mengembalikan status dependensi yang dapat dibaca.", async () => {
    const ready = await requestJson("/health/ready");
    expectStatus(ready.response, 200, "health ready");
    expectEqual(ready.body.status, "ok", "ready status");
    return `dependencies=${JSON.stringify(ready.body.dependencies ?? {})}`;
  });

  await record("AUTH-001", "Backend + Security + QA/QC", "Login simulasi berhasil untuk tenant yang dipilih.", async () => {
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

    context.cookieHeader = extractCookieHeader(login.response);
    context.csrfToken = readNonEmptyString(login.body.data?.csrf_token, "csrf token");
    return `user=${credentials.email}, tenant=${credentials.tenantId}, password_omitted=true`;
  });

  await record("AUTH-002", "Backend + Security + QA/QC", "Session profile dapat dibaca tanpa credential leakage.", async () => {
    const me = await requestJson("/api/v1/me", {
      headers: authHeaders()
    });
    expectStatus(me.response, 200, "profile");
    expectEqual(me.body.data?.active_tenant?.id, credentials.tenantId, "profile tenant");

    if ("password" in (me.body.data?.user ?? {})) {
      throw new Error("profile payload exposes password");
    }

    return `role=${me.body.data?.active_tenant?.role ?? "unknown"}`;
  });

  await record("TENANT-001", "Backend + Security + QA/QC", "List farm hanya mengembalikan data tenant aktif.", async () => {
    const farms = await requestJson("/api/v1/farms", {
      headers: authHeaders()
    });
    expectStatus(farms.response, 200, "farm list");

    if (!Array.isArray(farms.body.data) || farms.body.data.length < 1) {
      throw new Error("farm list did not return tenant data");
    }

    context.activeFarmId = readNonEmptyString(farms.body.data[0]?.id, "active farm id");
    return `farms=${farms.body.data.length}, first_farm=${context.activeFarmId}`;
  });

  await record("GIS-001", "Frontend + Backend + QA/QC", "Plot GIS tenant aktif tersedia dengan area dan centroid.", async () => {
    const plots = await requestJson(`/api/v1/farms/${encodeURIComponent(context.activeFarmId)}/plots`, {
      headers: authHeaders()
    });
    expectStatus(plots.response, 200, "plot list");

    if (!Array.isArray(plots.body.data) || plots.body.data.length < 1) {
      throw new Error("plot list did not return tenant data");
    }

    const plot = plots.body.data[0];
    context.activePlotId = readNonEmptyString(plot?.id, "active plot id");
    expectPositiveNumber(plot?.area_m2, "plot area_m2");
    expectNumber(plot?.centroid?.lat, "plot centroid lat");
    expectNumber(plot?.centroid?.lng, "plot centroid lng");
    return `plot=${context.activePlotId}, area_m2=${Math.round(plot.area_m2)}`;
  });

  await record("TEL-001", "Backend + QA/QC", "Telemetry latest dapat dibaca lewat public VPS.", async () => {
    const telemetry = await requestJson(`/api/v1/plots/${encodeURIComponent(context.activePlotId)}/telemetry/latest`, {
      headers: authHeaders()
    });
    expectStatus(telemetry.response, 200, "telemetry latest");

    if (!Array.isArray(telemetry.body.data) || telemetry.body.data.length < 1) {
      throw new Error("telemetry latest did not return readings");
    }

    return `latest_readings=${telemetry.body.data.length}`;
  });

  await record("BMKG-001", "Backend + Frontend + QA/QC", "Weather/BMKG endpoint memberi attribution dan cache state.", async () => {
    const weather = await requestJson(`/api/v1/plots/${encodeURIComponent(context.activePlotId)}/weather`, {
      headers: authHeaders()
    });
    expectStatus(weather.response, 200, "weather");
    expectEqual(weather.body.data?.attribution, "BMKG", "weather attribution");
    return `cache_status=${weather.body.data?.cache_status ?? "unknown"}`;
  });

  await record("SEC-001", "Security + QA/QC", "Direct object access lintas tenant tetap ditolak.", async () => {
    const foreignPlotId = credentials.tenantId === "tenant-b" ? "plot-a" : "plot-b";
    const response = await request(`/api/v1/plots/${encodeURIComponent(foreignPlotId)}`, {
      headers: authHeaders()
    });

    if (![403, 404].includes(response.status)) {
      throw new Error(`cross-tenant plot expected HTTP 403/404, got ${response.status}`);
    }

    return `foreign_plot=${foreignPlotId}, status=${response.status}`;
  });

  if (writeEnabled) {
    await runWriteSimulation();
  } else {
    skip("WRITE-001", "Backend + QA/QC", "Write flow dinonaktifkan. Set `PAMILO_PUBLIC_VPS_WRITE=true` jika perlu simulasi mutasi terbatas.", "Skipped by configuration.");
  }
}

async function runWriteSimulation() {
  const suffix = randomUUID().slice(0, 8);

  await record("WRITE-001", "Backend + QA/QC", "Mutasi ringan dapat berjalan dengan CSRF valid.", async () => {
    const farm = await requestJson("/api/v1/farms", {
      method: "POST",
      headers: {
        ...authHeaders(),
        "content-type": "application/json",
        origin: originUrl.origin,
        "x-csrf-token": context.csrfToken
      },
      body: JSON.stringify({
        name: `Public VPS Simulation ${suffix}`,
        timezone: "Asia/Jakarta"
      })
    });
    expectStatus(farm.response, 201, "farm create");
    return `created_farm=${readNonEmptyString(farm.body.data?.id, "created farm id")}`;
  });
}

function recordMqttEvidence() {
  if (mqttEvidenceRef.trim()) {
    results.push({
      id: "MQTT-001",
      owner: "IT Infra + Backend + Security + QA/QC",
      requirement: "MQTT simulation evidence tersedia dari internal VPS self-check.",
      status: "PASS",
      durationMs: 0,
      detail: mqttEvidenceRef.trim()
    });
    console.log(`PASS MQTT-001 evidence=${mqttEvidenceRef.trim()}`);
    return;
  }

  skip(
    "MQTT-001",
    "IT Infra + Backend + Security + QA/QC",
    "MQTT publish/subscribe staging dijalankan di network internal VPS, bukan sebagai public plaintext broker.",
    "Run `.github/workflows/public-vps-simulation.yml` with internal MQTT enabled, or follow `docs/25-phase-11-public-vps-simulation.md`."
  );
}

async function record(id, owner, requirement, action) {
  const started = Date.now();

  try {
    const detail = await action();
    results.push({
      id,
      owner,
      requirement,
      status: "PASS",
      durationMs: Date.now() - started,
      detail
    });
    console.log(`PASS ${id} ${detail}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown simulation failure.";
    results.push({
      id,
      owner,
      requirement,
      status: "FAIL",
      durationMs: Date.now() - started,
      detail
    });
    console.error(`FAIL ${id} ${detail}`);
  }
}

function skip(id, owner, requirement, detail) {
  results.push({
    id,
    owner,
    requirement,
    status: "SKIP",
    durationMs: 0,
    detail
  });
  console.log(`SKIP ${id} ${detail}`);
}

function skipRemainingChecks(detail) {
  const checks = [
    ["WEB-001", "Frontend + QA/QC", "Web dapat dibuka lewat origin public VPS."],
    ["API-001", "Backend + DevOps + Security", "API health live dapat diakses lewat public web proxy."],
    ["API-002", "Backend + DevOps", "API readiness mengembalikan status dependensi yang dapat dibaca."],
    ["AUTH-001", "Backend + Security + QA/QC", "Login simulasi berhasil untuk tenant yang dipilih."],
    ["AUTH-002", "Backend + Security + QA/QC", "Session profile dapat dibaca tanpa credential leakage."],
    ["TENANT-001", "Backend + Security + QA/QC", "List farm hanya mengembalikan data tenant aktif."],
    ["GIS-001", "Frontend + Backend + QA/QC", "Plot GIS tenant aktif tersedia dengan area dan centroid."],
    ["TEL-001", "Backend + QA/QC", "Telemetry latest dapat dibaca lewat public VPS."],
    ["BMKG-001", "Backend + Frontend + QA/QC", "Weather/BMKG endpoint memberi attribution dan cache state."],
    ["SEC-001", "Security + QA/QC", "Direct object access lintas tenant tetap ditolak."],
    ["WRITE-001", "Backend + QA/QC", "Mutasi ringan dapat berjalan dengan CSRF valid."]
  ];

  for (const [id, owner, requirement] of checks) {
    skip(id, owner, requirement, detail);
  }
}

async function writeReport() {
  await mkdir(reportDir, {
    recursive: true
  });

  const reportPath = join(reportDir, `public-vps-simulation-${runId}.md`);
  await writeFile(reportPath, buildReport(), "utf8");
  return reportPath;
}

function buildReport() {
  const finishedAt = new Date();
  const summary = summarizeResults();
  const rows = results.map((result) => (
    `| ${escapeMarkdown(result.id)} | ${escapeMarkdown(result.status)} | ${escapeMarkdown(result.owner)} | ${escapeMarkdown(result.requirement)} | ${escapeMarkdown(result.detail)} | ${result.durationMs} |`
  )).join("\n");

  return `# Public VPS Simulation Evidence

Generated: ${finishedAt.toISOString()}
Target: ${baseUrl.origin}
Environment: ${environment}
Origin header: ${originUrl.origin}
Dry run: ${dryRun ? "yes" : "no"}
Write flow: ${writeEnabled ? "enabled" : "disabled"}
User: ${credentials.email}
Tenant: ${credentials.tenantId}
Password: omitted

## Summary

- Passed: ${summary.PASS}
- Failed: ${summary.FAIL}
- Skipped: ${summary.SKIP}
- Duration: ${finishedAt.getTime() - startedAt.getTime()} ms

## Checks

| ID | Status | Owner | Requirement | Detail | Duration ms |
| --- | --- | --- | --- | --- | ---: |
${rows}

## Operator Notes

- HTTP simulation uses the public web origin and API proxy only.
- Staging MQTT simulation must stay inside the VPS Docker network unless TLS and per-device ACL are ready.
- Do not publish production MQTT or connect production MySQL from this script.
`;
}

function summarizeResults() {
  return results.reduce((summary, result) => {
    summary[result.status] += 1;
    return summary;
  }, {
    PASS: 0,
    FAIL: 0,
    SKIP: 0
  });
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
      signal: controller.signal,
      headers: {
        "user-agent": "pamilo-public-vps-simulation/1.0",
        ...init.headers
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

function authHeaders() {
  return {
    cookie: context.cookieHeader
  };
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

function assertSafeTarget() {
  const allowedEnvironments = new Set(["staging", "pilot", "demo"]);

  if (!allowedEnvironments.has(environment)) {
    throw new Error("PAMILO_PUBLIC_VPS_ENVIRONMENT must be staging, pilot, or demo.");
  }

  if (isProductionHost(baseUrl.hostname)) {
    throw new Error("Use `npm run smoke:production` for production targets.");
  }

  if (isLocalHost(baseUrl.hostname) && !allowLocal) {
    throw new Error("Public VPS simulation refuses localhost unless PAMILO_PUBLIC_VPS_ALLOW_LOCAL=true.");
  }

  if (expectedHost && baseUrl.hostname !== expectedHost) {
    throw new Error(`target host ${baseUrl.hostname} does not match PAMILO_PUBLIC_VPS_EXPECTED_HOST=${expectedHost}`);
  }

  if (baseUrl.protocol === "http:" && !allowHttp) {
    throw new Error("HTTP public simulation requires PAMILO_PUBLIC_VPS_ALLOW_HTTP=true or the approved temporary VPS IP.");
  }

  if (originUrl.origin !== baseUrl.origin) {
    throw new Error("PAMILO_PUBLIC_VPS_ORIGIN must match the public VPS base origin for this simulation.");
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("PAMILO_PUBLIC_VPS_TIMEOUT_MS must be a positive integer.");
  }
}

function parseOrigin(value, name) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid http(s) origin.`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${name} must use http or https.`);
  }

  if (url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) {
    throw new Error(`${name} must be an origin without path, query, fragment, or credentials.`);
  }

  url.pathname = "/";
  return url;
}

function isProductionHost(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === "pamilo.keycloud.id" || normalized === "mqtt.keycloud.id";
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
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

function expectNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} expected a number`);
  }
}

function expectPositiveNumber(value, label) {
  expectNumber(value, label);
  if (value <= 0) {
    throw new Error(`${label} expected a positive number`);
  }
}

function readNonEmptyString(value, label) {
  if (typeof value !== "string" || !value) {
    throw new Error(`${label} expected a non-empty string`);
  }

  return value;
}

function hasFailed(id) {
  return results.some((result) => result.id === id && result.status === "FAIL");
}

function parseBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  throw new Error("Boolean environment values must be true/false.");
}

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}
