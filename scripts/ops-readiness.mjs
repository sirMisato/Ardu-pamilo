import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const mode = process.env.PAMILO_OPS_MODE ?? "dry-run";
const strict = mode === "gate";
const reportDir = process.env.PAMILO_OPS_REPORT_DIR ?? ".local/ops-readiness";
const environment = process.env.PAMILO_OPS_ENVIRONMENT ?? "staging";

const config = {
  publicVpsSimulationReportRef: process.env.PAMILO_PUBLIC_VPS_SIMULATION_REPORT_REF ?? "",
  dashboardRef: process.env.PAMILO_OPS_DASHBOARD_REF ?? "",
  alertChannelRef: process.env.PAMILO_OPS_ALERT_CHANNEL_REF ?? "",
  incidentCommanderRef: process.env.PAMILO_OPS_INCIDENT_COMMANDER_REF ?? "",
  oncallRosterRef: process.env.PAMILO_OPS_ONCALL_ROSTER_REF ?? "",
  logRetentionRef: process.env.PAMILO_OPS_LOG_RETENTION_REF ?? "",
  backupScheduleRef: process.env.PAMILO_OPS_BACKUP_SCHEDULE_REF ?? "",
  restoreDrillRef: process.env.PAMILO_OPS_RESTORE_DRILL_REF ?? "",
  rollbackRunbookRef: process.env.PAMILO_OPS_ROLLBACK_RUNBOOK_REF ?? "",
  telemetryStaleThresholdMinutes: process.env.PAMILO_OPS_TELEMETRY_STALE_THRESHOLD_MINUTES ?? "10",
  weatherStaleThresholdHours: process.env.PAMILO_OPS_WEATHER_STALE_THRESHOLD_HOURS ?? "6",
  freshnessThresholdEvidenceRef: process.env.PAMILO_OPS_FRESHNESS_THRESHOLD_EVIDENCE_REF ?? "",
  securityIncidentRef: process.env.PAMILO_OPS_SECURITY_INCIDENT_REF ?? "",
  secretRotationRef: process.env.PAMILO_OPS_SECRET_ROTATION_REF ?? "",
  pmApprovalRef: process.env.PAMILO_OPS_PM_APPROVAL_REF ?? "",
  qaApprovalRef: process.env.PAMILO_OPS_QA_APPROVAL_REF ?? "",
  securityApprovalRef: process.env.PAMILO_OPS_SECURITY_APPROVAL_REF ?? "",
  infraApprovalRef: process.env.PAMILO_OPS_INFRA_APPROVAL_REF ?? "",
  devopsApprovalRef: process.env.PAMILO_OPS_DEVOPS_APPROVAL_REF ?? ""
};

const results = [];

check("OPS-001", "PM + QA/QC", "Public VPS simulation evidence tersedia.", () => {
  expectEvidenceRef(config.publicVpsSimulationReportRef, "PAMILO_PUBLIC_VPS_SIMULATION_REPORT_REF");
  return "public VPS simulation evidence ref present";
});

check("OPS-002", "DevOps + IT Infra", "Dashboard observability untuk API, web, MQTT, dan data services tersedia.", () => {
  expectEvidenceRef(config.dashboardRef, "PAMILO_OPS_DASHBOARD_REF");
  return "observability dashboard ref present";
});

check("OPS-003", "DevOps + PM", "Alert routing dan kanal eskalasi sudah disepakati.", () => {
  expectEvidenceRef(config.alertChannelRef, "PAMILO_OPS_ALERT_CHANNEL_REF");
  return "alert channel ref present";
});

check("OPS-004", "PM + DevOps + IT Infra", "Incident commander dan roster on-call tersedia.", () => {
  expectEvidenceRef(config.incidentCommanderRef, "PAMILO_OPS_INCIDENT_COMMANDER_REF");
  expectEvidenceRef(config.oncallRosterRef, "PAMILO_OPS_ONCALL_ROSTER_REF");
  return "incident commander and on-call roster refs present";
});

check("OPS-005", "Security + DevOps", "Log retention dan redaction policy tercatat.", () => {
  expectEvidenceRef(config.logRetentionRef, "PAMILO_OPS_LOG_RETENTION_REF");
  return "log retention and redaction evidence present";
});

check("OPS-006", "IT Infra + DevOps + QA/QC", "Backup schedule dan restore drill evidence tersedia.", () => {
  expectEvidenceRef(config.backupScheduleRef, "PAMILO_OPS_BACKUP_SCHEDULE_REF");
  expectEvidenceRef(config.restoreDrillRef, "PAMILO_OPS_RESTORE_DRILL_REF");
  return "backup schedule and restore drill refs present";
});

check("OPS-007", "DevOps + QA/QC", "Rollback runbook sudah diuji atau memiliki evidence rehearsal.", () => {
  expectEvidenceRef(config.rollbackRunbookRef, "PAMILO_OPS_ROLLBACK_RUNBOOK_REF");
  return "rollback runbook ref present";
});

check("OPS-008", "Backend + QA/QC + PM", "Freshness indikator telemetry dan weather punya nilai operasional serta evidence.", () => {
  expectPositiveInteger(config.telemetryStaleThresholdMinutes, "PAMILO_OPS_TELEMETRY_STALE_THRESHOLD_MINUTES");
  expectPositiveInteger(config.weatherStaleThresholdHours, "PAMILO_OPS_WEATHER_STALE_THRESHOLD_HOURS");
  expectEvidenceRef(config.freshnessThresholdEvidenceRef, "PAMILO_OPS_FRESHNESS_THRESHOLD_EVIDENCE_REF");
  return `telemetry_stale_minutes=${config.telemetryStaleThresholdMinutes}, weather_stale_hours=${config.weatherStaleThresholdHours}`;
});

check("OPS-009", "Security + IT Infra + DevOps", "Incident security dan secret rotation runbook tersedia.", () => {
  expectEvidenceRef(config.securityIncidentRef, "PAMILO_OPS_SECURITY_INCIDENT_REF");
  expectEvidenceRef(config.secretRotationRef, "PAMILO_OPS_SECRET_ROTATION_REF");
  return "security incident and secret rotation refs present";
});

check("OPS-010", "All Leads", "Approval operasional sebelum handover lengkap.", () => {
  expectEvidenceRef(config.pmApprovalRef, "PAMILO_OPS_PM_APPROVAL_REF");
  expectEvidenceRef(config.qaApprovalRef, "PAMILO_OPS_QA_APPROVAL_REF");
  expectEvidenceRef(config.securityApprovalRef, "PAMILO_OPS_SECURITY_APPROVAL_REF");
  expectEvidenceRef(config.infraApprovalRef, "PAMILO_OPS_INFRA_APPROVAL_REF");
  expectEvidenceRef(config.devopsApprovalRef, "PAMILO_OPS_DEVOPS_APPROVAL_REF");
  return "ops approval refs present";
});

const reportPath = await writeReport();
const summary = summarizeResults();

console.log(`Ops readiness report: ${reportPath}`);
console.log(`Ops readiness summary: ${summary.PASS} pass, ${summary.FAIL} fail, mode=${mode}`);

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
    const detail = error instanceof Error ? error.message : "Unknown ops readiness failure.";
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

  const reportPath = join(reportDir, `ops-readiness-${runId}.md`);
  await writeFile(reportPath, buildReport(), "utf8");
  return reportPath;
}

function buildReport() {
  const finishedAt = new Date();
  const summary = summarizeResults();
  const rows = results.map((result) => (
    `| ${escapeMarkdown(result.id)} | ${escapeMarkdown(result.status)} | ${escapeMarkdown(result.owner)} | ${escapeMarkdown(result.requirement)} | ${escapeMarkdown(result.detail)} |`
  )).join("\n");

  return `# Ops Readiness Evidence

Generated: ${finishedAt.toISOString()}
Mode: ${mode}
Environment: ${environment}

## Summary

- Passed: ${summary.PASS}
- Failed: ${summary.FAIL}
- Strict gate: ${strict ? "yes" : "no"}

## Checks

| ID | Status | Owner | Requirement | Detail |
| --- | --- | --- | --- | --- |
${rows}

## Operator Notes

- This report checks evidence refs only and does not connect to production services.
- Freshness thresholds are operational stale indicators, not agronomy recommendation thresholds.
- Gate mode must only be used after monitoring, alerting, backup, rollback, and incident evidence are attached.
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

function expectPositiveInteger(value, name) {
  if (!/^\d+$/.test(value) || Number(value) <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}
