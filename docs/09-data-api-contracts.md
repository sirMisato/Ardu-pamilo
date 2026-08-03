# 09 - Data and API Contracts

Status: Draft Fase 0  
Pemilik: Backend Lead, Frontend Lead, QA/QC Lead

## Response Envelope

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

## Error Envelope

```json
{
  "data": null,
  "meta": {
    "request_id": "01JEXAMPLE",
    "generated_at": "2026-08-02T05:00:00Z"
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

## Pagination

List endpoint wajib memakai pagination:

```text
GET /api/v1/farms?limit=25&cursor=<opaque_cursor>
```

Response:

```json
{
  "data": [],
  "meta": {
    "request_id": "01JEXAMPLE",
    "generated_at": "2026-08-02T05:00:00Z",
    "next_cursor": null
  },
  "error": null
}
```

## Telemetry History Query

Latest telemetry:

```text
GET /api/v1/plots/{plotId}/telemetry/latest
```

Response `data` berisi array reading canonical terbaru per metric untuk plot aktif.

```text
GET /api/v1/plots/{plotId}/telemetry/history?metric=soil_temperature&from=2026-08-01T00:00:00Z&to=2026-08-02T00:00:00Z&resolution=15m
```

Rules:

- `metric`, `from`, `to`, dan `resolution` wajib.
- Server membatasi rentang query.
- Server boleh menaikkan resolution agar response tetap ringan.
- Semua query diverifikasi terhadap tenant aktif.

## SSE Event

```json
{
  "v": 1,
  "type": "telemetry.latest.changed",
  "tenant_id": "01JTENANT",
  "plot_id": "01JPLOT",
  "device_id": "01JDEVICE",
  "node_id": "soil-01",
  "metric": "soil_temperature",
  "ts": "2026-08-02T05:00:00Z"
}
```

Catatan: payload internal boleh punya `tenant_id`, tetapi server SSE hanya mengirim event setelah tenant authorization. Frontend tidak boleh mengandalkan `tenant_id` dari event sebagai kontrol keamanan.

## Weather Query

Plot weather:

```text
GET /api/v1/plots/{plotId}/weather
```

Response `data` berisi snapshot BMKG-normalized untuk plot aktif. Browser tidak memanggil BMKG langsung.

```json
{
  "source": "bmkg",
  "attribution": "BMKG",
  "adm4_code": "31.71.01.1001",
  "mapping_status": "verified",
  "cache_status": "stale",
  "analysis_date": "2026-08-03",
  "fetched_at": "2026-08-03T00:00:00Z",
  "stale_after": "2026-08-03T06:00:00Z",
  "forecast": [
    {
      "utc_datetime": "2026-08-03T06:00:00Z",
      "local_datetime": "2026-08-03T13:00:00+07:00",
      "temperature_c": 29,
      "humidity_pct": 82,
      "weather_desc": "Hujan Ringan",
      "weather_desc_en": "Light Rain",
      "wind_speed_kph": 8,
      "wind_direction": "SE",
      "cloud_cover_pct": 74,
      "visibility_text": "> 10 km"
    }
  ]
}
```

Rules:

- Semua query diverifikasi terhadap tenant aktif lewat plot.
- Plot tanpa `adm4_code` mengembalikan `cache_status: "missing"` dan `forecast: []`.
- `cache_status` hanya boleh `fresh`, `stale`, atau `missing`.
- UI wajib menampilkan atribusi `BMKG`.
- Live fetch BMKG dilakukan server/worker, bukan browser.

## Canonical Metrics

| Payload key | Metric | Canonical unit |
| --- | --- | --- |
| `st` | `soil_temperature` | `deg_c` |
| `sm` | `soil_moisture` | `percent_relative` |
| `n` | `nitrogen` | `mg_kg` |
| `p` | `phosphorus` | `mg_kg` |
| `k` | `potassium` | `mg_kg` |
| `ec` | `electrical_conductivity` | `ms_cm` |
| `vwc` | `volumetric_water_content` | `percent_v_v` |

## Data Semantics

- Nilai `0` berarti pengukuran valid bernilai nol.
- Nilai `null` berarti channel gagal, tidak tersedia, atau invalid.
- Quality flag wajib menjelaskan alasan `null`.
- NPK sensor tidak otomatis setara uji laboratorium.
- Unit sumber dari device harus disimpan bila berbeda dari canonical unit.

## OpenAPI Rules

- OpenAPI dihasilkan dari schema yang sama dengan validator runtime.
- Breaking change harus bump versi API atau disetujui lewat ADR.
- QA memakai OpenAPI untuk contract test.
- Frontend generated client boleh dipakai setelah schema stabil.
