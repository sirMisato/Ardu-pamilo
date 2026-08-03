# 14 - Phase 1 Foundation

Status: In Progress  
Pemilik: PM + semua technical leads  
Tanggal mulai: 2026-08-03

## Tujuan

Fase 1 menyiapkan fondasi engineering lokal agar tim Frontend, Backend, IT Infra, DevOps, Security, dan QA/QC dapat mulai bekerja dengan kontrak, command, dan CI yang sama.

## Scope

- Monorepo npm workspaces.
- Shared schema package untuk telemetry, MQTT topic, dan TenantContext.
- Fastify API skeleton dengan health endpoints.
- Vue/Vite frontend skeleton.
- MQTT ingestor worker skeleton dengan handler testable.
- Docker Compose local untuk API, web, worker, Redis, VictoriaMetrics, dan Mosquitto local.
- GitHub Actions CI untuk secret scan, lint, typecheck, test, dan build.
- GitHub Actions manual workflow untuk read-only VPS connectivity check.
- README dan AGENTS repository conventions.

## Explicit Non-Scope

- Tidak ada production deploy.
- Tidak ada perubahan DNS.
- Tidak ada koneksi ke MySQL Hostinger production.
- Tidak ada koneksi ke broker production `mqtt.keycloud.id`.
- Tidak ada real credential.
- Tidak ada password-based deploy workflow.
- Tidak ada auth/tenant implementation penuh; itu Fase 2.

## Blocker Decisions Still Open

Fase 1 lokal boleh dimulai dengan asumsi aman, tetapi keputusan berikut tetap harus dikunci sebelum staging/production design:

| ID | Status Fase 1 |
| --- | --- |
| DEC-001 | Open; Compose local memakai asumsi satu VPS MVP |
| DEC-002 | Open; DB production belum dikonfigurasi |
| DEC-003 | Open; VictoriaMetrics local memakai retention 1 bulan |
| DEC-004 | Open; backup/restore masih dokumentasi |
| DEC-008A | Deadline sebelum Fase 2 |

## Acceptance Criteria Fase 1

- `npm install` berhasil.
- `npm run lint` hijau.
- `npm run typecheck` hijau.
- `npm test` hijau.
- `npm run build` hijau.
- `npm run secret:scan` tidak menemukan credential nyata.
- `docker compose config` valid.
- `VPS Connectivity Check` tersedia sebagai workflow manual dan read-only.
- API `/health/live` dan `/health/ready` tersedia di skeleton.
- Worker MQTT punya test untuk payload valid, invalid JSON, dan topic/body mismatch.
- Shared schema punya test payload sensor dan topic.

## Handoff per Role

| Role | Mulai dari |
| --- | --- |
| Frontend UI/UX | `apps/web`, `docs/03-frontend-uiux.md` |
| Backend | `apps/api`, `packages/shared`, `docs/04-backend.md` |
| IT Infra | `compose.yaml`, `infra/mosquitto`, `docs/05-it-infra.md` |
| DevOps | `.github/workflows/ci.yml`, `scripts/check-secrets.mjs`, `docs/06-devops.md` |
| Security | `docs/07-security.md`, `docs/13-risk-decision-register.md` |
| QA/QC | `vitest.config.ts`, test files, `docs/08-qa-qc.md` |
