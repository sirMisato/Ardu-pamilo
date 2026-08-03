# 24 - Phase 10 Production Release

Status: In Progress
Pemilik: PM + DevOps + IT Infra + Security + QA/QC
Tanggal mulai: 2026-08-04

## Tujuan

Fase 10 menyiapkan go-live production dengan evidence gate yang ketat. Implementasi saat ini belum melakukan production deploy, belum mengubah DNS, dan belum membuka akses database production. Artifact yang dibuat hanya untuk membuktikan kesiapan release sebelum operator memberi approval terpisah.

## Scope Implementasi Saat Ini

- `scripts/release-preflight.mjs` untuk validasi go/no-go release production.
- `npm run release:preflight` sebagai entrypoint preflight.
- `scripts/smoke-production.mjs` untuk smoke read-only setelah production tersedia.
- `npm run smoke:production` sebagai entrypoint smoke production.
- `.github/workflows/production-release-gate.yml` sebagai workflow manual gate tanpa deploy.
- `infra/production/release-gate.env.example` sebagai template non-secret untuk preflight lokal.
- Report preflight dan smoke ditulis ke `.local/production-release/`.

## Batas Aman

- Tidak ada production deploy workflow.
- Tidak ada SSH ke VPS production.
- Tidak ada perubahan DNS.
- Tidak ada koneksi MQTT production dari local test.
- Tidak ada koneksi MySQL production.
- Production DB access tetap diblokir sampai keputusan MySQL TLS/Hostinger ditutup.

## Production Release Gate

Workflow manual `Production Release Gate` menjalankan:

1. `npm ci`
2. `npm run ci`
3. `npm run release:preflight`
4. Upload artifact report preflight

Workflow ini hanya memvalidasi evidence dan tidak menjalankan deploy.

## Input Wajib Gate

| Input | Tujuan |
| --- | --- |
| `release_tag` | Tag release immutable, contoh `v0.1.0` |
| `production_origin` | Origin production HTTPS |
| `production_mqtt_host` | Host MQTT production |
| `api_image`, `web_image`, `mqtt_ingestor_image` | Image GHCR pinned by digest |
| `ci_run_url` | Bukti CI hijau |
| `staging_run_url` | Bukti staging deploy lulus |
| `pilot_uat_report_ref` | Bukti UAT pilot |
| `rollback_evidence_ref` | Bukti rollback rehearsal |
| `backup_restore_evidence_ref` | Bukti restore drill |
| `mysql_tls_decision` | Keputusan DB production tertutup |
| `mqtt_tls_acl_ready` | Bukti MQTT TLS dan ACL per device siap |
| `dns_change_window_ref` | Bukti change window DNS |
| `production_smoke_plan_ref` | Rencana smoke setelah deploy |
| `hypercare_plan_ref` | Owner dan jadwal standby |
| Approval refs | PM, QA/QC, Security, Infra, DevOps, Frontend, Backend |

## Local Dry-Run Preflight

Mode default adalah dry-run. Ia membuat report dan menampilkan blocker, tetapi tidak menggagalkan command:

```text
npm run release:preflight
```

Mode gate dipakai saat semua evidence sudah ada:

```text
PAMILO_RELEASE_MODE=gate npm run release:preflight
```

Dalam mode gate, command exit nonzero jika ada blocker.

## Production Smoke

Smoke production sengaja membutuhkan approval eksplisit sebelum request pertama:

```text
PAMILO_PRODUCTION_SMOKE_APPROVED=true PAMILO_PRODUCTION_BASE_URL=https://pamilo.keycloud.id npm run smoke:production
```

Default smoke hanya read-only:

- `/health/live`
- Security headers
- HSTS
- `/health/ready`
- Dependency readiness tidak boleh `local` atau `not_configured`

Login smoke opsional dan tetap read-only:

```text
PAMILO_PRODUCTION_SMOKE_APPROVED=true PAMILO_PRODUCTION_SMOKE_LOGIN=true PAMILO_PRODUCTION_SMOKE_EMAIL=<email> PAMILO_PRODUCTION_SMOKE_PASSWORD=<password> PAMILO_PRODUCTION_SMOKE_TENANT_ID=<tenant-id> npm run smoke:production
```

Jangan menulis credential production ke file repo, command history publik, log CI, atau dokumentasi.

## Go-Live Sequence

| Step | Owner | Evidence |
| --- | --- | --- |
| 1 | PM | Scope release dan komunikasi pilot disetujui |
| 2 | DevOps | CI dan Docker image digest tersedia |
| 3 | QA/QC | Fase 9 UAT report accepted |
| 4 | Security | Secret, tenancy, CSRF, MQTT ACL, dan approval lengkap |
| 5 | IT Infra | TLS, DNS change window, backup restore, disk capacity |
| 6 | Backend | Migration dan DB decision tertutup |
| 7 | DevOps | `Production Release Gate` hijau |
| 8 | PM | Release approval eksplisit diberikan |
| 9 | DevOps + Infra | Production deploy dilakukan melalui runbook operator yang disetujui |
| 10 | QA/QC | `npm run smoke:production` lulus |
| 11 | PM + semua lead | Hypercare dimulai |

## Rollback Trigger

Rollback segera jika:

- Login mayoritas user gagal.
- Cross-tenant leak dicurigai.
- API readiness gagal setelah release window.
- MQTT ingest berhenti.
- Telemetry terbaru tidak muncul untuk perangkat pilot.
- Error rate melewati threshold yang disetujui.
- Migration menyebabkan data corrupt.

## Exit Criteria Fase 10

- `Production Release Gate` lulus.
- Release approval eksplisit terekam.
- Production deploy selesai melalui runbook yang disetujui.
- `npm run smoke:production` lulus.
- Hypercare berjalan dengan owner aktif.
- Incident/rollback window ditutup tanpa blocker Critical/High.

## Open Blockers

- Hasil staging deploy dan pilot UAT perlu dilampirkan sebagai evidence final.
- MySQL TLS/Hostinger decision masih harus ditutup sebelum DB production dipakai.
- MQTT production TLS dan per-device ACL harus dibuktikan.
- DNS production change window harus disetujui.
- Production deploy workflow belum dibuat dan tidak boleh dibuat/dijalankan tanpa release approval eksplisit.
