# 04 - Backend Workplan

Status: Draft Fase 0  
Pemilik: Backend Lead

## Misi Backend

Membangun API modular monolith yang menjadi satu-satunya gerbang data untuk frontend. Backend bertanggung jawab atas auth, tenant isolation, domain logic, validasi, audit, REST, SSE, dan adapter data ke MySQL, Redis, VictoriaMetrics, serta worker.

## Stack

- Node.js LTS + TypeScript.
- Fastify.
- Kysely + mysql2 untuk MySQL Hostinger.
- JSON Schema dan OpenAPI.
- Redis client untuk cache/latest/SSE coordination.
- VictoriaMetrics HTTP API untuk telemetry history.
- Vitest untuk unit dan integration test.

## Modul

```text
apps/api/src/modules/
  auth/
  tenants/
  users/
  farms/
  plots/
  devices/
  sensor-nodes/
  telemetry/
  weather/
  crops/
  varieties/
  planting-cycles/
  thresholds/
  alerts/
  audit/
  health/
```

## Backend Invariants

- Semua query tenant-owned wajib menerima `TenantContext`.
- `tenant_id` dari request body/query harus ditolak atau diabaikan untuk resource tenant-owned.
- Repository tenant-owned tanpa context harus gagal saat test.
- Semua route mutasi memakai auth, role check, validation schema, audit event, dan CSRF protection bila auth memakai cookie.
- Error response tidak membocorkan stack trace, SQL, host internal, credential, atau keberadaan resource tenant lain.

## Endpoint MVP

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Login dan buat session |
| `POST` | `/api/v1/auth/logout` | Logout dan revoke session |
| `GET` | `/api/v1/me` | Profil, tenant aktif, role |
| `GET/POST` | `/api/v1/farms` | List/tambah farm |
| `GET/PATCH` | `/api/v1/farms/:farmId` | Detail/update farm |
| `GET/POST` | `/api/v1/farms/:farmId/plots` | List/tambah plot |
| `PATCH` | `/api/v1/plots/:plotId/geometry` | Update polygon |
| `GET/POST` | `/api/v1/plots/:plotId/devices` | List/provision device |
| `GET` | `/api/v1/plots/:plotId/telemetry/latest` | Latest telemetry |
| `GET` | `/api/v1/plots/:plotId/telemetry/history` | History telemetry |
| `GET` | `/api/v1/plots/:plotId/weather` | Forecast BMKG normal |
| `GET` | `/api/v1/stream` | SSE tenant-scoped |
| `GET` | `/health/live` | Liveness |
| `GET` | `/health/ready` | Readiness dependencies |

## Data Model Ringkas

| Table | Field inti |
| --- | --- |
| `tenants` | `id`, `name`, `status`, timestamps |
| `users` | `id`, `email`, `password_hash`, `mfa_state`, `status` |
| `tenant_users` | `tenant_id`, `user_id`, `role`, unique pair |
| `farms` | `id`, `tenant_id`, `name`, `timezone`, timestamps |
| `plots` | `id`, `tenant_id`, `farm_id`, `geometry_geojson`, `area_m2`, `area_ha`, `centroid_lat`, `centroid_lng`, `bbox`, `adm4_code` |
| `devices` | `id`, `tenant_id`, `plot_id`, `serial_no`, `client_id`, `credential_ref`, `status`, `last_seen_at` |
| `sensor_nodes` | `id`, `tenant_id`, `device_id`, `node_key`, `calibration_profile_id`, status |
| `sensor_channels` | `id`, `node_id`, `metric_code`, `source_unit`, `canonical_unit`, enabled |
| `audit_logs` | actor, tenant, action, object, request ID, redacted before/after, timestamp |

## API Response Envelope

```json
{
  "data": {},
  "meta": {
    "request_id": "01JEXAMPLE",
    "generated_at": "2026-08-02T05:00:00Z"
  },
  "error": null
}
```

## Deliverables per Fase

| Fase | Deliverable backend |
| --- | --- |
| 1 | API skeleton, env validation, OpenAPI baseline, DB migration tooling |
| 2 | Auth/session, tenant context, user/role, audit baseline. Status awal ada di `docs/16-phase-2-auth-tenancy.md` |
| 3 | Farm/plot metadata, GeoJSON validation, area calculation. Status awal ada di `docs/17-phase-3-gis-metadata.md` |
| 4 | Device provisioning API, MQTT credential lifecycle hooks |
| 5 | Latest/history telemetry API, SSE, rate limit |
| 6 | BMKG adapter, threshold versioning, alert API |
| 7 | Security hardening, negative tests, load improvements |
| 8 | Health/readiness, release migrations, staging smoke tests |

## Acceptance Criteria Backend

- Cross-tenant attempts return `403` or `404` without resource disclosure.
- All list endpoints paginated.
- History endpoint requires `from`, `to`, `metric`, and `resolution`.
- Geometry update rejects invalid GeoJSON and self-intersection.
- Device secret is shown only once during provisioning.
- Audit log exists for login, polygon update, provisioning, threshold change, export, and platform admin access.
