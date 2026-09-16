# PAMILO i18n Progress

## Batch 00 Status

Status: completed for audit docs only.

Perubahan Batch 00:

- Membuat `docs/i18n/architecture.md`.
- Membuat `docs/i18n/coverage.csv`.
- Membuat `docs/i18n/glossary.md`.
- Membuat `docs/i18n/progress.md`.
- Membuat `docs/i18n/acceptance.md`.
- Tidak melakukan migrasi string aplikasi.

## Baseline Pemeriksaan

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `AGENTS.md` | Tidak ditemukan |
| `git status --short` sebelum audit | Bersih |
| `docs/i18n` sebelum audit | Tidak ada |
| Root `package.json` | Tidak ada |
| `apps/web/package.json` | Ada, scripts: `build`, `dev`, `preview`, `typecheck` |
| `apps/api/package.json` | Ada, scripts: `build`, `dev`, `migrate`, `seed:demo`, `start`, `typecheck` |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, warning Vite chunk > 500 kB |
| `npm run typecheck` di `apps/api` | Lulus |
| `npm run build` di `apps/api` | Lulus |
| Script lint/test | Tidak tersedia di manifest |

## Dependensi yang Ditemukan

- Frontend: Vue 3, Vite, Pinia, Vue Router, Chart.js, Leaflet, MQTT, Vite PWA.
- Backend: Fastify, Kysely, MySQL, Zod, JWT, MQTT.
- Tidak ada i18n library/foundation saat ini.
- Tidak ada route error/catch-all.
- Tidak ada fitur lupa kata sandi selain link UI `href="#"`.
- Tidak ada notification feed/template delivery, hanya icon header dan preferences.

## Arti Status Coverage

- `verified`: permukaan sudah ditemukan dan diverifikasi dari kode pada Batch 00.
- `not_started`: permukaan sudah punya pemilik batch tetapi belum dimigrasikan bilingual.
- `blocked`: ada bukti kode tetapi butuh keputusan/fitur pendukung sebelum migrasi lengkap.
- `not_applicable`: fitur tidak ada atau bukan teks user-facing untuk i18n.
- `implemented`: digunakan oleh batch berikutnya setelah migrasi benar-benar selesai.

## Checklist Batch 00-15

| Batch | Status | Fokus | Output yang diharapkan |
| --- | --- | --- | --- |
| 00 | completed | Audit kode dan peta cakupan | Dokumen audit ini |
| 01 | ready | Fondasi i18n, formatter, locale resolver, dropdown bahasa | Katalog ID/EN, store/plugin, persistence, CI missing-key check, header/auth dropdown |
| 02 | pending | Layout, navigasi, auth, role guard, shared UI | Sidebar, bottom nav, topbar, login, logout, route meta |
| 03 | pending | Dashboard dan FieldMap | Dashboard cards, map controls, realtime labels, state retention |
| 04 | pending | Weather Station | Forecast, Monthly Report, Configuration, BMKG condition selection |
| 05 | pending | AI Rekomendasi | UI AI, locale-aware prompt/backend response strategy |
| 06 | pending | Grafik | Chart filters, Chart.js labels/tooltips, metric labels |
| 07 | pending | Report dan ekspor | Telemetry/weather/alert report, pagination, CSV/PDF output |
| 08 | pending | MQTT dan Perangkat | MQTT list/modal, device list/modal, status labels |
| 09 | pending | Master Data | Crop Types, Zona & Area, Threshold, polygon editor |
| 10 | pending | User Tenant | User table, modal, role/status labels, read-only notes |
| 11 | pending | Pengaturan | Profile, Display, Notifications, Security, Reset Semua Sistem |
| 12 | pending | Super Admin | Login, layout, dashboard, license management |
| 13 | pending | Backend API messages | Per-request locale resolver, localized `message`, validation mapping |
| 14 | pending | QA lintas fitur | State retention, visual overflow, mobile/desktop dropdown, no duplicate fetch/subscription |
| 15 | pending | Final hardening | Coverage closeout, missing-key gate, docs update, regression pass |

## Blocker dan Catatan Risiko

- Belum ada fondasi i18n. Batch 01 harus membuat satu fondasi terpusat, bukan solusi per komponen.
- Tidak ada script lint/test. Pemeriksaan otomatis i18n perlu ditambahkan sendiri.
- Banyak formatter `id-ID` tersebar di komponen; harus dipindahkan ke formatter bersama.
- API belum menerima locale dan pesan `message` masih campuran ID/EN.
- Weather config localStorage belum namespaced per tenant.
- AI prompt saat ini memaksa Bahasa Indonesia.
- Report/PDF dibangun manual lewat string HTML; perlu katalog dan escaping tetap dipertahankan.
- Route 404/error dan backend lupa password tidak ada; dicatat `not_applicable` pada cakupan, bukan dibuat di Batch 00.

## Langkah Konkret Batch 01

1. Tambahkan fondasi i18n frontend tunggal untuk `id` dan `en`.
2. Tambahkan katalog awal `id` dan `en` dengan namespace stabil.
3. Tambahkan formatter bersama untuk angka, tanggal, waktu, persen, rentang, dan HST/DAP.
4. Tambahkan resolver locale dan persistence namespaced per identitas.
5. Tambahkan dropdown bahasa shared dengan label dan urutan wajib.
6. Pasang dropdown di tenant topbar, super admin header, dan auth pages.
7. Tambahkan pemeriksaan missing key untuk `id` dan `en`.
8. Update `docs/i18n/coverage.csv` dan `progress.md` setelah Batch 01.

## Batch 01 Status

Status: completed for i18n foundation and small real-component integration.

Perubahan Batch 01:

- Membuat katalog `id` dan `en` di `apps/web/src/i18n/id.json` dan `apps/web/src/i18n/en.json`.
- Membuat helper i18n reaktif di `apps/web/src/i18n/index.ts` untuk resolver locale, fallback `id`, interpolation, pluralization, `html lang`, document title, route meta key, dan storage per identitas.
- Membuat formatter bersama di `apps/web/src/i18n/formatters.ts` untuk angka, tanggal, rentang tanggal, waktu relatif, persen ratio/percent, jumlah data, durasi, dan HST/DAP.
- Membuat registry label metrik dan unit di `apps/web/src/i18n/metrics.ts`.
- Membuat dropdown bahasa shared `apps/web/src/components/i18n/LanguageSelect.vue` dengan urutan wajib `EN - English`, lalu `ID - Indonesia`.
- Memasang dropdown di tenant topbar, super admin header, tenant login, dan super admin login.
- Memigrasikan contoh komponen nyata: route title/subtitle di header, navigation shell, bottom navigation, login tenant, dan login super admin.
- Menambahkan `Accept-Language` dan `X-Pamilo-Locale` pada `apiClient`.
- Menambahkan resolver locale backend per request di `apps/api/src/i18n/locale.ts`.
- Menambahkan `display_preferences_json.language` opsional melalui schema settings existing, tanpa kolom/migrasi baru.
- Menambahkan script `npm run i18n:check` di `apps/web`.

Pemeriksaan aktual Batch 01:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 117 keys, 37 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| `npm run typecheck` di `apps/api` | Lulus |
| `npm run build` di `apps/api` | Lulus |

Verifikasi perilaku Batch 01:

- Default locale adalah `id`; locale tidak valid dinormalisasi ke fallback `id`.
- Dropdown mengubah locale reaktif tanpa navigasi route atau remount shell.
- Preferensi guest, tenant, dan superadmin disimpan dengan key localStorage terpisah.
- Storage browser dibungkus `try/catch`; kegagalan storage tidak mencegah perubahan bahasa in-memory.
- Tenant admin mencoba sinkron ke `display_preferences_json.language`; kegagalan sinkronisasi tidak mengunci dropdown.
- `apiClient` mengirim locale aktif per request; API menyimpan locale pada `request.locale` per request, tidak pada global mutable shared locale.
- Formatter membedakan persen `43` sebagai persen dan `0.43` sebagai ratio, serta nilai null sebagai `-`.

Belum diklaim selesai:

- Semua halaman belum bilingual penuh. Batch 02 dan seterusnya tetap memigrasikan teks tiap fitur.
- Validasi visual browser/manual untuk dua akun berbeda belum dijalankan karena Batch 01 hanya menjalankan pemeriksaan CLI/build.
- Pesan API user-facing belum dilokalkan penuh; Batch 13 tetap menjadi pemilik migrasi pesan backend.

Batch berikutnya yang siap dikerjakan: Batch 02, fokus layout, navigasi, auth, role guard, dan shared UI.
