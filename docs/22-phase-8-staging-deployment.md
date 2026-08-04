# 22 - Phase 8 Staging Deployment

Status: In Progress  
Pemilik: DevOps + IT Infra + Security + QA/QC  
Tanggal mulai: 2026-08-03

## Tujuan

Fase 8 menyiapkan deployment staging yang repeatable tanpa melakukan production release. Implementasi awal membuat image container, compose staging, workflow manual deploy ke VPS, dan smoke test otomatis.

## Scope Implementasi Saat Ini

- Dockerfile staging untuk:
  - API Fastify
  - Web Vue/Vite static via nginx
  - MQTT ingestor daemon
- `.dockerignore` mencegah `.env` lokal masuk Docker build context.
- `infra/staging/compose.staging.yaml` untuk staging stack.
- `infra/staging/staging.env.example` sebagai template env non-secret.
- `infra/staging/mosquitto.self-check.conf` untuk broker Mosquitto internal staging.
- `scripts/smoke-staging.mjs` untuk smoke test HTTP.
- `npm run smoke:staging` sebagai entrypoint smoke.
- GitHub Actions `Staging Deploy` manual:
  - build dan push image ke GHCR
  - upload compose/env ke VPS
  - bootstrap Docker/Compose di VPS staging bila belum tersedia
  - deploy via `docker compose pull` dan `up -d`
  - smoke test dari runner ke staging origin
- CI reguler menambah job build Docker image tanpa push.
- API staging memakai telemetry adapter `redis-victoria-hybrid`.
- MQTT ingestor staging berjalan sebagai daemon internal dan menulis latest/history ke Redis/VictoriaMetrics.
- Dashboard staging menampilkan runtime dependency, latest telemetry, dan history telemetry dari API.
- Mosquitto staging tetap internal-only dan diberi guardrail persistence, log stdout, packet size, client id, dan inflight message.

## Evidence Terkini

| Workflow | Run | Status |
| --- | --- | --- |
| `VPS Connectivity Check` | `30858475660` | Success |
| `Staging Deploy` | `30863883784` | Success |

## GitHub Configuration

Repository variables:

- `VPS_HOST`
- `VPS_PORT`
- `VPS_USERNAME`
- `STAGING_DEPLOY_PATH`, default workflow: `/opt/pamilo/staging`

Repository secret atau fallback variable:

- `VPS_PASSWORD`

Optional repository secret:

- `VPS_KNOWN_HOSTS`

Workflow input:

- `image_tag`: default current commit SHA pendek.
- `staging_web_port`: default `8080`.
- `staging_origin`: default `http://VPS_HOST:staging_web_port`.

## Security dan Tenancy

- Workflow deploy staging hanya `workflow_dispatch`; tidak auto-deploy saat push.
- Production deploy tetap non-scope.
- DNS tidak diubah oleh workflow.
- Workflow memakai username/password sesuai konfigurasi VPS yang tersedia.
- Password tidak ditulis ke file dan dimask oleh GitHub Actions.
- API container tidak publish port host langsung; akses publik awal lewat web/nginx service.
- Data services tidak publish port host.
- `API_TRUSTED_ORIGINS` wajib diisi ke origin staging.
- `VPS_KNOWN_HOSTS` tetap direkomendasikan untuk pin host key sebelum production workflow.

## Smoke Coverage Saat Ini

`scripts/smoke-staging.mjs` memeriksa:

- `/health/live` HTTP 200.
- Security headers baseline.
- `/health/ready` HTTP 200 dan dependency telemetry/weather.
- Login tenant A.
- Farm list tenant A.
- CSRF mutation dari trusted origin.
- Latest/history telemetry endpoint.
- Weather BMKG payload seeded/missing state.

## Rollback Awal

Rollback staging dilakukan dengan mengganti image tag di `staging.env`, lalu menjalankan:

```text
docker compose --env-file staging.env -f compose.staging.yaml pull
docker compose --env-file staging.env -f compose.staging.yaml up -d --remove-orphans
```

Bukti rollback minimal:

- Commit/image tag sebelum dan sesudah rollback.
- Output `docker compose ps`.
- Hasil `npm run smoke:staging` terhadap staging origin.

## Explicit Non-Scope

- Belum ada production deploy workflow.
- Belum ada DNS/TLS automation.
- Belum ada database production/Hostinger migration runner.
- Belum ada Redis/VictoriaMetrics persistent backup drill.
- Belum ada long-running MQTT ingestion daemon production dengan TLS/ACL production.
- Belum ada release approval environment protection.
- Belum ada rollback otomatis bila smoke gagal.

## Acceptance Criteria Fase 8 Saat Ini

- `npm run ci` hijau.
- Docker compose staging valid.
- Docker image build job tersedia di CI; hasil runner GitHub menjadi bukti build image.
- Workflow staging deploy tersedia manual.
- Smoke script bisa dijalankan terhadap URL staging.
- Dokumen deployment dan rollback tersedia.

## Open Before Phase 9

- Pin `VPS_KNOWN_HOSTS`.
- Putuskan host/domain staging dan TLS terminator.
- Tambahkan environment protection approval bila staging mulai dipakai tim QA.
- Tambahkan backup/restore rehearsal untuk Redis/VictoriaMetrics.
- Tambahkan replay worker untuk Redis Stream dan failure recovery VictoriaMetrics.
