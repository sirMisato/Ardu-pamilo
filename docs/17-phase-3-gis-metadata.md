# 17 - Phase 3 GIS and Metadata

Status: In Progress  
Pemilik: Backend + Frontend + Security + QA/QC  
Tanggal mulai: 2026-08-03

## Tujuan

Fase 3 membangun fondasi metadata tenant: farm, plot, dan geometri GIS. Implementasi awal tetap lokal dan testable, memakai in-memory repository sampai keputusan database production dikunci.

## Scope Implementasi Saat Ini

- Shared GIS utility di `packages/shared/src/gis.ts`.
- Validasi GeoJSON `Polygon`:
  - type wajib `Polygon`
  - linear ring wajib tertutup
  - longitude/latitude wajib dalam batas WGS84
  - polygon self-intersection ditolak
  - area wajib lebih dari nol
- Kalkulasi backend untuk:
  - `area_m2`
  - `area_ha`
  - centroid lat/lng
  - bounding box
- Role permission baru:
  - `farm:read`
  - `farm:write`
- Farm API:
  - `GET /api/v1/farms`
  - `POST /api/v1/farms`
- Plot API:
  - `GET /api/v1/farms/:farmId/plots`
  - `POST /api/v1/farms/:farmId/plots`
  - `GET /api/v1/plots/:plotId`
  - `PATCH /api/v1/plots/:plotId/geometry`
- Audit event:
  - `farm.created`
  - `plot.created`
  - `plot.geometry_updated`
- Frontend tenant dashboard:
  - list farm aktif
  - tambah farm untuk role write
  - list plot per farm
  - tambah plot dari template polygon valid
  - tampilkan area, centroid, bbox, dan mapping status

## Security dan Tenancy

- Semua farm/plot route membutuhkan session login.
- Mutasi farm/plot membutuhkan `x-csrf-token`.
- Role `farmer_operator` hanya read-only untuk farm dan plot.
- Farm/plot lookup selalu memakai `TenantContext`.
- Cross-tenant farm/plot access mengembalikan `404` agar tidak membocorkan keberadaan resource tenant lain.
- Client tidak boleh mengirim `tenant_id` untuk membuat farm atau plot; tenant diambil dari session aktif.

## Explicit Non-Scope

- Belum ada database adapter persistent.
- Belum ada editor polygon interaktif Leaflet.
- Belum mendukung `MultiPolygon`.
- Belum ada upload/import GeoJSON.
- Belum ada master crop, variety, dan planting cycle.
- Belum ada BMKG worker/cache.
- Belum ada pagination untuk list farm/plot karena seed data masih kecil.

## QA Coverage Saat Ini

- Shared GIS utility menerima polygon valid dan menghitung summary.
- Shared GIS utility menolak open ring.
- Shared GIS utility menolak self-intersection.
- Farm list hanya mengembalikan farm tenant aktif.
- Farm create membutuhkan CSRF dan role write.
- Farm create mencatat audit event.
- Plot list di farm tenant aktif berhasil.
- Plot list untuk farm tenant lain mengembalikan `404`.
- Plot create menghitung area/centroid/bbox backend.
- Plot create menolak self-intersecting polygon.
- Plot mutation membutuhkan CSRF dan role write.
- Plot geometry update menghitung ulang area dan bbox.
- Tenant A tetap tidak bisa membaca direct ID plot Tenant B.

## Acceptance Criteria Fase 3 Saat Ini

- `npm run ci` hijau.
- Tidak ada credential nyata di repo.
- API farm/plot memakai envelope standar.
- Semua mutasi farm/plot memakai CSRF.
- Geometry invalid ditolak sebelum persistence.
- Area, hectare, centroid, dan bbox hanya dihitung backend.
- Frontend menampilkan farm/plot dari API, bukan hardcoded plot ID.
- Operator read-only tidak melihat jalur mutasi sebagai workflow utama.

## Open Before Phase 4

- Kunci adapter database dan migration runner dari keputusan DEC-002.
- Tentukan apakah MVP butuh `MultiPolygon` atau cukup `Polygon`.
- Tentukan GIS editor: Leaflet Draw, Geoman, atau custom control.
- Tambahkan pagination dan search jika jumlah farm/plot mulai besar.
- Tambahkan persistence audit log sebelum device provisioning.
- Tambahkan OpenAPI schema formal untuk farm/plot.
