# 32 - Maintenance Guide

Status: Phase 1 documentation baseline  
Owner: DevOps + IT Infra + Security  
Last updated: 2026-08-05

## Scope

Guide ini menjelaskan rutinitas maintenance untuk PAMILO Smart Farming GIS: log rotation, backup, Docker cleanup, BMKG quota management, CI/CD, secret handling, dan readiness checks.

Jangan menjalankan perintah yang menyentuh production MQTT atau production MySQL tanpa approval yang sesuai.

## Daily Checks

Runbook harian:

1. Periksa API readiness.
2. Periksa EMQX broker health.
3. Periksa jumlah device offline lebih dari ambang operasional.
4. Periksa Docker disk usage.
5. Periksa Redis memory dan connection count.
6. Periksa VictoriaMetrics ingest error.
7. Periksa BMKG cache stale/missing.
8. Periksa GitHub Actions CI status.

Contoh command di VPS:

```text
docker compose ps
docker system df
docker logs --tail 100 pamilo-api
docker logs --tail 100 pamilo-mqtt-ingestor
```

Gunakan nama container yang sesuai dengan Compose production/staging.

## Log Rotation

### Docker JSON Logs

Set Docker daemon log rotation di VPS:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

Setelah mengubah Docker daemon config, restart Docker sesuai change window.

### Service Logs

| Service | Retention awal | Catatan |
| --- | --- | --- |
| `api` | 14-30 hari | Redact secrets and one-time MQTT passwords. |
| `mqtt-ingestor` | 14-30 hari | Invalid payload logs harus teredaksi. |
| `emqx` | 14-30 hari | Simpan disconnect reason dan auth failures. |
| `nginx` | 14-30 hari | Jangan log cookie/session body. |
| `redis` | 7-14 hari | Internal only. |
| `victoriametrics` | 14-30 hari | Monitor import failures. |

Nginx dan EMQX dapat memakai logrotate host jika log dipasang ke volume host. Pastikan rotate tidak menghapus log aktif tanpa reload.

## Safe Docker Cleanup

Tujuan cleanup adalah mencegah disk penuh tanpa menghapus volume penting.

Read-only inspection:

```text
docker system df
docker image ls
docker container ls -a
docker volume ls
```

Cleanup aman awal:

```text
docker image prune -f
docker builder prune -f --filter until=168h
docker container prune -f
```

Jangan menjalankan perintah berikut tanpa backup dan approval:

```text
docker system prune --volumes
docker volume prune
```

Volume Redis, VictoriaMetrics, EMQX, dan Nginx certificates adalah data operasional.

## Backup Strategy

### Hostinger MySQL

Status: production DB access remains blocked until the Hostinger TLS/remote-access decision is closed.

Target backup once approved:

1. Allowlist VPS public IP in Hostinger Remote MySQL.
2. Use least-privilege MySQL user for backup.
3. Prefer TLS if Hostinger plan and client support are confirmed.
4. Run scheduled logical backup.
5. Encrypt backup artifact before offsite storage.
6. Test restore to non-production database.

Backup cadence:

| Data | Cadence | Retention |
| --- | --- | --- |
| Metadata MySQL | Daily | 7 daily, 4 weekly, 6 monthly |
| Audit logs | Daily | Match compliance requirement |
| Agronomy master data | On change and daily | Keep versioned exports |

Do not put database passwords in command history. Use protected env files or secret managers.

### Redis

Redis contains latest telemetry, deduplication keys, lightweight streams, and cache data. It is semi-durable operational state.

Recommended:

- Enable append-only file if persistence matters.
- Snapshot Redis volume before risky deploys.
- Do not rely on Redis as the only durable history.

### VictoriaMetrics

VictoriaMetrics is the durable numeric telemetry history store.

Recommended:

- Keep a named Docker volume for data.
- Snapshot the volume during low-ingest windows.
- Record retention period and disk growth.
- Verify sample restore in staging.

### EMQX

Back up:

- EMQX data directory,
- EMQX config,
- ACL/auth data source or exported user database,
- TLS certificate references.

Use a stable EMQX node name. Changing node names can affect persisted broker data.

### Nginx and TLS

Back up:

- Nginx site config,
- Certbot config and renewal state,
- deployment scripts,
- domain readiness evidence.

Never commit private certificate keys.

## BMKG API Quota Management

BMKG public forecast behavior verified for this project:

- data covers 3 days,
- data is per 3 hours,
- data is updated twice daily,
- limit is 60 requests per minute per IP,
- BMKG attribution is required.

Operational policy:

- Fetch by unique active ADM4, not by plot, farm, tenant, or page view.
- Cache default: 6 hours with stale-while-revalidate.
- Add jitter so many ADM4 refreshes do not fire at once.
- Keep worker below 20 requests per minute by default.
- Circuit-break after repeated failures and serve stale data.
- Dashboard must show `fresh`, `stale`, or `missing`.
- Browser must not call BMKG directly.

## CI/CD Workflow Explanation

| Workflow | File | Trigger | Purpose |
| --- | --- | --- | --- |
| CI | `.github/workflows/ci.yml` | Push/PR | Runs secret scan, lint, typecheck, tests, build. |
| VPS Connectivity | `.github/workflows/vps-connectivity.yml` | Manual | Read-only SSH check using configured VPS variables/secrets. |
| Staging Deploy | `.github/workflows/staging-deploy.yml` | Manual | Builds images, uploads staging config, runs staging smoke. |
| Deploy PAMILO Stack | `.github/workflows/deploy.yml` | Manual with approval reference | Builds images, uploads production bundle, runs VPS cleanup, deploys Compose stack. |
| Public VPS Simulation | `.github/workflows/public-vps-simulation.yml` | Manual | Simulates public VPS readiness without production cutover. |
| Domain TLS Readiness | `.github/workflows/domain-tls-readiness.yml` | Manual | Validates domain/TLS readiness evidence. |
| VPS Domain SSL Install | `.github/workflows/vps-domain-ssl.yml` | Manual | Installs Nginx/Certbot reverse proxy after operator approval. |
| Production Release Gate | `.github/workflows/production-release-gate.yml` | Manual | Preflight gate before any production release action. |

Local CI command:

```text
npm run ci
```

The repository secret scan is:

```text
npm run secret:scan
```

## Secret Handling

Rules:

- Real credentials never go into git.
- Repository variables may hold non-sensitive values like host, port, username, deploy path.
- Repository secrets should hold passwords, known_hosts, tokens, database password, MQTT service password.
- Mask sensitive values in GitHub Actions before any shell command can print them.
- Avoid `set -x` in secret-bearing jobs.
- Rotate leaked passwords immediately.

Expected GitHub configuration for VPS workflows:

| Name | Type | Sensitive |
| --- | --- | --- |
| `VPS_HOST` | variable | No |
| `VPS_PORT` | variable | No |
| `VPS_USERNAME` | variable | Usually no, but avoid logging unnecessarily |
| `VPS_PASSWORD` | secret | Yes |
| `VPS_KNOWN_HOSTS` | secret | Integrity-sensitive |

## Deployment Maintenance

Before deploy:

1. Ensure CI is green.
2. Run secret scan.
3. Confirm release approval if production.
4. Confirm backup status.
5. Confirm rollback path.
6. Confirm Docker disk has enough space.
7. Confirm `EMQX_MQTT_TLS_CERT_PEM`, `EMQX_MQTT_TLS_KEY_PEM`, `EMQX_DASHBOARD_PASSWORD`, and `MQTT_SERVICE_PASSWORD` exist as GitHub secrets before running `.github/workflows/deploy.yml`.

Manual VPS cleanup dry-run:

```text
PAMILO_CLEANUP_DRY_RUN=true bash scripts/vps-cleanup.sh
```

Production workflow cleanup runs `scripts/vps-cleanup.sh` before `docker compose up -d`. By default it prunes stopped containers, dangling images, and old build cache. It removes legacy Compose projects or paths only when the workflow operator explicitly provides `legacy_projects` or `legacy_paths`.

After deploy:

1. Check `docker compose ps`.
2. Check `/health/live`.
3. Check `/health/ready`.
4. Check API logs.
5. Check EMQX client count.
6. Check telemetry ingestion with a non-production simulator.
7. Check BMKG weather cache status.
8. Record evidence.

## References Verified

- BMKG forecast API: https://data.bmkg.go.id/prakiraan-cuaca/
- Hostinger Remote MySQL access: https://www.hostinger.com/support/1583546-how-to-set-up-remote-mysql-access-in-hostinger/
- EMQX Docker deployment notes: https://docs.emqx.com/en/emqx/latest/deploy/install-docker.html
