# 11 - GIS, BMKG, and Agronomy

Status: Draft Fase 0  
Pemilik: Frontend Lead, Backend Lead, Agronomy Reviewer

## GIS Contract

- Peta memakai Leaflet.
- Basemap memakai OSM-compatible tile provider.
- Tile URL configurable.
- Attribution OSM selalu terlihat.
- `tile.openstreetmap.org` tidak dianggap production tile server ber-SLA.
- Tidak ada bulk download, prefetch, atau offline tile dari `tile.openstreetmap.org`.

## Plot Geometry

Implementasi Fase 3 awal baru menerima GeoJSON `Polygon`. `MultiPolygon` tetap ada sebagai kebutuhan kandidat, tetapi harus diputuskan sebelum editor GIS dan migrasi production difinalkan.

| Field | Catatan |
| --- | --- |
| `geometry_geojson` | GeoJSON `Polygon` atau `MultiPolygon`, SRID 4326 |
| `area_m2` | Hasil hitung backend |
| `area_ha` | `area_m2 / 10000` |
| `centroid_lat` | Hasil hitung backend |
| `centroid_lng` | Hasil hitung backend |
| `bbox` | Bounding box untuk map fit dan query |
| `adm4_code` | Kode wilayah BMKG terverifikasi atau null |
| `mapping_status` | `verified`, `needs_review`, `unmapped` |

## BMKG Integration

Endpoint:

```text
GET https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode_wilayah_tingkat_iv}
```

Rules:

- Fetch per `adm4` unik aktif, bukan per user/farm/plot.
- Cache awal 6 jam dengan stale-while-revalidate.
- Worker berjalan jauh di bawah batas 60 request/menit/IP.
- Timeout, retry plus jitter, circuit breaker, dan schema validation wajib.
- UI menampilkan BMKG sebagai sumber data.
- Jika data lama, tampilkan label stale dan waktu update terakhir.

## BMKG Fields Disimpan

- `analysis_date`.
- `utc_datetime`.
- `local_datetime`.
- `t` temperatur udara.
- `hu` kelembapan udara.
- `weather_desc`.
- `weather_desc_en`.
- `ws` kecepatan angin.
- `wd` arah angin.
- `tcc` tutupan awan.
- `vs_text` jarak pandang.

## Implementasi Fase 6 Awal

- Backend sudah menyediakan `GET /api/v1/plots/:plotId/weather`.
- Implementasi saat ini memakai in-memory weather repository untuk contract test dan smoke test lokal.
- Plot tanpa `adm4_code` mengembalikan `cache_status: missing`, bukan error.
- Snapshot cached memakai status `fresh`, `stale`, atau `missing`.
- Frontend sudah menampilkan panel Weather untuk plot aktif dengan atribusi BMKG.
- Live fetch ke BMKG, Redis cache, circuit breaker, dan persistent snapshot belum aktif.

## Agronomy Governance

Jangan membuat angka threshold universal untuk N, P, K, EC, moisture, VWC, atau suhu. Setiap threshold harus punya:

- Crop.
- Variety jika relevan.
- Growth stage.
- Metric.
- Unit.
- Method atau calibration profile.
- Soil context bila ada: tekstur, pH, kedalaman.
- Lower/upper bound.
- Severity.
- Duration dan hysteresis.
- Source URL/document.
- Reviewer.
- Version.
- Status: `draft`, `reviewed`, `verified`, `suspended`.

Implementasi Fase 6 awal sudah punya validator threshold di shared package. Validator ini hanya menerima threshold dengan crop spesifik, bound, method, source URL HTTPS, reviewer, version, dan status. API threshold, UI review, dan alert engine masih deferred.

## Master Data Awal

| Komoditas | Catatan |
| --- | --- |
| Padi | Varietas dari sumber resmi pertanian |
| Jagung | Varietas dari sumber resmi pertanian |
| Bawang merah | Varietas dari sumber resmi pertanian |
| Cabai | Varietas dari sumber resmi pertanian |
| Kelapa sawit | Varietas/sumber benih dari Ditjenbun atau sumber resmi |

## Source Facts Verified

- BMKG forecast 3 hari, per 3 jam, update 2 kali sehari, limit 60 request/menit/IP, wajib atribusi. Diakses 2026-08-02: https://data.bmkg.go.id/prakiraan-cuaca/
- OSM tile policy: visible attribution, valid User-Agent/Referer, cache headers atau minimal 7 hari, no bulk/offline, no SLA. Diakses 2026-08-02: https://operations.osmfoundation.org/policies/tiles/
