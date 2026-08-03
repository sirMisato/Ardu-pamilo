# 27 - Phase 13 Operations Handover

Status: In Progress
Pemilik: PM + semua lead
Tanggal mulai: 2026-08-04

## Tujuan

Fase 13 menutup rangkaian kesiapan deploy dengan handover operasional. Fokusnya adalah memastikan tim kecil bisa menjalankan, memonitor, mensimulasikan, merilis, dan melakukan rollback dengan bukti yang rapi.

## Scope Implementasi Saat Ini

- `scripts/handover-check.mjs` untuk validasi repo artifacts dan evidence handover.
- `npm run handover:check` sebagai entrypoint handover gate.
- `infra/ops/handover.env.example` sebagai template non-secret.
- Report handover ditulis ke `.local/handover/`.
- Roadmap diperbarui sampai Phase 13.

## Batas Aman

- Handover check tidak menjalankan deploy.
- DNS tidak diubah.
- Production MQTT dan MySQL tidak disentuh.
- Private key tidak dipakai.
- Evidence refs boleh berupa URL internal, issue, run ID, atau path artifact, tetapi tidak boleh berisi secret.

## Handover Gate

Dry-run lokal:

```text
npm run handover:check
```

Gate mode setelah semua evidence lengkap:

```text
PAMILO_HANDOVER_MODE=gate npm run handover:check
```

Checklist otomatis:

| ID | Area | Evidence |
| --- | --- | --- |
| `HAND-001` | Dokumen | Roadmap, readiness, risk register, Phase 10-14 |
| `HAND-002` | Commands | CI, smoke, UAT, domain, release, simulation, ops, handover |
| `HAND-003` | Safety | Production gate non-deploy dan tanpa private key |
| `HAND-004` | Handover pack | Release notes, runbook, training, asset inventory |
| `HAND-005` | Risk | Blocker register dan residual risk acceptance |
| `HAND-006` | Hypercare | Closure dan support window |
| `HAND-007` | Sign-off | PM, QA/QC, Security, Infra, DevOps, Frontend, Backend |

## Handover Pack Minimum

- Release scope dan release notes.
- Simulasi public VPS Phase 11.
- Ops readiness Phase 12.
- Deployment, rollback, dan restore runbook.
- Daftar service, port, env, secret owner, dan artifact image.
- QA/UAT report dan known issues.
- Security checklist dan incident response.
- Training notes untuk operator/farmer.
- Owner support dan SLA internal selama hypercare.

## Role Handover

| Role | Handover wajib |
| --- | --- |
| PM | Scope, go/no-go notes, risk acceptance, communication plan |
| Frontend | Route utama, browser support, UX known issues, screenshot baseline |
| Backend | API contracts, tenant guard, migration notes, data dependency |
| IT Infra | VPS, firewall, disk, backup, SSH access, known hosts |
| DevOps | CI/CD, GHCR image, deploy, rollback, artifact retention |
| Security | Secret handling, incident response, MQTT ACL/TLS readiness |
| QA/QC | Test matrix, UAT report, smoke commands, regression gaps |

## Exit Criteria Fase 13

- `npm run handover:check` gate lulus.
- Handover pack tersedia dan bisa dipakai operator lain.
- Semua role inti sign-off.
- Residual risk yang tersisa punya owner, severity, target date, dan acceptance.
- Next-phase backlog dibuat untuk ingestion durable, DB production decision, domain/TLS production, dan Playwright E2E.

## Backlog Setelah Phase 13

- MQTT ingestor production hardening: TLS/ACL production, persistent device ownership check, dan replay dari Redis Stream saat write history gagal.
- Production DB path setelah MySQL TLS/Hostinger decision tertutup.
- Domain/TLS production dengan change window yang disetujui. Status awal ada di `docs/28-phase-14-domain-tls-cutover.md`.
- Playwright E2E desktop/mobile untuk dashboard.
- Observability dashboard otomatis dari metric source final.
- Backup/restore automation untuk data services final.
