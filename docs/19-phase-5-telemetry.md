# 19 - Phase 5 Telemetry

Status: In Progress  
Pemilik: Backend + Frontend + DevOps + QA/QC  
Tanggal mulai: 2026-08-03

## Tujuan

Fase 5 membangun fondasi latest dan history telemetry dari payload ESP32 yang sudah tervalidasi. Implementasi awal tetap lokal dan testable memakai in-memory repository, dengan adapter Redis/VictoriaMetrics opt-in untuk staging/hardening.

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
- Shared storage record serializer untuk Redis latest dan durable history writer.
- Redis latest adapter dan VictoriaMetrics history adapter opt-in melalui `TELEMETRY_STORAGE_ADAPTER`.
- MQTT ingestor daemon opt-in melalui `MQTT_INGESTOR_MODE=daemon`.
- Worker daemon subscribe topic telemetry, deduplicate dengan Redis TTL, menulis event ke Redis Stream, latest ke Redis hash, dan history non-null ke VictoriaMetrics.
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
- Frontend tenant dashboard menampilkan latest dan history telemetry untuk plot aktif.
- Frontend tenant dashboard menampilkan status runtime API dependency dari `/health/ready`.
- `/health/ready` sekarang membedakan dependency lokal:
  - MySQL belum configured
  - Redis belum configured atau `configured_for_telemetry`
  - VictoriaMetrics belum configured atau `configured_for_telemetry`
  - telemetry memakai in-memory local adapter atau `redis-victoria-hybrid`

## Security dan Tenancy

- Semua telemetry route membutuhkan session login.
- Telemetry read memakai permission `plot:read`.
- Plot wajib dicek dengan `TenantContext` sebelum telemetry dibaca.
- Cross-tenant latest/history access mengembalikan `404`.
- Browser tidak mengakses MQTT, Redis, atau VictoriaMetrics langsung.
- Payload internal boleh punya tenant/device, tetapi REST tetap dikontrol oleh plot tenant aktif.

## Explicit Non-Scope

- Belum ada SSE `/api/v1/stream`.
- Belum ada rate limit query history.
- Belum ada downsampling/rollup nyata untuk `5m`, `15m`, dan `1h`; resolution masih divalidasi dan diecho.
- Belum ada dead-letter storage untuk payload invalid.
- Belum ada device registry persistent untuk ownership check production.
- Belum ada retry/replay otomatis dari Redis Stream ke VictoriaMetrics jika write history gagal.

## QA Coverage Saat Ini

- Shared payload parser menerima null channel value.
- Shared parser menolak unknown metric field.
- Shared normalizer menghasilkan canonical metric/unit/quality flags.
- Shared storage record serializer round-trip.
- MQTT ingestor mengembalikan normalized readings untuk payload valid.
- MQTT storage helper resolve device-to-plot map dan format VictoriaMetrics import.
- API adapter dapat membaca matrix VictoriaMetrics menjadi telemetry history.
- Latest telemetry tenant aktif berhasil.
- Latest telemetry plot tenant lain mengembalikan `404`.
- History telemetry valid mengembalikan points berurutan.
- History query invalid mengembalikan `400 VALIDATION_FAILED`.
- Operator read-only dapat membaca telemetry.
- Smoke staging dan public VPS simulation memvalidasi endpoint latest dan history.

## Acceptance Criteria Fase 5 Saat Ini

- `npm run ci` hijau.
- Tidak ada credential nyata di repo.
- Latest/history endpoint memakai envelope standar.
- Semua telemetry read tenant-scoped.
- Field metric dan unit canonical sesuai `docs/09-data-api-contracts.md`.
- Frontend menampilkan latest dan history telemetry dari API untuk plot aktif.
- Runtime dependency Redis/VictoriaMetrics terlihat dari dashboard dan `/health/ready`.

## Open Before Phase 6

- Tambahkan SSE tenant-scoped dan fallback polling.
- Tambahkan rate limit dan batas rentang history query.
- Tambahkan automated browser E2E untuk bukti visual dashboard setelah MQTT simulation.
- Tambahkan replay worker dari Redis Stream untuk recovery write failure.
- Tutup device ownership check production setelah persistent device registry tersedia.
