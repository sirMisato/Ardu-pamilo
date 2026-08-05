# 30 - Complete Technical Document

Status: Phase 1 documentation baseline  
Owner: Backend + Frontend + DevOps + Security  
Last updated: 2026-08-05

## Scope

This document defines the technical contracts for PAMILO Smart Farming GIS: schema model, API endpoints, MQTT topics, dynamic metric ingestion, security invariants, and deployment integration points.

Implementation status:

- Current repo: local modular monolith, in-memory metadata repositories, first database migration for auth/tenancy, static canonical MQTT metrics, Redis/Victoria telemetry adapter, BMKG weather contract.
- Target system: Hostinger MySQL metadata persistence, EMQX production broker, dynamic telemetry metric catalog, Leaflet polygon editor, production reverse proxy and TLS.

## Core Data Model

### Identity and Tenancy

| Table | Key fields | Notes |
| --- | --- | --- |
| `tenants` | `id`, `name`, `status` | Farmer account boundary. |
| `users` | `id`, `email`, `password_hash`, `mfa_state`, `status` | User identity can belong to multiple tenants. |
| `tenant_users` | `tenant_id`, `user_id`, `role` | Role can be `platform_admin`, `farmer_owner`, or `farmer_operator`. |
| `sessions` | `id`, `user_id`, `active_tenant_id`, `csrf_token_hash`, `expires_at` | Target durable or signed session model. Browser receives secure cookie and CSRF token. |
| `audit_logs` | `tenant_id`, `actor_user_id`, `action`, `object_type`, `object_id`, `metadata_json` | Required for tenant and device provisioning events. |

The initial SQL migration in `infra/db/migrations/0001_auth_tenancy.sql` covers `tenants`, `users`, `tenant_users`, and `audit_logs`.

### GIS Metadata

| Table | Key fields | Notes |
| --- | --- | --- |
| `farms` | `id`, `tenant_id`, `name`, `timezone` | Farm belongs to one tenant. |
| `plots` | `id`, `tenant_id`, `farm_id`, `name`, `geometry_geojson`, `area_m2`, `area_ha`, `centroid_lat`, `centroid_lng`, `bbox_json`, `adm4_code`, `mapping_status` | Backend computes area, centroid, and bounding box. |
| `plot_adm4_reviews` | `plot_id`, `adm4_code`, `status`, `reviewer_user_id`, `reviewed_at` | Optional review trail when ADM4 mapping is manual or uncertain. |

Geometry v1 accepts GeoJSON `Polygon` in SRID 4326. `MultiPolygon` is a candidate extension and must be decided before production migration.

### Device and MQTT Metadata

| Table | Key fields | Notes |
| --- | --- | --- |
| `devices` | `id`, `tenant_id`, `plot_id`, `serial_no`, `label`, `client_id`, `mqtt_username`, `credential_ref`, `credential_fingerprint`, `status`, `last_seen_at`, `revoked_at` | `serial_no` is unique within tenant. |
| `device_credentials` | `credential_ref`, `device_id`, `password_hash`, `created_at`, `rotated_at`, `revoked_at` | Plain password is shown once only. |
| `mqtt_acl_rules` | `device_id`, `topic`, `access`, `applied_at`, `status` | EMQX or generated ACL source of truth. |

Device provisioning response must use `Cache-Control: no-store`.

### Dynamic Telemetry Metadata

| Table | Key fields | Notes |
| --- | --- | --- |
| `telemetry_metric_catalog` | `id`, `tenant_id`, `device_id`, `node_id`, `metric_key`, `label`, `unit`, `value_type`, `source`, `first_seen_at`, `last_seen_at`, `status` | Drives automatic dashboard cards and chart selection. |
| `telemetry_metric_aliases` | `tenant_id`, `metric_key`, `canonical_metric`, `unit`, `calibration_profile`, `status` | Maps dynamic variables to agronomy-aware canonical metrics when reviewed. |
| `telemetry_dead_letters` | `tenant_id`, `device_id`, `topic`, `reason`, `redacted_payload_json`, `created_at` | Stores invalid payload evidence without secrets. |

Latest values live in Redis. Numeric history lives in VictoriaMetrics. MySQL stores catalog and audit metadata.

### Weather Metadata

| Table | Key fields | Notes |
| --- | --- | --- |
| `weather_adm4_cache` | `adm4_code`, `source`, `analysis_date`, `fetched_at`, `stale_after`, `snapshot_json`, `cache_status` | Cache per ADM4, not per tenant. |
| `weather_fetch_runs` | `id`, `adm4_code`, `status`, `http_status`, `duration_ms`, `error_code`, `created_at` | Quota and troubleshooting evidence. |

### Agronomy Master Data

| Table | Key fields | Notes |
| --- | --- | --- |
| `crops` | `code`, `name_id`, `name_en`, `status` | Initial crops: `padi`, `jagung`, `bawang_merah`, `cabai`, `sawit`. |
| `crop_varieties` | `id`, `crop_code`, `name`, `source_url`, `source_org`, `status`, `reviewer`, `version` | Varieties require source provenance. |
| `agronomy_thresholds` | `crop_code`, `variety_id`, `growth_stage`, `metric`, `unit`, `method`, `soil_context`, `lower_bound`, `upper_bound`, `severity`, `duration_minutes`, `hysteresis`, `source_url`, `reviewer`, `version`, `status` | No universal thresholds. |

Thresholds can be `draft`, `reviewed`, `verified`, or `suspended`. Only `verified` thresholds may drive farmer-facing alerts.

### Phase 1 Agronomy Threshold Starter Pack

The Phase 1 starter pack defines sourced pH thresholds for the five initial crops. These records are suitable for master data planning and UI review workflows, but should enter production with `status: reviewed` or `verified` only after agronomy review, calibration method confirmation, and local soil context validation.

Do not use these rows as universal NPK or fertilizer recommendations. Soil N, P, and K interpretation depends on lab method, sensor calibration, soil texture, crop stage, and local recommendation system.

| Crop code | Crop | Metric | Unit | Draft ideal band | Method | Growth stage | Status | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `padi` | Padi | `soil_ph` | `ph` | `5.5-7.5` | Soil pH H2O or calibrated field pH meter | Initial all-stage screening | `draft` | Kementerian Pertanian rice cultivation guide |
| `jagung` | Jagung | `soil_ph` | `ph` | `5.5-7.0`; note optimum `6.8` during flowering/grain filling | Soil pH H2O or calibrated field pH meter | Initial all-stage screening, with note for generative stage | `draft` | BBPP Lembang corn cultivation note |
| `bawang_merah` | Bawang Merah | `soil_ph` | `ph` | `5.6-6.5` | Soil pH H2O or calibrated field pH meter | Pre-plant and active crop screening | `draft` | Dinas Pertanian Buleleng field pH note |
| `cabai` | Cabai | `soil_ph` | `ph` | `6.0-6.8` | Soil pH H2O or calibrated field pH meter | Initial all-stage screening | `draft` | Pepper/capsicum crop nutrition guide |
| `sawit` | Kelapa Sawit | `soil_ph` | `ph` | `4.5-6.0` | Soil pH H2O or calibrated field pH meter | Nursery and mature palm screening | `draft` | FAO EcoCrop oil palm data sheet |

Recommended threshold record shape:

```json
{
  "crop": "padi",
  "variety": null,
  "growth_stage": "initial_all_stage_screening",
  "metric": "soil_ph",
  "unit": "ph",
  "method": "soil_ph_h2o_or_calibrated_field_meter",
  "soil_context": "topsoil; local lab confirmation required before production alerting",
  "lower_bound": 5.5,
  "upper_bound": 7.5,
  "severity": "warning",
  "duration_minutes": 1440,
  "hysteresis": 0.2,
  "source_url": "https://repository.pertanian.go.id/bitstream/123456789/12986/1/Teknologi%20Budidaya%20Padi.pdf",
  "reviewer": "agronomy-review-required",
  "version": "phase1-2026-08",
  "status": "draft"
}
```

NPK handling in Phase 1:

| Metric | Storage behavior | Alert behavior |
| --- | --- | --- |
| `nitrogen` | Store and chart if payload is valid numeric `mg_kg`. | No ideal band until crop, stage, lab/sensor method, calibration profile, soil context, and source are reviewed. |
| `phosphorus` | Store and chart if payload is valid numeric `mg_kg`. | No ideal band until crop, stage, lab/sensor method, calibration profile, soil context, and source are reviewed. |
| `potassium` | Store and chart if payload is valid numeric `mg_kg`. | No ideal band until crop, stage, lab/sensor method, calibration profile, soil context, and source are reviewed. |
| `electrical_conductivity` | Store and chart if payload is valid numeric. | Crop-specific salinity/EC alert thresholds require source and method review. |
| `soil_moisture` / `volumetric_water_content` | Store and chart if payload is valid numeric. | Alert thresholds require sensor-specific calibration and crop/stage/root-zone context. |

## API Contract

### Response Envelope

```json
{
  "data": {},
  "meta": {
    "request_id": "01JEXAMPLE",
    "generated_at": "2026-08-05T00:00:00Z"
  },
  "error": null
}
```

Error envelope:

```json
{
  "data": null,
  "meta": {
    "request_id": "01JEXAMPLE",
    "generated_at": "2026-08-05T00:00:00Z"
  },
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request is invalid.",
    "fields": [
      {
        "path": "geometry",
        "message": "Polygon is self-intersecting."
      }
    ]
  }
}
```

### Implemented or Planned Endpoints

| Method | Path | Status | Auth | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/health/live` | Current | Public | API process health. |
| `GET` | `/health/ready` | Current | Public | Runtime dependency readiness summary. |
| `POST` | `/api/v1/auth/login` | Current | Public | Create authenticated session and active tenant context. |
| `POST` | `/api/v1/auth/logout` | Current | Session + CSRF | End session. |
| `GET` | `/api/v1/me` | Current | Session | Current user, active tenant, available tenants, CSRF token. |
| `GET` | `/api/v1/farms` | Current | `farm:read` | List farms for active tenant. |
| `POST` | `/api/v1/farms` | Current | `farm:write` + CSRF | Create farm for active tenant. |
| `GET` | `/api/v1/farms/{farmId}/plots` | Current | `plot:read` | List plots after farm tenant ownership check. |
| `POST` | `/api/v1/farms/{farmId}/plots` | Current | `plot:write` + CSRF | Create plot and compute geometry summary. |
| `GET` | `/api/v1/plots/{plotId}` | Current | `plot:read` | Read a tenant-owned plot. |
| `PATCH` | `/api/v1/plots/{plotId}/geometry` | Current | `plot:write` + CSRF | Update polygon geometry. |
| `GET` | `/api/v1/plots/{plotId}/devices` | Current | `device:read` | List devices attached to plot. |
| `POST` | `/api/v1/plots/{plotId}/devices` | Current | `device:provision` + CSRF | Provision device and show credential once. |
| `POST` | `/api/v1/devices/{deviceId}/revoke` | Current | `device:provision` + CSRF | Revoke device. |
| `GET` | `/api/v1/plots/{plotId}/telemetry/latest` | Current | `plot:read` | Latest readings for plot. |
| `GET` | `/api/v1/plots/{plotId}/telemetry/history` | Current | `plot:read` | History for one metric. Requires `metric`, `from`, `to`, `resolution`. |
| `GET` | `/api/v1/plots/{plotId}/weather` | Current | `plot:read` | BMKG-normalized weather snapshot. |
| `GET` | `/api/v1/plots/{plotId}/metrics` | Target | `plot:read` | Dynamic metric catalog for auto-generated charts. |
| `GET` | `/api/v1/agronomy/crops` | Target | Session | Crop and variety master data. |
| `GET` | `/api/v1/agronomy/thresholds` | Target | Session | Reviewed/verified threshold catalog. |
| `POST` | `/api/v1/admin/agronomy/thresholds` | Target | `platform:admin` + CSRF | Create reviewed threshold records. |

### Telemetry History Query

```text
GET /api/v1/plots/{plotId}/telemetry/history?metric=soil_temperature&from=2026-08-05T00:00:00Z&to=2026-08-05T06:00:00Z&resolution=15m
```

Rules:

- `metric`, `from`, `to`, and `resolution` are required.
- Supported current resolutions: `raw`, `5m`, `15m`, `1h`.
- API must bound maximum range and point count.
- Query must first prove plot ownership by active tenant.

## MQTT Contract

### Broker

Production endpoint:

```text
mqtts://mqtt.keycloud.id:8883
```

Plain MQTT port `1883` is allowed only inside private Docker networks for local development or controlled internal testing.

### Topics

```text
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/telemetry
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/status
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/events
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/commands
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/acks
```

Topic IDs must match this safe identifier pattern:

```text
^[A-Za-z0-9._:-]+$
```

### ACL Matrix

| Actor | Publish | Subscribe |
| --- | --- | --- |
| ESP32 | Own `telemetry`, `status`, `events`, `acks` | Own `commands` |
| Ingestor | None required for telemetry | Tenant/device telemetry and status via service credential |
| Command service | Authorized device `commands` | Device `acks` as needed |
| Browser | None | None |

### Current Canonical Payload

```json
{
  "v": 1,
  "device_id": "01JDEVICE",
  "node_id": "soil-01",
  "ts": "2026-08-05T00:00:00Z",
  "seq": 84513,
  "rssi": -67,
  "battery_v": 12.4,
  "m": {
    "st": 27.4,
    "sm": 43.1,
    "n": 36,
    "p": 18,
    "k": 112,
    "ec": 1.24,
    "vwc": 31.6
  },
  "q": {
    "calibration_profile": "soil-v1",
    "flags": []
  }
}
```

Canonical mapping:

| Payload key | Metric | Unit |
| --- | --- | --- |
| `st` | `soil_temperature` | `deg_c` |
| `sm` | `soil_moisture` | `percent_relative` |
| `n` | `nitrogen` | `mg_kg` |
| `p` | `phosphorus` | `mg_kg` |
| `k` | `potassium` | `mg_kg` |
| `ec` | `electrical_conductivity` | `ms_cm` |
| `vwc` | `volumetric_water_content` | `percent_v_v` |

### Target Dynamic Payload Extension

Dynamic payloads preserve the current envelope and add `metrics`.

```json
{
  "v": 1,
  "device_id": "01JDEVICE",
  "node_id": "soil-01",
  "ts": "2026-08-05T00:00:00Z",
  "seq": 84514,
  "rssi": -66,
  "battery_v": 12.3,
  "metrics": {
    "soil_ph": {
      "value": 6.4,
      "unit": "ph",
      "label": "Soil pH",
      "type": "number"
    },
    "leaf_wetness": {
      "value": true,
      "unit": "boolean",
      "label": "Leaf Wetness",
      "type": "boolean"
    }
  },
  "q": {
    "calibration_profile": "soil-v2",
    "flags": []
  }
}
```

Dynamic metric rules:

- Metric keys use `^[a-z][a-z0-9_]{1,63}$`.
- Payload size limit is enforced by API/worker configuration.
- Maximum metrics per publish is enforced to protect the broker and storage.
- `type` is one of `number`, `boolean`, or `string`.
- Numeric metrics can be written to VictoriaMetrics.
- Boolean and string metrics are kept in latest state and catalog history unless a specific storage mapping is approved.
- `null` means missing or invalid channel, never a numeric zero.
- Quality flags must explain sensor failures.
- Unknown metrics create or update catalog rows with `status: discovered`.
- Farmer-facing alerting requires an approved alias or threshold record.

## BMKG Contract

API fetch target:

```text
GET https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode_wilayah_tingkat_iv}
```

Rules:

- Backend or worker fetches BMKG, never the browser.
- Fetch per unique active `adm4_code`.
- Cache default: 6 hours plus stale-while-revalidate.
- Throttle far below 60 requests per minute per IP.
- Timeout, retry with jitter, circuit breaker, schema validation, and stale fallback are required.
- UI must display `BMKG` attribution.
- Plot with missing ADM4 returns `cache_status: missing` and an empty forecast array.

## Security Invariants

| Invariant | Required control |
| --- | --- |
| Tenant isolation | Every tenant-owned repository method takes `TenantContext`; route checks ownership before returning data. |
| Browser secrets | Browser receives only session cookies, CSRF token, public API responses, and one-time device credentials during provisioning. |
| MQTT isolation | Per-device auth and ACL; no browser MQTT access. |
| Production MQTT | TLS on `8883`, SNI/certificate validation, per-device ACLs, revoked device denial. |
| Production MySQL | No access added until Hostinger TLS/remote-access decision closes. |
| CSRF | Mutating web requests require session and `x-csrf-token`. |
| Logs | Secrets are redacted; one-time passwords are never logged. |
| Agronomy | Thresholds require source URL, reviewer, version, method, and crop-specific context. |
| CI/CD | Secret scan, lint, typecheck, test, build. Deploy workflows are manual and gated. |

## Environment Variables

Use repository secrets or VPS `.env` files managed outside git for sensitive values.

| Variable | Sensitive | Purpose |
| --- | --- | --- |
| `API_TRUSTED_ORIGINS` | No | Allowed web origins for CORS/CSRF. |
| `SESSION_COOKIE_SECRET` | Yes | Session signing/encryption when implemented. |
| `MYSQL_HOST` | No | Hostinger MySQL host after approval. |
| `MYSQL_PORT` | No | Usually `3306`. |
| `MYSQL_DATABASE` | No | Metadata DB name. |
| `MYSQL_USER` | Maybe | Treat as sensitive in shared logs. |
| `MYSQL_PASSWORD` | Yes | MySQL password. |
| `REDIS_URL` | Yes if password-bearing | Redis connection for latest/dedup/cache. |
| `VICTORIA_METRICS_URL` | No if internal-only | Internal VictoriaMetrics URL. |
| `MQTT_BROKER_URL` | No if no embedded password | Internal worker broker URL. |
| `MQTT_SERVICE_USERNAME` | Maybe | Worker MQTT username. |
| `MQTT_SERVICE_PASSWORD` | Yes | Worker MQTT password. |
| `BMKG_CACHE_TTL_SECONDS` | No | Weather cache TTL. |

Do not commit real `.env` files. Only `.env.example` style templates are allowed.

## References Verified

- BMKG forecast API: https://data.bmkg.go.id/prakiraan-cuaca/
- Hostinger Remote MySQL access: https://www.hostinger.com/support/1583546-how-to-set-up-remote-mysql-access-in-hostinger/
- EMQX Docker deployment notes: https://docs.emqx.com/en/emqx/latest/deploy/install-docker.html
- EMQX TLS listener notes: https://docs.emqx.com/en/emqx/latest/network/emqx-mqtt-tls.html
- Kementerian Pertanian rice cultivation guide: https://repository.pertanian.go.id/bitstream/123456789/12986/1/Teknologi%20Budidaya%20Padi.pdf
- BBPP Lembang corn cultivation note: https://bbpplembang.bppsdmp.pertanian.go.id/publikasi-detail/1149
- Dinas Pertanian Buleleng shallot pH note: https://distankan.bulelengkab.go.id/informasi/detail/berita/60_pengukuran-ph-tanah-persiapan-tanam-bawang-merah
- Pepper/capsicum crop nutrition guide: https://icl-growingsolutions.com/agriculture/crops/pepper/
- FAO EcoCrop oil palm data sheet: https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=972
