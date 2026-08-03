import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const mode = process.env.PAMILO_RELEASE_MODE ?? "dry-run";
const strict = mode === "gate";
const reportDir = process.env.PAMILO_RELEASE_REPORT_DIR ?? ".local/production-release";

const config = {
  releaseTag: process.env.PAMILO_RELEASE_TAG ?? "",
  releaseCommit: process.env.PAMILO_RELEASE_COMMIT ?? gitOutput(["rev-parse", "HEAD"]),
  productionOrigin: process.env.PAMILO_PRODUCTION_ORIGIN ?? "",
  productionMqttHost: process.env.PAMILO_PRODUCTION_MQTT_HOST ?? "",
  apiImage: process.env.PAMILO_API_IMAGE ?? "",
  webImage: process.env.PAMILO_WEB_IMAGE ?? "",
  mqttIngestorImage: process.env.PAMILO_MQTT_INGESTOR_IMAGE ?? "",
  ciRunUrl: process.env.PAMILO_CI_RUN_URL ?? "",
  stagingRunUrl: process.env.PAMILO_STAGING_RUN_URL ?? "",
  pilotUatReportRef: process.env.PAMILO_PILOT_UAT_REPORT_REF ?? "",
  rollbackEvidenceRef: process.env.PAMILO_ROLLBACK_EVIDENCE_REF ?? "",
  backupRestoreEvidenceRef: process.env.PAMILO_BACKUP_RESTORE_EVIDENCE_REF ?? "",
  mysqlTlsDecision: process.env.PAMILO_MYSQL_TLS_DECISION ?? "open",
  mqttTlsAclReady: process.env.PAMILO_MQTT_TLS_ACL_READY ?? "false",
  dnsChangeWindowRef: process.env.PAMILO_DNS_CHANGE_WINDOW_REF ?? "",
  productionSmokePlanRef: process.env.PAMILO_PRODUCTION_SMOKE_PLAN_REF ?? "",
  hypercarePlanRef: process.env.PAMILO_HYPERCARE_PLAN_REF ?? "",
  pmApprovalRef: process.env.PAMILO_PM_APPROVAL_REF ?? "",
  qaApprovalRef: process.env.PAMILO_QA_APPROVAL_REF ?? "",
  securityApprovalRef: process.env.PAMILO_SECURITY_APPROVAL_REF ?? "",
  infraApprovalRef: process.env.PAMILO_INFRA_APPROVAL_REF ?? "",
  devopsApprovalRef: process.env.PAMILO_DEVOPS_APPROVAL_REF ?? "",
  frontendApprovalRef: process.env.PAMILO_FRONTEND_APPROVAL_REF ?? "",
  backendApprovalRef: process.env.PAMILO_BACKEND_APPROVAL_REF ?? ""
};

const results = [];

check("REL-001", "PM + DevOps", "Release tag dan commit final tersedia.", () => {
  expectMatch(config.releaseTag, /^v\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/, "PAMILO_RELEASE_TAG must look like v1.2.3");
  expectMatch(config.releaseCommit, /^[a-f0-9]{7,40}$/i, "PAMILO_RELEASE_COMMIT must be a git SHA");
  return `tag=${config.releaseTag}, commit=${config.releaseCommit.slice(0, 12)}`;
});

check("REL-002", "DevOps", "Worktree bersih saat release gate dijalankan.", () => {
  const status = gitOutput(["status", "--porcelain"]);
  if (status) {
    throw new Error("working tree has uncommitted changes");
  }
  return "git status clean";
});

check("REL-003", "Security + IT Infra", "Production origin memakai HTTPS dan host production yang disetujui.", () => {
  const url = parseHttpOrigin(config.productionOrigin, "PAMILO_PRODUCTION_ORIGIN");
  if (url.protocol !== "https:") {
    throw new Error("production origin must use HTTPS");
  }
  if (isTemporaryOrLocalHost(url.hostname)) {
    throw new Error("production origin must not be localhost, staging IP, or temporary host");
  }
  return `origin=${url.origin}`;
});

check("REL-004", "IT Infra + Security", "MQTT production host disiapkan untuk TLS/ACL.", () => {
  if (!isHostname(config.productionMqttHost)) {
    throw new Error("PAMILO_PRODUCTION_MQTT_HOST must be a hostname");
  }
  expectBooleanTrue(config.mqttTlsAclReady, "PAMILO_MQTT_TLS_ACL_READY");
  return `mqtt_host=${config.productionMqttHost}, tls_acl_ready=true`;
});

check("REL-005", "DevOps", "Image production memakai digest immutable.", () => {
  expectImageDigest(config.apiImage, "PAMILO_API_IMAGE");
  expectImageDigest(config.webImage, "PAMILO_WEB_IMAGE");
  expectImageDigest(config.mqttIngestorImage, "PAMILO_MQTT_INGESTOR_IMAGE");
  return "api/web/mqtt-ingestor images pinned by digest";
});

check("REL-006", "DevOps + QA/QC", "CI, staging deploy, UAT pilot, dan rollback evidence tersedia.", () => {
  expectEvidenceRef(config.ciRunUrl, "PAMILO_CI_RUN_URL");
  expectEvidenceRef(config.stagingRunUrl, "PAMILO_STAGING_RUN_URL");
  expectEvidenceRef(config.pilotUatReportRef, "PAMILO_PILOT_UAT_REPORT_REF");
  expectEvidenceRef(config.rollbackEvidenceRef, "PAMILO_ROLLBACK_EVIDENCE_REF");
  return "ci/staging/uat/rollback evidence refs present";
});

check("REL-007", "IT Infra + DevOps", "Backup restore drill dan RPO/RTO evidence tersedia.", () => {
  expectEvidenceRef(config.backupRestoreEvidenceRef, "PAMILO_BACKUP_RESTORE_EVIDENCE_REF");
  return "backup restore evidence present";
});

check("REL-008", "IT Infra + Security + Backend", "Keputusan MySQL production sudah tertutup sebelum akses DB production.", () => {
  const accepted = new Set(["tls-verified", "private-db", "managed-db", "no-production-db-access"]);
  if (!accepted.has(config.mysqlTlsDecision)) {
    throw new Error("PAMILO_MYSQL_TLS_DECISION must be tls-verified, private-db, managed-db, or no-production-db-access");
  }
  return `mysql_tls_decision=${config.mysqlTlsDecision}`;
});

check("REL-009", "IT Infra + PM", "DNS change window dan rollback komunikasi disetujui.", () => {
  expectEvidenceRef(config.dnsChangeWindowRef, "PAMILO_DNS_CHANGE_WINDOW_REF");
  return "dns change window evidence present";
});

check("REL-010", "QA/QC + DevOps", "Production smoke plan tersedia sebelum release.", () => {
  expectEvidenceRef(config.productionSmokePlanRef, "PAMILO_PRODUCTION_SMOKE_PLAN_REF");
  return "production smoke plan evidence present";
});

check("REL-011", "PM + DevOps + QA/QC", "Hypercare owner dan jadwal standby tersedia.", () => {
  expectEvidenceRef(config.hypercarePlanRef, "PAMILO_HYPERCARE_PLAN_REF");
  return "hypercare plan evidence present";
});

check("REL-012", "All Leads", "Go/no-go approvals lengkap.", () => {
  expectEvidenceRef(config.pmApprovalRef, "PAMILO_PM_APPROVAL_REF");
  expectEvidenceRef(config.qaApprovalRef, "PAMILO_QA_APPROVAL_REF");
  expectEvidenceRef(config.securityApprovalRef, "PAMILO_SECURITY_APPROVAL_REF");
  expectEvidenceRef(config.infraApprovalRef, "PAMILO_INFRA_APPROVAL_REF");
  expectEvidenceRef(config.devopsApprovalRef, "PAMILO_DEVOPS_APPROVAL_REF");
  expectEvidenceRef(config.frontendApprovalRef, "PAMILO_FRONTEND_APPROVAL_REF");
  expectEvidenceRef(config.backendApprovalRef, "PAMILO_BACKEND_APPROVAL_REF");
  return "lead approval refs present";
});

const reportPath = await writeReport();
const summary = summarizeResults();

console.log(`Production release preflight report: ${reportPath}`);
console.log(`Preflight summary: ${summary.PASS} pass, ${summary.FAIL} fail, mode=${mode}`);

if (strict && summary.FAIL > 0) {
  process.exitCode = 1;
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
    const detail = error instanceof Error ? error.message : "Unknown release gate failure.";
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

async function writeReport() {
  await mkdir(reportDir, {
    recursive: true
  });

  const reportPath = join(reportDir, `production-release-preflight-${runId}.md`);
  await writeFile(reportPath, buildReport(), "utf8");
  return reportPath;
}

function buildReport() {
  const finishedAt = new Date();
  const summary = summarizeResults();
  const rows = results.map((result) => (
    `| ${escapeMarkdown(result.id)} | ${escapeMarkdown(result.status)} | ${escapeMarkdown(result.owner)} | ${escapeMarkdown(result.requirement)} | ${escapeMarkdown(result.detail)} |`
  )).join("\n");

  return `# Production Release Preflight

Generated: ${finishedAt.toISOString()}
Mode: ${mode}
Release tag: ${safeValue(config.releaseTag)}
Release commit: ${safeValue(config.releaseCommit)}
Production origin: ${safeValue(config.productionOrigin)}
Production MQTT host: ${safeValue(config.productionMqttHost)}

## Summary

- Passed: ${summary.PASS}
- Failed: ${summary.FAIL}
- Strict gate: ${strict ? "yes" : "no"}

## Checks

| ID | Status | Owner | Requirement | Detail |
| --- | --- | --- | --- | --- |
${rows}

## Required Operator Notes

- This report does not deploy production.
- Production deploy remains blocked until all failures are closed in gate mode.
- Do not add production DB access until the MySQL TLS/Hostinger decision is closed.
- DNS changes require a separate approved change window.
`;
}

function summarizeResults() {
  return results.reduce((summary, result) => {
    summary[result.status] += 1;
    return summary;
  }, {
    PASS: 0,
    FAIL: 0
  });
}

function expectMatch(value, regex, message) {
  if (!regex.test(value)) {
    throw new Error(message);
  }
}

function expectEvidenceRef(value, name) {
  if (typeof value !== "string" || value.trim().length < 3) {
    throw new Error(`${name} evidence reference is required`);
  }
}

function expectBooleanTrue(value, name) {
  if (String(value).trim().toLowerCase() !== "true") {
    throw new Error(`${name} must be true`);
  }
}

function expectImageDigest(value, name) {
  if (!/^ghcr\.io\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${name} must be a GHCR image pinned by sha256 digest`);
  }
}

function parseHttpOrigin(value, name) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${name} must use http or https`);
  }

  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an origin without path, query, fragment, or credentials`);
  }

  return url;
}

function isHostname(value) {
  return /^[A-Za-z0-9.-]+$/.test(value) && value.includes(".");
}

function isTemporaryOrLocalHost(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "43.157.203.226";
}

function gitOutput(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function safeValue(value) {
  return value ? escapeMarkdown(value) : "missing";
}

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}
