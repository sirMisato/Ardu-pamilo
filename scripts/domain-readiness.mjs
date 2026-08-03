import { mkdir, writeFile } from "node:fs/promises";
import { resolve4 } from "node:dns/promises";
import { join } from "node:path";

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const mode = process.env.PAMILO_DOMAIN_MODE ?? "dry-run";
const strict = mode === "gate";
const networkApproved = parseBoolean(process.env.PAMILO_DOMAIN_NETWORK_APPROVED, false);
const reportDir = process.env.PAMILO_DOMAIN_REPORT_DIR ?? ".local/domain-readiness";
const webDomain = process.env.PAMILO_WEB_DOMAIN ?? "sedayafarm.keycloud.id";
const expectedVpsIp = process.env.PAMILO_EXPECTED_VPS_IP ?? "43.157.203.226";
const productionOrigin = parseOrigin(process.env.PAMILO_WEB_PRODUCTION_ORIGIN ?? `https://${webDomain}`, "PAMILO_WEB_PRODUCTION_ORIGIN");
const timeoutMs = Number(process.env.PAMILO_DOMAIN_TIMEOUT_MS ?? "10000");

const config = {
  apiTrustedOrigins: process.env.PAMILO_API_TRUSTED_ORIGINS ?? productionOrigin.origin,
  dnsChangeWindowRef: process.env.PAMILO_DOMAIN_DNS_CHANGE_WINDOW_REF ?? "",
  tlsCertificateRef: process.env.PAMILO_DOMAIN_TLS_CERTIFICATE_REF ?? "",
  reverseProxyRef: process.env.PAMILO_DOMAIN_REVERSE_PROXY_REF ?? "",
  firewallEvidenceRef: process.env.PAMILO_DOMAIN_FIREWALL_EVIDENCE_REF ?? "",
  rollbackRef: process.env.PAMILO_DOMAIN_ROLLBACK_REF ?? "",
  qaSmokePlanRef: process.env.PAMILO_DOMAIN_QA_SMOKE_PLAN_REF ?? "",
  pmApprovalRef: process.env.PAMILO_DOMAIN_PM_APPROVAL_REF ?? "",
  qaApprovalRef: process.env.PAMILO_DOMAIN_QA_APPROVAL_REF ?? "",
  securityApprovalRef: process.env.PAMILO_DOMAIN_SECURITY_APPROVAL_REF ?? "",
  infraApprovalRef: process.env.PAMILO_DOMAIN_INFRA_APPROVAL_REF ?? "",
  devopsApprovalRef: process.env.PAMILO_DOMAIN_DEVOPS_APPROVAL_REF ?? ""
};

const results = [];

await runChecks();

const reportPath = await writeReport();
const summary = summarizeResults();

console.log(`Domain readiness report: ${reportPath}`);
console.log(`Domain readiness summary: ${summary.PASS} pass, ${summary.FAIL} fail, ${summary.SKIP} skip, mode=${mode}`);

if (strict && summary.FAIL > 0) {
  process.exitCode = 1;
}

async function runChecks() {
  check("DOM-001", "IT Infra + Security", "Web production domain valid dan bukan IP temporary.", () => {
    if (!isHostname(webDomain)) {
      throw new Error("PAMILO_WEB_DOMAIN must be a hostname.");
    }

    if (webDomain === "pamilo.keycloud.id") {
      throw new Error("PAMILO_WEB_DOMAIN must use sedayafarm.keycloud.id, not the retired placeholder.");
    }

    return `domain=${webDomain}`;
  });

  check("DOM-002", "Security + DevOps", "Production web origin memakai HTTPS dan cocok dengan domain.", () => {
    if (productionOrigin.protocol !== "https:") {
      throw new Error("production origin must use HTTPS.");
    }

    if (productionOrigin.hostname !== webDomain) {
      throw new Error("production origin hostname must match PAMILO_WEB_DOMAIN.");
    }

    return `origin=${productionOrigin.origin}`;
  });

  check("DOM-003", "Backend + Security", "API trusted origins mencakup production origin.", () => {
    const origins = config.apiTrustedOrigins.split(",").map((value) => value.trim()).filter(Boolean);

    if (!origins.includes(productionOrigin.origin)) {
      throw new Error("PAMILO_API_TRUSTED_ORIGINS must include the production origin.");
    }

    return `trusted_origin=${productionOrigin.origin}`;
  });

  check("DOM-004", "PM + IT Infra + DevOps", "DNS, TLS, reverse proxy, firewall, rollback, dan smoke evidence tersedia.", () => {
    expectEvidenceRef(config.dnsChangeWindowRef, "PAMILO_DOMAIN_DNS_CHANGE_WINDOW_REF");
    expectEvidenceRef(config.tlsCertificateRef, "PAMILO_DOMAIN_TLS_CERTIFICATE_REF");
    expectEvidenceRef(config.reverseProxyRef, "PAMILO_DOMAIN_REVERSE_PROXY_REF");
    expectEvidenceRef(config.firewallEvidenceRef, "PAMILO_DOMAIN_FIREWALL_EVIDENCE_REF");
    expectEvidenceRef(config.rollbackRef, "PAMILO_DOMAIN_ROLLBACK_REF");
    expectEvidenceRef(config.qaSmokePlanRef, "PAMILO_DOMAIN_QA_SMOKE_PLAN_REF");
    return "domain cutover evidence refs present";
  });

  check("DOM-005", "All Leads", "Approval cutover domain lengkap.", () => {
    expectEvidenceRef(config.pmApprovalRef, "PAMILO_DOMAIN_PM_APPROVAL_REF");
    expectEvidenceRef(config.qaApprovalRef, "PAMILO_DOMAIN_QA_APPROVAL_REF");
    expectEvidenceRef(config.securityApprovalRef, "PAMILO_DOMAIN_SECURITY_APPROVAL_REF");
    expectEvidenceRef(config.infraApprovalRef, "PAMILO_DOMAIN_INFRA_APPROVAL_REF");
    expectEvidenceRef(config.devopsApprovalRef, "PAMILO_DOMAIN_DEVOPS_APPROVAL_REF");
    return "domain approval refs present";
  });

  await networkCheck("DOM-006", "IT Infra + DevOps", "DNS A record mengarah ke VPS yang disetujui.", async () => {
    const addresses = await resolve4(webDomain);

    if (!addresses.includes(expectedVpsIp)) {
      throw new Error(`A record expected ${expectedVpsIp}, got ${addresses.join(", ") || "none"}`);
    }

    return `a_records=${addresses.join(", ")}`;
  });

  await networkCheck("DOM-007", "Frontend + Backend + QA/QC + Security", "HTTPS web dan API health dapat dibaca dari domain.", async () => {
    const web = await request("/");
    expectStatus(web, 200, "web root");
    const contentType = web.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error(`web root expected text/html, got ${contentType || "missing content-type"}`);
    }

    const live = await request("/health/live");
    expectStatus(live, 200, "health live");
    expectHeader(live, "x-frame-options", "DENY");
    expectHeader(live, "x-content-type-options", "nosniff");

    const hsts = live.headers.get("strict-transport-security") ?? "";
    if (!hsts.toLowerCase().includes("max-age=")) {
      throw new Error("strict-transport-security must include max-age.");
    }

    return "web root and API health passed over HTTPS";
  });

  check("DOM-008", "Security + IT Infra", "Domain readiness tidak menyentuh production MQTT atau MySQL.", () => (
    "no MQTT/MySQL connection is performed by this script"
  ));
}

function check(id, owner, requirement, action) {
  try {
    const detail = action();
    results.push({
      id,
      owner,
      requirement,
      status: "PASS",
      detail
    });
    console.log(`PASS ${id} ${detail}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown domain readiness failure.";
    results.push({
      id,
      owner,
      requirement,
      status: "FAIL",
      detail
    });
    console.error(`FAIL ${id} ${detail}`);
  }
}

async function networkCheck(id, owner, requirement, action) {
  if (!networkApproved) {
    if (strict) {
      results.push({
        id,
        owner,
        requirement,
        status: "FAIL",
        detail: "PAMILO_DOMAIN_NETWORK_APPROVED=true is required in gate mode."
      });
      console.error(`FAIL ${id} PAMILO_DOMAIN_NETWORK_APPROVED=true is required in gate mode.`);
      return;
    }

    results.push({
      id,
      owner,
      requirement,
      status: "SKIP",
      detail: "Network check skipped. Set PAMILO_DOMAIN_NETWORK_APPROVED=true after approval."
    });
    console.log(`SKIP ${id} network check not approved`);
    return;
  }

  await recordAsync(id, owner, requirement, action);
}

async function recordAsync(id, owner, requirement, action) {
  try {
    const detail = await action();
    results.push({
      id,
      owner,
      requirement,
      status: "PASS",
      detail
    });
    console.log(`PASS ${id} ${detail}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown domain readiness failure.";
    results.push({
      id,
      owner,
      requirement,
      status: "FAIL",
      detail
    });
    console.error(`FAIL ${id} ${detail}`);
  }
}

async function request(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(new URL(path, productionOrigin), {
      method: "GET",
      signal: controller.signal,
      headers: {
        "user-agent": "pamilo-domain-readiness/1.0"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function writeReport() {
  await mkdir(reportDir, {
    recursive: true
  });

  const reportPath = join(reportDir, `domain-readiness-${runId}.md`);
  await writeFile(reportPath, buildReport(), "utf8");
  return reportPath;
}

function buildReport() {
  const finishedAt = new Date();
  const summary = summarizeResults();
  const rows = results.map((result) => (
    `| ${escapeMarkdown(result.id)} | ${escapeMarkdown(result.status)} | ${escapeMarkdown(result.owner)} | ${escapeMarkdown(result.requirement)} | ${escapeMarkdown(result.detail)} |`
  )).join("\n");

  return `# Domain TLS Readiness Evidence

Generated: ${finishedAt.toISOString()}
Mode: ${mode}
Network approved: ${networkApproved ? "yes" : "no"}
Web domain: ${webDomain}
Production origin: ${productionOrigin.origin}
Expected VPS IP: ${expectedVpsIp}

## Summary

- Passed: ${summary.PASS}
- Failed: ${summary.FAIL}
- Skipped: ${summary.SKIP}
- Strict gate: ${strict ? "yes" : "no"}

## Checks

| ID | Status | Owner | Requirement | Detail |
| --- | --- | --- | --- | --- |
${rows}

## Operator Notes

- This script does not change DNS, deploy production, or connect to production MQTT/MySQL.
- Network checks are skipped unless PAMILO_DOMAIN_NETWORK_APPROVED=true.
- Production smoke still requires PAMILO_PRODUCTION_SMOKE_APPROVED=true.
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

function parseOrigin(value, name) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
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

function isHostname(value) {
  return /^[A-Za-z0-9.-]+$/.test(value) && value.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(value);
}

function expectEvidenceRef(value, name) {
  if (typeof value !== "string" || value.trim().length < 3) {
    throw new Error(`${name} evidence reference is required.`);
  }
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
