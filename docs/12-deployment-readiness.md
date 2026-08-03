# 12 - Deployment Readiness

Status: Draft Fase 0  
Pemilik: PM, DevOps Lead, IT Infra Lead, Security Lead, QA/QC Lead

## Tujuan

Menentukan syarat minimum agar PAMILO layak deploy ke staging dan production. Checklist ini dipakai untuk go/no-go meeting.

## Staging Readiness

- Environment staging tersedia dan prod-like.
- Semua service berjalan di Docker Compose.
- DNS staging atau host sementara tersedia.
- TLS valid untuk web dan MQTT sebelum production-like external rehearsal; Fase 8 awal boleh memakai host sementara `http://<vps>:<port>` untuk smoke terbatas.
- MySQL remote staging/test tidak memakai production data mentah.
- Redis dan VictoriaMetrics punya volume dan retention.
- CI deploy staging memakai image immutable.
- `API_TRUSTED_ORIGINS` sudah berisi origin web staging yang disetujui.
- API security headers dan safe error envelope lulus smoke test.
- Smoke test otomatis lulus.
- Rollback rehearsal berhasil.

## Artifact Fase 8

- Manual workflow: `.github/workflows/staging-deploy.yml`.
- Staging compose: `infra/staging/compose.staging.yaml`.
- Smoke command: `npm run smoke:staging`.
- Detail teknis dan rollback: `docs/22-phase-8-staging-deployment.md`.
- Akses VPS workflow memakai username/password dari `VPS_USERNAME` dan `VPS_PASSWORD`; private key tidak dipakai.

## Artifact Fase 9

- Pilot UAT command: `npm run uat:pilot`.
- Automated UAT report: `.local/pilot-uat/pilot-uat-<timestamp>.md`.
- Detail runbook dan acceptance: `docs/23-phase-9-pilot-uat.md`.
- Final staging UAT harus memakai `PAMILO_UAT_WRITE=true` agar flow create farm/plot dan device provision/revoke terbukti.
- Script UAT menolak host production; production smoke tetap Fase 10.

## Artifact Fase 10

- Production release gate command: `npm run release:preflight`.
- Production smoke command: `npm run smoke:production`.
- Manual workflow non-deploy: `.github/workflows/production-release-gate.yml`.
- Template preflight lokal: `infra/production/release-gate.env.example`.
- Detail release dan hypercare: `docs/24-phase-10-production-release.md`.
- Production smoke membutuhkan `PAMILO_PRODUCTION_SMOKE_APPROVED=true` sebelum melakukan request.

## Artifact Fase 11

- Public VPS simulation command: `npm run simulate:public-vps`.
- Manual workflow: `.github/workflows/public-vps-simulation.yml`.
- Template env lokal: `infra/staging/public-vps-simulation.env.example`.
- Detail runbook: `docs/25-phase-11-public-vps-simulation.md`.
- MQTT staging simulation berjalan di Docker network internal VPS, bukan public plaintext port.

## Artifact Fase 12

- Ops readiness command: `npm run ops:readiness`.
- Template env: `infra/ops/ops-readiness.env.example`.
- Detail readiness: `docs/26-phase-12-ops-readiness.md`.

## Artifact Fase 13

- Handover command: `npm run handover:check`.
- Template env: `infra/ops/handover.env.example`.
- Detail handover: `docs/27-phase-13-operations-handover.md`.

## Production Readiness

- Scope release dan release notes disetujui.
- Semua P0/P1 bugs selesai.
- Security checklist lulus.
- QA regression lulus.
- Load baseline lulus untuk target pilot.
- Backup terbaru tersedia.
- Restore drill berhasil di environment terisolasi.
- Migration plan dan rollback plan disetujui.
- DNS change window disetujui.
- Monitoring dan alert aktif.
- Hypercare owner dan jadwal standby jelas.
- `Production Release Gate` lulus dengan image digest immutable.
- Public VPS simulation dan ops readiness evidence sudah dilampirkan.

## Smoke Test Production

| Check | Expected |
| --- | --- |
| Web HTTPS | `https://pamilo.keycloud.id` valid TLS dan response sehat |
| API ready | `/health/ready` sehat |
| MQTT TLS | `mqtt.keycloud.id:8883` handshake valid |
| Login | User test bisa login |
| Tenant isolation | User test hanya melihat tenant sendiri |
| Map | Plot tampil dengan attribution OSM |
| Telemetry latest | Payload simulator tampil |
| BMKG | Weather tampil atau stale label benar |
| Logs | Tidak ada secret atau stack trace sensitif |
| Metrics | Dashboard observability menerima data |

## Rollback Criteria

Rollback dilakukan jika:

- Login gagal untuk mayoritas user.
- Cross-tenant issue terdeteksi.
- API error rate melewati threshold yang disetujui.
- MQTT ingest berhenti.
- Migration merusak data dan tidak bisa diperbaiki cepat.
- Data telemetry corrupt atau duplicate masif.

## Rollback Evidence

Setelah rollback:

- Image digest aktif tercatat.
- Migration state tercatat.
- Healthcheck hijau.
- Smoke test lulus.
- Incident note dibuat.

## Go/No-Go Approvals

| Role | Approval |
| --- | --- |
| PM | Scope, timing, communication |
| Backend Lead | API, data, migration |
| Frontend Lead | UI, UX, browser support |
| IT Infra Lead | DNS, TLS, firewall, storage |
| DevOps Lead | CI/CD, deploy, rollback |
| Security Lead | Threat model, secrets, auth, tenancy |
| QA/QC Lead | Test report, residual risk |
