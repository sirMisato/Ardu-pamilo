# 20 - Phase 6 BMKG and Agronomy

Status: In Progress  
Pemilik: Backend + Frontend + Agronomy Reviewer + QA/QC  
Tanggal mulai: 2026-08-03

## Tujuan

Fase 6 membangun fondasi integrasi BMKG dan governance agronomy tanpa mengambil keputusan threshold universal. Implementasi awal tetap lokal dan testable memakai in-memory weather repository sampai worker fetch, cache Redis, dan proses review agronomy siap.

## Scope Implementasi Saat Ini

- Shared weather contract di `packages/shared/src/weather.ts`.
- Parser forecast BMKG-normalized untuk field:
  - `utc_datetime`
  - `local_datetime`
  - `t`
  - `hu`
  - `weather_desc`
  - `weather_desc_en`
  - `ws`
  - `wd`
  - `tcc`
  - `vs_text`
- Helper status cache BMKG:
  - `fresh`
  - `stale`
  - `missing`
- Shared agronomy threshold validator di `packages/shared/src/agronomy.ts`.
- Validator menolak crop universal seperti `*`, `all`, atau `universal`.
- Validator mewajibkan provenance threshold:
  - crop spesifik
  - growth stage
  - metric/unit
  - method
  - lower atau upper bound
  - duration dan hysteresis
  - source URL HTTPS
  - reviewer
  - version
  - status
- In-memory BMKG weather repository untuk smoke dan contract test.
- Weather API:
  - `GET /api/v1/plots/:plotId/weather`
- Frontend tenant dashboard menampilkan panel Weather untuk plot aktif.
- `/health/ready` menandai weather adapter lokal sebagai `in_memory_local`.

## Security dan Tenancy

- Weather route membutuhkan session login.
- Weather read memakai permission `plot:read`.
- Plot wajib dicek dengan `TenantContext` sebelum data cuaca dibaca.
- Cross-tenant plot access mengembalikan `404`.
- Browser tidak mengakses API BMKG langsung; browser hanya membaca backend PAMILO.
- Data BMKG wajib menampilkan atribusi `BMKG`.
- Threshold agronomy tidak boleh dibuat universal tanpa crop, growth stage, method, dan provenance.

## Explicit Non-Scope

- Belum ada worker live fetch ke `api.bmkg.go.id`.
- Belum ada Redis cache atau stale-while-revalidate nyata.
- Belum ada retry, jitter, timeout, dan circuit breaker produksi.
- Belum ada database persistent untuk weather snapshot.
- Belum ada UI editor threshold agronomy.
- Belum ada API threshold versioning.
- Belum ada alert engine.
- Belum ada rekomendasi agronomy otomatis dari telemetry.

## QA Coverage Saat Ini

- Cache weather diklasifikasi sebagai `fresh`, `stale`, atau `missing`.
- Parser forecast menerima field BMKG-normalized yang valid.
- Parser forecast menolak field malformed.
- Agronomy threshold valid dengan provenance diterima.
- Crop universal ditolak.
- Threshold tanpa bound dan source non-HTTPS ditolak.
- Weather API mengembalikan payload `missing` untuk plot tanpa ADM4.
- Weather API mengembalikan forecast BMKG cached untuk plot mapped.
- Weather API menyembunyikan plot tenant lain dengan `404`.
- Operator read-only dapat membaca weather.

## Acceptance Criteria Fase 6 Saat Ini

- `npm run ci` hijau.
- Tidak ada credential nyata di repo.
- Weather endpoint memakai response envelope standar.
- Weather endpoint tenant-scoped.
- UI menampilkan atribusi BMKG dan status cache.
- Plot tanpa ADM4 tidak dianggap error; UI menampilkan empty state.
- Validator threshold menolak angka agronomy tanpa provenance.

## Open Before Phase 7

- Kunci worker BMKG live fetch, timeout, retry, jitter, dan circuit breaker.
- Tambahkan Redis weather cache dengan TTL 6 jam dan stale-while-revalidate.
- Tambahkan persistent weather snapshot table bila Redis tidak cukup untuk audit/debug.
- Tambahkan threshold API dengan versioning, reviewer, audit log, dan status workflow.
- Tambahkan alert engine berbasis threshold verified saja.
- Tambahkan QA fixture dari contoh payload BMKG yang disimpan teredaksi.
- Tambahkan rate limit untuk endpoint weather bila cache miss memicu refresh asynchronous.
