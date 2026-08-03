import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const mode = process.env.PAMILO_HANDOVER_MODE ?? "dry-run";
const strict = mode === "gate";
const reportDir = process.env.PAMILO_HANDOVER_REPORT_DIR ?? ".local/handover";

const config = {
  releaseNotesRef: process.env.PAMILO_HANDOVER_RELEASE_NOTES_REF ?? "",
  runbookRef: process.env.PAMILO_HANDOVER_RUNBOOK_REF ?? "",
  trainingRef: process.env.PAMILO_HANDOVER_TRAINING_REF ?? "",
  assetInventoryRef: process.env.PAMILO_HANDOVER_ASSET_INVENTORY_REF ?? "",
  blockerRegisterRef: process.env.PAMILO_HANDOVER_BLOCKER_REGISTER_REF ?? "",
  openRiskAcceptanceRef: process.env.PAMILO_HANDOVER_OPEN_RISK_ACCEPTANCE_REF ?? "",
  hypercareClosureRef: process.env.PAMILO_HANDOVER_HYPERCARE_CLOSURE_REF ?? "",
  supportWindowRef: process.env.PAMILO_HANDOVER_SUPPORT_WINDOW_REF ?? "",
  pmApprovalRef: process.env.PAMILO_HANDOVER_PM_APPROVAL_REF ?? "",
  qaApprovalRef: process.env.PAMILO_HANDOVER_QA_APPROVAL_REF ?? "",
  securityApprovalRef: process.env.PAMILO_HANDOVER_SECURITY_APPROVAL_REF ?? "",
  infraApprovalRef: process.env.PAMILO_HANDOVER_INFRA_APPROVAL_REF ?? "",
  devopsApprovalRef: process.env.PAMILO_HANDOVER_DEVOPS_APPROVAL_REF ?? "",
  frontendApprovalRef: process.env.PAMILO_HANDOVER_FRONTEND_APPROVAL_REF ?? "",
  backendApprovalRef: process.env.PAMILO_HANDOVER_BACKEND_APPROVAL_REF ?? ""
};

const results = [];

check("HAND-001", "PM", "Dokumen fase utama sampai Phase 13 tersedia.", () => {
  const requiredDocs = [
    "docs/00-pm-roadmap.md",
    "docs/12-deployment-readiness.md",
    "docs/13-risk-decision-register.md",
    "docs/24-phase-10-production-release.md",
    "docs/25-phase-11-public-vps-simulation.md",
    "docs/26-phase-12-ops-readiness.md",
    "docs/27-phase-13-operations-handover.md",
    "docs/28-phase-14-domain-tls-cutover.md"
  ];

  const missing = requiredDocs.filter((file) => !existsSync(file));
  if (missing.length > 0) {
    throw new Error(`missing docs: ${missing.join(", ")}`);
  }

  return `docs=${requiredDocs.length}`;
});

check("HAND-002", "DevOps + QA/QC", "Command operasional utama tersedia di package.json.", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const scripts = packageJson.scripts ?? {};
  const requiredScripts = [
    "ci",
    "smoke:staging",
    "uat:pilot",
    "domain:readiness",
    "release:preflight",
    "smoke:production",
    "simulate:public-vps",
    "ops:readiness",
    "handover:check"
  ];
  const missing = requiredScripts.filter((script) => typeof scripts[script] !== "string");

  if (missing.length > 0) {
    throw new Error(`missing package scripts: ${missing.join(", ")}`);
  }

  return `scripts=${requiredScripts.length}`;
});

check("HAND-003", "Security + DevOps", "Production gate tetap non-deploy dan tidak memakai private key.", () => {
  const workflow = readFileSync(".github/workflows/production-release-gate.yml", "utf8");

  if (/sshpass|docker compose|scp|ssh\s/.test(workflow)) {
    throw new Error("production release gate must not SSH, SCP, or deploy");
  }

  if (/PRIVATE_KEY|private key/i.test(workflow)) {
    throw new Error("production release gate must not require private key");
  }

  return "production gate is evidence-only";
});

check("HAND-004", "PM + DevOps", "Release notes, runbook, training, dan asset inventory punya evidence ref.", () => {
  expectEvidenceRef(config.releaseNotesRef, "PAMILO_HANDOVER_RELEASE_NOTES_REF");
  expectEvidenceRef(config.runbookRef, "PAMILO_HANDOVER_RUNBOOK_REF");
  expectEvidenceRef(config.trainingRef, "PAMILO_HANDOVER_TRAINING_REF");
  expectEvidenceRef(config.assetInventoryRef, "PAMILO_HANDOVER_ASSET_INVENTORY_REF");
  return "handover pack evidence refs present";
});

check("HAND-005", "PM + Security + QA/QC", "Blocker register dan residual risk acceptance tersedia.", () => {
  expectEvidenceRef(config.blockerRegisterRef, "PAMILO_HANDOVER_BLOCKER_REGISTER_REF");
  expectEvidenceRef(config.openRiskAcceptanceRef, "PAMILO_HANDOVER_OPEN_RISK_ACCEPTANCE_REF");
  return "blocker and residual risk refs present";
});

check("HAND-006", "PM + DevOps + QA/QC", "Hypercare closure dan support window jelas.", () => {
  expectEvidenceRef(config.hypercareClosureRef, "PAMILO_HANDOVER_HYPERCARE_CLOSURE_REF");
  expectEvidenceRef(config.supportWindowRef, "PAMILO_HANDOVER_SUPPORT_WINDOW_REF");
  return "hypercare closure and support window refs present";
});

check("HAND-007", "All Leads", "Sign-off handover lengkap untuk semua role inti.", () => {
  expectEvidenceRef(config.pmApprovalRef, "PAMILO_HANDOVER_PM_APPROVAL_REF");
  expectEvidenceRef(config.qaApprovalRef, "PAMILO_HANDOVER_QA_APPROVAL_REF");
  expectEvidenceRef(config.securityApprovalRef, "PAMILO_HANDOVER_SECURITY_APPROVAL_REF");
  expectEvidenceRef(config.infraApprovalRef, "PAMILO_HANDOVER_INFRA_APPROVAL_REF");
  expectEvidenceRef(config.devopsApprovalRef, "PAMILO_HANDOVER_DEVOPS_APPROVAL_REF");
  expectEvidenceRef(config.frontendApprovalRef, "PAMILO_HANDOVER_FRONTEND_APPROVAL_REF");
  expectEvidenceRef(config.backendApprovalRef, "PAMILO_HANDOVER_BACKEND_APPROVAL_REF");
  return "all handover approval refs present";
});

const reportPath = await writeReport();
const summary = summarizeResults();

console.log(`Handover check report: ${reportPath}`);
console.log(`Handover check summary: ${summary.PASS} pass, ${summary.FAIL} fail, mode=${mode}`);

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
    const detail = error instanceof Error ? error.message : "Unknown handover failure.";
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

  const reportPath = join(reportDir, `handover-check-${runId}.md`);
  await writeFile(reportPath, buildReport(), "utf8");
  return reportPath;
}

function buildReport() {
  const finishedAt = new Date();
  const summary = summarizeResults();
  const rows = results.map((result) => (
    `| ${escapeMarkdown(result.id)} | ${escapeMarkdown(result.status)} | ${escapeMarkdown(result.owner)} | ${escapeMarkdown(result.requirement)} | ${escapeMarkdown(result.detail)} |`
  )).join("\n");

  return `# Operations Handover Evidence

Generated: ${finishedAt.toISOString()}
Mode: ${mode}

## Summary

- Passed: ${summary.PASS}
- Failed: ${summary.FAIL}
- Strict gate: ${strict ? "yes" : "no"}

## Checks

| ID | Status | Owner | Requirement | Detail |
| --- | --- | --- | --- | --- |
${rows}

## Operator Notes

- This handover check validates repo artifacts and evidence refs only.
- Production deploy, DNS changes, production MQTT, and production MySQL remain outside this command.
- Gate mode should be run after Phase 11 and Phase 12 evidence is attached.
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

function expectEvidenceRef(value, name) {
  if (typeof value !== "string" || value.trim().length < 3) {
    throw new Error(`${name} evidence reference is required`);
  }
}

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}
