# 29 - System Architecture Note

Status: Phase 1 documentation baseline  
Owner: System Architecture + DevOps  
Last updated: 2026-08-05

## Purpose

PAMILO Smart Farming GIS is a multi-tenant smart farming platform for farmers, farms, plots, devices, telemetry, weather, and agronomy guidance. The architecture must support one farmer owning many ESP32 sensor nodes, strict tenant isolation, lightweight continuous MQTT ingestion, and a GIS-first web UI.

This note describes the target system shape and calls out where the repository currently uses local or draft implementations.

## Architectural Principles

- Tenant-owned operations always require `TenantContext`.
- Browser code never receives MQTT, Redis, VictoriaMetrics, or MySQL credentials.
- ESP32 devices communicate only with MQTT topics assigned to their tenant and device.
- API reads and writes are scoped by tenant and role before object IDs are trusted.
- Production MQTT uses TLS on `mqtt.keycloud.id:8883` and per-device ACLs.
- Production database access is blocked until the Hostinger MySQL TLS/remote-access decision is formally closed.
- Agronomy thresholds are never universal. They must be crop, stage, unit, method, and source specific.
- OSM tiles must show attribution, must not be bulk-downloaded, and should be replaceable by configuration.

## Runtime Topology

```text
ESP32 nodes
  |
  | mqtts, QoS 1, per-device username/password, topic ACL
  v
mqtt.keycloud.id:8883
  |
  v
EMQX broker on VPS 43.157.203.226
  |
  | internal MQTT subscription
  v
mqtt-ingestor worker
  |
  | validate topic/body/tenant/device/seq/payload/metric catalog
  v
Telemetry write path
  |-- Redis: latest readings, deduplication, ingest stream
  |-- VictoriaMetrics: numeric time-series history
  |-- Hostinger MySQL: tenant, farms, plots, devices, metric catalog, audit metadata

Browser
  |
  | HTTPS only
  v
sedayafarm.keycloud.id
  |
  v
Nginx reverse proxy
  |-- Vue/Vite frontend static assets
  |-- Fastify API
       |-- Hostinger MySQL metadata
       |-- Redis latest telemetry/cache
       |-- VictoriaMetrics history query
       |-- BMKG weather cache
```

## Container Topology

The target VPS deployment uses a single Docker Compose project with explicit public and private boundaries.

| Service | Public exposure | Internal dependencies | Responsibility |
| --- | --- | --- | --- |
| `nginx` or equivalent reverse proxy | `80`, `443` | `web`, `api` | HTTPS termination for `sedayafarm.keycloud.id`, static file serving or proxying, API proxy. |
| `web` | Not directly public | `api` via reverse proxy | Vue 3 GIS frontend. Browser sees only HTTPS API URLs. |
| `api` | Via reverse proxy only | MySQL, Redis, VictoriaMetrics | Fastify modular monolith, auth, tenant isolation, GIS, devices, telemetry query, weather, agronomy. |
| `mqtt-ingestor` | Not public | EMQX, Redis, VictoriaMetrics, MySQL metadata | Subscribes to MQTT, validates payloads, writes latest/history, updates device status. |
| `emqx` | `8883` for MQTTS; dashboard private/admin only | persistent EMQX data/log volumes | MQTT broker for ESP32 nodes and internal ingestion. |
| `redis` | Not public | volume-backed or managed persistence | Deduplication, latest telemetry, weather cache, small queues. |
| `victoriametrics` | Not public | persistent data volume | Lightweight time-series store for numeric telemetry history. |
| `mysql` | External Hostinger service | N/A | Durable relational metadata. Access must be allowlisted and approved before production use. |

The current local `compose.yaml` is a development skeleton using Mosquitto, Redis, VictoriaMetrics, API, worker, and web. EMQX production Compose generation remains a Phase 2 implementation task.

## Data Flow

### 1. Device Provisioning

1. Farmer owner or platform admin creates a farm and plot.
2. Farmer owner provisions an ESP32 device under a plot.
3. API creates a device record, one-time MQTT credential, client ID, and allowed topic list.
4. Operator flashes or configures the ESP32 with broker host, port, client ID, username, password, and topic names.
5. MQTT ACLs are applied in EMQX so the device can publish only to its own telemetry/status/events/acks topics and subscribe only to its own commands topic.

### 2. Telemetry Ingestion

1. ESP32 publishes JSON telemetry to:

   ```text
   pamilo/v1/tenants/{tenant_id}/devices/{device_id}/telemetry
   ```

2. EMQX authenticates the client, enforces ACLs, and accepts the publish.
3. `mqtt-ingestor` receives the message through an internal service subscription.
4. Ingestor validates:
   - topic shape,
   - tenant and device ownership,
   - body `device_id` matches topic `device_id`,
   - JSON schema,
   - timestamp and sequence monotonicity,
   - metric key safety,
   - payload size and metric count limits.
5. Ingestor normalizes readings into a metric catalog plus reading records.
6. Redis stores idempotency keys and latest values.
7. VictoriaMetrics stores numeric history.
8. MySQL stores tenant metadata, device status, audit trail, and metric catalog metadata.
9. API serves latest and historical telemetry only after authenticating the user and checking tenant ownership of the requested plot.

### 3. Dynamic MQTT Metric Discovery

The existing repository supports the first canonical telemetry contract with known metric keys: soil temperature, soil moisture, N, P, K, EC, and VWC. The product target adds a dynamic metric catalog so ESP32 nodes can introduce new variables without frontend code changes.

Target behavior:

- Payloads may include `metrics` entries in addition to the canonical `m` block.
- Every metric gets a tenant-scoped catalog row keyed by `tenant_id`, `device_id`, `node_id`, and `metric_key`.
- Charts and dashboard cards are generated from active metric catalog rows.
- Unknown metrics are accepted only if the metric key, type, unit, label, and payload size pass validation.
- Alerts and agronomy interpretation require reviewed threshold metadata; they are not generated from raw unknown metrics automatically.

### 4. GIS and Plot Boundaries

1. Farmer draws a GeoJSON polygon on a Leaflet map.
2. Browser submits GeoJSON to the API.
3. API validates geometry, rejects self-intersection, computes area, centroid, and bounding box on the backend.
4. API stores geometry in MySQL with tenant and farm ownership.
5. UI uses returned area and centroid, not a browser-only calculation, as the durable source of truth.

### 5. BMKG Weather

1. Each plot stores an `adm4_code` when the administrative mapping is verified.
2. Weather worker fetches BMKG forecast per unique ADM4 code, not per user or plot.
3. Forecasts are cached with stale-while-revalidate.
4. API serves normalized BMKG snapshots for a plot after tenant authorization.
5. UI displays BMKG attribution and stale/missing status.

BMKG public forecast data is 3 days, 3-hourly, updated twice daily, rate-limited to 60 requests per minute per IP, and requires BMKG attribution.

## Tenant Isolation Model

Tenant isolation is enforced in layers:

| Layer | Control |
| --- | --- |
| Authentication | Session identifies user and active tenant. |
| Authorization | Role permissions gate route actions. |
| Repository access | Tenant-owned query methods require `TenantContext`. |
| Data model | Tenant ID is stored on tenant-owned rows and indexed with object IDs. |
| MQTT | Topic includes tenant and device ID; ACL prevents cross-tenant publish/subscribe. |
| Telemetry labels | Redis keys and VictoriaMetrics labels include tenant and plot IDs. |
| UI | Tenant switch reloads server-authorized data; UI never filters as the primary security control. |

## Deployment Boundaries

Allowed in Phase 1:

- Documentation.
- Local checks.
- Read-only workflow descriptions.
- Script/workflow design without embedding credentials.

Blocked until explicit approval:

- Production deployment from this repository.
- DNS mutation.
- Production MQTT connection from local tests.
- Production MySQL connection from local tests.
- Remote MySQL production access before the TLS/Hostinger decision is closed.

## References Verified

- BMKG forecast API: https://data.bmkg.go.id/prakiraan-cuaca/
- OSM tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- EMQX Docker deployment notes: https://docs.emqx.com/en/emqx/latest/deploy/install-docker.html
- EMQX TLS listener notes: https://docs.emqx.com/en/emqx/latest/network/emqx-mqtt-tls.html

