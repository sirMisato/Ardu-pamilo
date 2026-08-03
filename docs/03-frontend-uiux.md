# 03 - Frontend UI/UX Workplan

Status: Draft Fase 0  
Pemilik: Frontend UI/UX Lead

## Misi Frontend

Membangun aplikasi web GIS yang ringan, jelas, dan aman untuk petani, operator, agronom, dan admin. UI harus membantu pengguna memantau plot dan perangkat tanpa menampilkan data tenant lain.

## Stack

- Vue 3 + TypeScript + Vite.
- Pinia untuk state.
- Vue Router untuk route guard.
- Leaflet untuk GIS.
- Plugin drawing polygon yang kompatibel dengan Vue 3 dan Leaflet.
- Chart library dipilih saat Fase 1 berdasarkan performa dan aksesibilitas.

## Information Architecture

| Route | Fungsi | Tenant enforcement |
| --- | --- | --- |
| `/login` | Login | Tidak ada tenant context sebelum login |
| `/select-tenant` | Pilih tenant jika user punya lebih dari satu | Dari `/api/v1/me` |
| `/dashboard` | Ringkasan farm, plot, device, alert, weather | Tenant aktif |
| `/map` | Peta semua plot tenant aktif | Data dari API tenant-scoped |
| `/farms/:farmId` | Detail farm | API menolak cross-tenant |
| `/plots/:plotId` | Detail plot, latest, weather, alert | API menolak cross-tenant |
| `/plots/:plotId/edit-geometry` | Editor polygon | API hitung area final |
| `/devices/:deviceId` | Detail device dan node | API menolak cross-tenant |
| `/alerts` | Alert aktif dan histori tindak lanjut | Tenant aktif |
| `/settings` | Profil, keamanan, notifikasi | Tenant aktif |

## UX States Wajib

- Loading skeleton untuk data awal.
- Empty state untuk belum ada farm/plot/device.
- Offline/stale state untuk sensor tidak update.
- Sensor error state saat value `null` dengan quality flag.
- Weather stale state jika BMKG gagal refresh.
- Unauthorized state tanpa membocorkan resource tenant lain.
- Form dirty state sebelum keluar dari editor polygon.

## GIS Rules

- Tile URL harus configurable dari environment.
- Attribution OSM selalu terlihat dan tidak tertutup panel.
- Jangan implement offline tile atau prefetch tile.
- Area yang tampil di frontend hanya preview; hasil final dari backend.
- Polygon overlap dalam tenant boleh warning; overlap lintas tenant tidak boleh menampilkan identitas pemilik lain.
- Pada mobile 390 px, tidak boleh ada horizontal scroll.

## Component Boundaries

- `AppShell`: layout utama, nav, tenant switcher.
- `AuthViews`: login, logout state.
- `MapView`: Leaflet map, plot layer, filters.
- `PlotEditor`: draw/edit polygon, validation message.
- `TelemetryCards`: latest metric cards with quality states.
- `TelemetryChart`: history chart with resolution selector.
- `WeatherPanel`: BMKG forecast and attribution.
- `AlertList`: active and historical alerts.
- `DevicePanel`: connection status, firmware, node list.

## Data Flow

1. App boot memanggil `/api/v1/me`.
2. Route guard memastikan user login dan tenant aktif.
3. REST dipakai untuk initial state dan histori.
4. SSE `/api/v1/stream` dibuka setelah user/tenant valid.
5. Event SSE hanya membawa resource ID, timestamp, dan metric yang berubah.
6. Frontend fetch delta bila perlu; chart histori tidak full-refresh untuk satu sample baru.
7. Jika SSE putus, polling ber-ETag 15-30 detik.

## Aksesibilitas dan Responsif

- Semua form field punya label eksplisit.
- Keyboard navigation untuk action utama.
- Kontras warna minimal WCAG AA.
- Status alert tidak hanya bergantung pada warna.
- Icon button punya accessible name.
- Peta punya fallback daftar plot untuk keyboard/screen reader.

## Deliverables per Fase

| Fase | Deliverable frontend |
| --- | --- |
| 1 | Vite app, routing, lint/typecheck, design tokens awal |
| 2 | Login, tenant selection, guarded layout |
| 3 | Map, farm/plot CRUD, polygon editor |
| 4 | Device provisioning UI dan simulator status |
| 5 | Dashboard latest, history chart, SSE handling |
| 6 | Weather panel, alert/recommendation view. Status awal ada di `docs/20-phase-6-bmkg-agronomy.md` |
| 7 | Accessibility pass, E2E stabilization |
| 8 | Staging config, error telemetry, production build validation |

## Acceptance Criteria Frontend

- User hanya melihat data tenant aktif.
- Tidak ada credential MQTT/database di bundle frontend.
- Semua API error ditampilkan aman tanpa stack trace.
- OSM/BMKG attribution tampil pada halaman terkait.
- UI membedakan offline, stale, sensor error, belum dikalibrasi, dan normal.
- Playwright lulus untuk desktop dan mobile.
