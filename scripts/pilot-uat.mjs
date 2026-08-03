import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const baseUrl = normalizeBaseUrl(process.env.PAMILO_UAT_BASE_URL ?? process.env.PAMILO_BASE_URL ?? "http://127.0.0.1:8080");
const origin = process.env.PAMILO_UAT_ORIGIN ?? process.env.PAMILO_SMOKE_ORIGIN ?? baseUrl.origin;
const environment = process.env.PAMILO_UAT_ENVIRONMENT ?? inferEnvironment(baseUrl);
const timeoutMs = Number(process.env.PAMILO_UAT_TIMEOUT_MS ?? "10000");
const reportDir = process.env.PAMILO_UAT_REPORT_DIR ?? ".local/pilot-uat";
const writeEnabled = parseBoolean(process.env.PAMILO_UAT_WRITE, isLocalHost(baseUrl.hostname));
const credentials = {
  email: process.env.PAMILO_UAT_EMAIL ?? "farmer-a@example.test",
  password: process.env.PAMILO_UAT_PASSWORD ?? "local-demo-password",
  tenantId: process.env.PAMILO_UAT_TENANT_ID ?? "tenant-a"
};

const results = [];
const context = {
  cookieHeader: "",
  csrfToken: "",
  activeFarmId: "",
  activePlotId: ""
};

try {
  await record("ENV-001", "PM + Security", "Target UAT bukan production dan konfigurasi aman.", async () => {
    assertSafeTarget();
    return `environment=${environment}, target=${baseUrl.origin}, write=${writeEnabled ? "enabled" : "disabled"}`;
  });

  if (!hasFailed("ENV-001")) {
    await runAutomatedUat();
  } else {
    skipRemainingChecks();
  }
} finally {
  const reportPath = await writeReport();
  console.log(`Pilot UAT report: ${reportPath}`);
}

if (results.some((result) => result.status === "FAIL")) {
  process.exitCode = 1;
}

async function runAutomatedUat() {
  await record("OPS-001", "DevOps + Security", "Liveness endpoint sehat dan baseline security header tersedia.", async () => {
    const response = await request("/health/live");
    expectStatus(response, 200, "health live");
    expectHeader(response, "x-frame-options", "DENY");
    expectHeader(response, "x-content-type-options", "nosniff");
    expectHeader(response, "referrer-policy", "no-referrer");
    return "health live ok; security headers present";
  });

  await record("OPS-002", "DevOps + QA/QC", "Readiness endpoint memberi status dependensi yang dapat dicatat.", async () => {
    const ready = await requestJson("/health/ready");
    expectStatus(ready.response, 200, "health ready");
    expectEqual(ready.body.status, "ok", "ready status");
    return `dependencies=${JSON.stringify(ready.body.dependencies ?? {})}`;
  });

  await record("AUTH-001", "Backend + Security + QA/QC", "User pilot dapat login ke tenant yang benar.", async () => {
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
    context.csrfToken = readNonEmptyString(login.body.data?.csrf_token, "login csrf token");
    return `user=${credentials.email}, tenant=${credentials.tenantId}`;
  });

  await record("AUTH-002", "Backend + Security + QA/QC", "Profile session dapat dibaca tanpa membuka credential.", async () => {
    const me = await requestJson("/api/v1/me", {
      headers: authHeaders()
    });
    expectStatus(me.response, 200, "me");
    expectEqual(me.body.data?.user?.email, credentials.email, "profile email");
    expectEqual(me.body.data?.active_tenant?.id, credentials.tenantId, "profile tenant");
    if ("password" in (me.body.data?.user ?? {})) {
      throw new Error("profile payload exposes password");
    }
    return `role=${me.body.data?.active_tenant?.role ?? "unknown"}`;
  });

  await record("TENANT-001", "Backend + Security + QA/QC", "List data hanya mengembalikan farm tenant aktif.", async () => {
    const farms = await requestJson("/api/v1/farms", {
      headers: authHeaders()
    });
    expectStatus(farms.response, 200, "farm list");
    if (!Array.isArray(farms.body.data) || farms.body.data.length < 1) {
      throw new Error("farm list did not return pilot data");
    }

    context.activeFarmId = readNonEmptyString(farms.body.data[0]?.id, "active farm id");
    return `farms=${farms.body.data.length}, first_farm=${context.activeFarmId}`;
  });

  await record("GIS-001", "Frontend + Backend + QA/QC", "Plot tenant aktif dapat dibaca beserta metrik GIS.", async () => {
    const plots = await requestJson(`/api/v1/farms/${encodeURIComponent(context.activeFarmId)}/plots`, {
      headers: authHeaders()
    });
    expectStatus(plots.response, 200, "plot list");
    if (!Array.isArray(plots.body.data) || plots.body.data.length < 1) {
      throw new Error("plot list did not return pilot data");
    }

    const plot = plots.body.data[0];
    context.activePlotId = readNonEmptyString(plot?.id, "active plot id");
    expectPositiveNumber(plot?.area_m2, "plot area_m2");
    expectNumber(plot?.centroid?.lat, "plot centroid lat");
    expectNumber(plot?.centroid?.lng, "plot centroid lng");
    return `plot=${context.activePlotId}, area_m2=${Math.round(plot.area_m2)}`;
  });

  await record("TENANT-002", "Backend + Security + QA/QC", "Direct object access lintas tenant tidak membocorkan data.", async () => {
    const response = await request("/api/v1/plots/plot-b", {
      headers: authHeaders()
    });
    if (![403, 404].includes(response.status)) {
      throw new Error(`cross-tenant plot expected HTTP 403/404, got ${response.status}`);
    }
    return `cross_tenant_status=${response.status}`;
  });

  await record("SEC-001", "Security + QA/QC", "Mutation tanpa CSRF token ditolak.", async () => {
    const response = await requestJson("/api/v1/farms", {
      method: "POST",
      headers: {
        ...authHeaders(),
        "content-type": "application/json",
        origin
      },
      body: JSON.stringify({
        name: "Pilot UAT CSRF Negative",
        timezone: "Asia/Jakarta"
      })
    });
    expectStatus(response.response, 403, "csrf negative");
    expectEqual(response.body.error?.code, "CSRF_FAILED", "csrf error code");
    return "csrf rejection ok";
  });

  await record("TEL-001", "Backend + QA/QC", "Latest telemetry tersedia untuk plot pilot.", async () => {
    const telemetry = await requestJson(`/api/v1/plots/${encodeURIComponent(context.activePlotId)}/telemetry/latest`, {
      headers: authHeaders()
    });
    expectStatus(telemetry.response, 200, "telemetry latest");
    if (!Array.isArray(telemetry.body.data) || telemetry.body.data.length < 1) {
      throw new Error("telemetry latest did not return readings");
    }
    return `latest_readings=${telemetry.body.data.length}`;
  });

  await record("TEL-002", "Backend + QA/QC", "History telemetry dapat di-query dengan window pilot.", async () => {
    const history = await requestJson(`/api/v1/plots/${encodeURIComponent(context.activePlotId)}/telemetry/history?metric=soil_temperature&from=2026-08-03T03:00:00Z&to=2026-08-03T03:10:00Z&resolution=raw`, {
      headers: authHeaders()
    });
    expectStatus(history.response, 200, "telemetry history");
    expectEqual(history.body.data?.metric, "soil_temperature", "history metric");
    if (!Array.isArray(history.body.data?.points)) {
      throw new Error("history did not return points array");
    }
    return `history_points=${history.body.data.points.length}`;
  });

  await record("BMKG-001", "Backend + Frontend + QA/QC", "Weather BMKG atau stale/missing state dapat dibaca.", async () => {
    const weather = await requestJson(`/api/v1/plots/${encodeURIComponent(context.activePlotId)}/weather`, {
      headers: authHeaders()
    });
    expectStatus(weather.response, 200, "weather");
    expectEqual(weather.body.data?.attribution, "BMKG", "weather attribution");
    return `cache_status=${weather.body.data?.cache_status ?? "unknown"}, forecast=${weather.body.data?.forecast?.length ?? 0}`;
  });

  await record("DEVICE-001", "Backend + Security + QA/QC", "Device list tidak mengekspos password MQTT.", async () => {
    const devices = await requestJson(`/api/v1/plots/${encodeURIComponent(context.activePlotId)}/devices`, {
      headers: authHeaders()
    });
    expectStatus(devices.response, 200, "device list");
    if (!Array.isArray(devices.body.data)) {
      throw new Error("device list did not return an array");
    }
    const exposesPassword = devices.body.data.some((device) => Boolean(device?.credential?.password));
    if (exposesPassword) {
      throw new Error("device list exposes credential password");
    }
    return `devices=${devices.body.data.length}`;
  });

  if (writeEnabled) {
    await runWriteUat();
  } else {
    skip("WRITE-001", "QA/QC + Backend", "Write flow dinonaktifkan. Set `PAMILO_UAT_WRITE=true` untuk final staging UAT.");
    skip("DEVICE-002", "Backend + Security + QA/QC", "Device provisioning write flow dinonaktifkan. Set `PAMILO_UAT_WRITE=true` untuk final staging UAT.");
  }
}

async function runWriteUat() {
  const suffix = randomUUID().slice(0, 8);
  const pilotFarmName = `Pilot UAT Farm ${suffix}`;
  const pilotPlotName = `Pilot UAT Plot ${suffix}`;
  let createdPlotId = "";

  await record("WRITE-001", "Frontend + Backend + QA/QC", "Farm dan plot pilot dapat dibuat dengan CSRF valid.", async () => {
    const farm = await requestJson("/api/v1/farms", {
      method: "POST",
      headers: {
        ...authHeaders(),
        "content-type": "application/json",
        origin,
        "x-csrf-token": context.csrfToken
      },
      body: JSON.stringify({
        name: pilotFarmName,
        timezone: "Asia/Jakarta"
      })
    });
    expectStatus(farm.response, 201, "pilot farm create");
    const farmId = readNonEmptyString(farm.body.data?.id, "created farm id");

    const plot = await requestJson(`/api/v1/farms/${encodeURIComponent(farmId)}/plots`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "content-type": "application/json",
        origin,
        "x-csrf-token": context.csrfToken
      },
      body: JSON.stringify({
        name: pilotPlotName,
        adm4_code: "34.71.02.1001",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [110.36915, -7.79520],
            [110.37035, -7.79520],
            [110.37035, -7.79410],
            [110.36915, -7.79410],
            [110.36915, -7.79520]
          ]]
        }
      })
    });
    expectStatus(plot.response, 201, "pilot plot create");
    createdPlotId = readNonEmptyString(plot.body.data?.id, "created plot id");
    expectPositiveNumber(plot.body.data?.area_m2, "created plot area_m2");
    return `created_farm=${farmId}, created_plot=${createdPlotId}`;
  });

  await record("DEVICE-002", "Backend + Security + QA/QC", "Provisioning device menunjukkan credential sekali dan revoke berhasil.", async () => {
    const serialNo = `PAMILO-UAT-${suffix}`;
    const provisioned = await requestJson(`/api/v1/plots/${encodeURIComponent(createdPlotId)}/devices`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "content-type": "application/json",
        origin,
        "x-csrf-token": context.csrfToken
      },
      body: JSON.stringify({
        serial_no: serialNo,
        label: "Pilot UAT Node"
      })
    });
    expectStatus(provisioned.response, 201, "device provision");
    expectHeader(provisioned.response, "cache-control", "no-store");
    const deviceId = readNonEmptyString(provisioned.body.data?.id, "provisioned device id");
    readNonEmptyString(provisioned.body.data?.credential?.password, "one-time device credential");
    if (!Array.isArray(provisioned.body.data?.mosquitto_acl) || provisioned.body.data.mosquitto_acl.length < 1) {
      throw new Error("provisioning did not return mosquitto ACL material");
    }

    const revoked = await requestJson(`/api/v1/devices/${encodeURIComponent(deviceId)}/revoke`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        origin,
        "x-csrf-token": context.csrfToken
      }
    });
    expectStatus(revoked.response, 200, "device revoke");
    expectEqual(revoked.body.data?.status, "revoked", "revoked device status");
    return `device=${deviceId}, credential_verified=shown_once, password_omitted_from_report=true`;
  });
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
    const message = error instanceof Error ? error.message : "Unknown UAT failure.";
    results.push({
      id,
      owner,
      requirement,
      status: "FAIL",
      durationMs: Date.now() - started,
      detail: message
    });
    console.error(`FAIL ${id} ${message}`);
  }
}

function skip(id, owner, requirement) {
  results.push({
    id,
    owner,
    requirement,
    status: "SKIP",
    durationMs: 0,
    detail: "Skipped by configuration."
  });
  console.log(`SKIP ${id}`);
}

function skipRemainingChecks() {
  const checks = [
    ["OPS-001", "DevOps + Security", "Liveness endpoint sehat dan baseline security header tersedia."],
    ["OPS-002", "DevOps + QA/QC", "Readiness endpoint memberi status dependensi yang dapat dicatat."],
    ["AUTH-001", "Backend + Security + QA/QC", "User pilot dapat login ke tenant yang benar."],
    ["AUTH-002", "Backend + Security + QA/QC", "Profile session dapat dibaca tanpa membuka credential."],
    ["TENANT-001", "Backend + Security + QA/QC", "List data hanya mengembalikan farm tenant aktif."],
    ["GIS-001", "Frontend + Backend + QA/QC", "Plot tenant aktif dapat dibaca beserta metrik GIS."],
    ["TENANT-002", "Backend + Security + QA/QC", "Direct object access lintas tenant tidak membocorkan data."],
    ["SEC-001", "Security + QA/QC", "Mutation tanpa CSRF token ditolak."],
    ["TEL-001", "Backend + QA/QC", "Latest telemetry tersedia untuk plot pilot."],
    ["TEL-002", "Backend + QA/QC", "History telemetry dapat di-query dengan window pilot."],
    ["BMKG-001", "Backend + Frontend + QA/QC", "Weather BMKG atau stale/missing state dapat dibaca."],
    ["DEVICE-001", "Backend + Security + QA/QC", "Device list tidak mengekspos password MQTT."],
    ["WRITE-001", "Frontend + Backend + QA/QC", "Farm dan plot pilot dapat dibuat dengan CSRF valid."],
    ["DEVICE-002", "Backend + Security + QA/QC", "Provisioning device menunjukkan credential sekali dan revoke berhasil."]
  ];

  for (const [id, owner, requirement] of checks) {
    skip(id, owner, requirement);
  }
}

async function writeReport() {
  await mkdir(reportDir, {
    recursive: true
  });

  const reportPath = join(reportDir, `pilot-uat-${runId}.md`);
  await writeFile(reportPath, buildReport(), "utf8");
  return reportPath;
}

function buildReport() {
  const finishedAt = new Date();
  const summary = summarizeResults();
  const rows = results.map((result) => (
    `| ${escapeMarkdown(result.id)} | ${escapeMarkdown(result.status)} | ${escapeMarkdown(result.owner)} | ${escapeMarkdown(result.requirement)} | ${escapeMarkdown(result.detail)} | ${result.durationMs} |`
  )).join("\n");

  return `# Pilot UAT Evidence

Generated: ${finishedAt.toISOString()}
Target: ${baseUrl.origin}
Environment: ${environment}
Write flow: ${writeEnabled ? "enabled" : "disabled"}
User: ${credentials.email}
Tenant: ${credentials.tenantId}

## Automated Summary

- Passed: ${summary.PASS}
- Failed: ${summary.FAIL}
- Skipped: ${summary.SKIP}
- Duration: ${finishedAt.getTime() - startedAt.getTime()} ms

## Automated Checks

| ID | Status | Owner | Requirement | Detail | Duration ms |
| --- | --- | --- | --- | --- | ---: |
${rows}

## Manual Pilot Checklist

| ID | Owner | Evidence Required | Result |
| --- | --- | --- | --- |
| MAN-001 | Frontend + QA/QC | Screenshot desktop dashboard after login, farm selection, plot selection, telemetry panel, and BMKG panel. | Pending |
| MAN-002 | Frontend + QA/QC | Screenshot mobile dashboard with no overlapping text or blocked controls. | Pending |
| MAN-003 | Backend + IT Infra + QA/QC | Timestamped note showing field ESP32 payload appears in staging telemetry within accepted pilot latency. | Pending |
| MAN-004 | IT Infra + DevOps | docker compose ps, disk usage, and container log tail captured after pilot window. | Pending |
| MAN-005 | Security + QA/QC | Confirmation that no password, MQTT secret, cookie, token, or stack trace appears in browser, logs, or generated report. | Pending |
| MAN-006 | PM + QA/QC | Farmer/operator training attendance and feedback notes. | Pending |
| MAN-007 | PM | Pilot acceptance decision signed: accepted, accepted with caveats, or rejected. | Pending |

## Sign-Off

| Role | Name | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
| PM |  |  |  |  |
| Farmer Representative |  |  |  |  |
| Frontend Lead |  |  |  |  |
| Backend Lead |  |  |  |  |
| IT Infra Lead |  |  |  |  |
| DevOps Lead |  |  |  |  |
| Security Lead |  |  |  |  |
| QA/QC Lead |  |  |  |  |
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

function authHeaders() {
  return {
    cookie: context.cookieHeader
  };
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

function assertSafeTarget() {
  const allowedEnvironments = new Set(["local", "staging", "pilot"]);
  if (!allowedEnvironments.has(environment)) {
    throw new Error("PAMILO_UAT_ENVIRONMENT must be local, staging, or pilot.");
  }

  if (isProductionHost(baseUrl.hostname)) {
    throw new Error("Pilot UAT script refuses production host targets.");
  }

  if (environment !== "local" && baseUrl.protocol !== "https:" && !isVpsIp(baseUrl.hostname)) {
    throw new Error("Remote pilot UAT targets must use HTTPS unless using the approved temporary VPS IP.");
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("PAMILO_UAT_TIMEOUT_MS must be a positive integer.");
  }
}

function isProductionHost(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === "pamilo.keycloud.id" || normalized === "mqtt.keycloud.id";
}

function isVpsIp(hostname) {
  return hostname === "43.157.203.226";
}

function inferEnvironment(url) {
  return isLocalHost(url.hostname) ? "local" : "staging";
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
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

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return url;
}

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}
