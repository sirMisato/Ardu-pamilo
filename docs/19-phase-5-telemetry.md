# 19 - Phase 5 Telemetry

Status: In Progress  
Pemilik: Backend + Frontend + DevOps + QA/QC  
Tanggal mulai: 2026-08-03

## Tujuan

Fase 5 membangun fondasi latest dan history telemetry dari payload ESP32 yang sudah tervalidasi. Implementasi awal tetap lokal dan testable memakai in-memory repository sampai Redis dan VictoriaMetrics adapter siap.

## Scope Implementasi Saat Ini

- Shared telemetry normalizer di `packages/shared/src/telemetry.ts`.
- Mapping payload ringkas ESP32 ke metric canonical:
  - `st` -> `soil_temperature`
  - `sm` -> `soil_moisture`
  - `n` -> `nitrogen`
  - `p` -> `phosphorus`
  - `k` -> `potassium`
  - `ec` -> `electrical_conductivity`
  - `vwc` -> `volumetric_water_content`
- Worker MQTT handler mengembalikan normalized readings setelah topic/payload valid.
- In-memory telemetry repository untuk latest dan history.
- Telemetry API:
  - `GET /api/v1/plots/:plotId/telemetry/latest`
  - `GET /api/v1/plots/:plotId/telemetry/history`
- History query membutuhkan:
  - `metric`
  - `from`
  - `to`
  - `resolution`
- Supported resolution awal:
  - `raw`
  - `5m`
  - `15m`
  - `1h`
- Frontend tenant dashboard menampilkan latest telemetry untuk plot aktif.
- `/health/ready` sekarang membedakan dependency lokal:
  - MySQL belum configured
  - Redis belum configured
  - telemetry memakai in-memory local adapter

## Security dan Tenancy

- Semua telemetry route membutuhkan session login.
- Telemetry read memakai permission `plot:read`.
- Plot wajib dicek dengan `TenantContext` sebelum telemetry dibaca.
- Cross-tenant latest/history access mengembalikan `404`.
- Browser tidak mengakses MQTT, Redis, atau VictoriaMetrics langsung.
- Payload internal boleh punya tenant/device, tetapi REST tetap dikontrol oleh plot tenant aktif.

## Explicit Non-Scope

- Belum ada Redis latest adapter.
- Belum ada VictoriaMetrics history adapter.
- Belum ada durable ingestion worker.
- Belum ada SSE `/api/v1/stream`.
- Belum ada rate limit query history.
- Belum ada downsampling/rollup nyata untuk `5m`, `15m`, dan `1h`; resolution masih divalidasi dan diecho.
- Belum ada dead-letter storage untuk payload invalid.

## QA Coverage Saat Ini

- Shared payload parser menerima null channel value.
- Shared parser menolak unknown metric field.
- Shared normalizer menghasilkan canonical metric/unit/quality flags.
- MQTT ingestor mengembalikan normalized readings untuk payload valid.
- Latest telemetry tenant aktif berhasil.
- Latest telemetry plot tenant lain mengembalikan `404`.
- History telemetry valid mengembalikan points berurutan.
- History query invalid mengembalikan `400 VALIDATION_FAILED`.
- Operator read-only dapat membaca telemetry.

## Acceptance Criteria Fase 5 Saat Ini

- `npm run ci` hijau.
- Tidak ada credential nyata di repo.
- Latest/history endpoint memakai envelope standar.
- Semua telemetry read tenant-scoped.
- Field metric dan unit canonical sesuai `docs/09-data-api-contracts.md`.
- Frontend menampilkan latest telemetry dari API untuk plot aktif.

## Open Before Phase 6

- Tambahkan adapter Redis untuk latest telemetry.
- Tambahkan adapter VictoriaMetrics untuk history.
- Tambahkan ingestion bridge dari MQTT worker ke storage adapter.
- Tambahkan SSE tenant-scoped dan fallback polling.
- Tambahkan rate limit dan batas rentang history query.
- Tambahkan simulator telemetry end-to-end dari MQTT sampai dashboard.
