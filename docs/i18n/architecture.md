# PAMILO i18n Architecture Audit

Batch: 00 - audit sebelum implementasi bilingual.

## Ringkasan Stack

Repository ini tidak memiliki `package.json` di root. Aplikasi dibagi menjadi dua app npm terpisah:

- `apps/web`: Vue 3.5, Vite 6, TypeScript 5.7, Pinia 2, Vue Router 4, Tailwind CSS, Chart.js, Leaflet, MQTT client, dan Vite PWA. Rendering adalah SPA client-side, tidak ada SSR/hydration server.
- `apps/api`: Fastify 5, TypeScript 5.7, Kysely, MySQL, Zod, `@fastify/jwt`, MQTT ingestor, dan bcrypt.
- Infrastruktur: Docker Compose dengan Traefik, EMQX, frontend static container, dan backend Fastify.

Tidak ada fondasi i18n yang sudah tersedia di source. Pencarian terhadap `i18n`, `locale`, `language`, `id-ID`, dan `en-US` hanya menemukan formatter hard-coded seperti `Intl.DateTimeFormat("id-ID")` dan `toLocaleString("id-ID")`.

## Dokumen dan Aturan Lokal

- `AGENTS.md` tidak ditemukan di repository.
- `docs/i18n` belum ada sebelum Batch 00.
- Dokumentasi yang ada hanya `docs/mqtt-emqx-credential-setup.md` dan `docs/emqx-configuration-notes.md`.
- Worktree bersih sebelum perubahan dokumentasi Batch 00.

## Perintah Proyek

Perintah yang tersedia dari manifest aktual:

| Area | Perintah | Hasil baseline |
| --- | --- | --- |
| Web | `npm run typecheck` di `apps/web` | Lulus |
| Web | `npm run build` di `apps/web` | Lulus, dengan warning chunk JS > 500 kB dari Vite |
| API | `npm run typecheck` di `apps/api` | Lulus |
| API | `npm run build` di `apps/api` | Lulus |

Tidak ada script `lint` atau `test` pada `apps/web/package.json` dan `apps/api/package.json`.

## Router, Layout, dan Role

Router utama ada di `apps/web/src/router/index.ts`.

Tenant routes:

- `/login` -> `views/auth/TenantLogin.vue`
- `/dashboard` -> `views/tenant/Dashboard.vue`
- `/chart` -> `views/tenant/Chart.vue`
- `/report` -> `views/tenant/Report.vue`
- `/ai-recommendation` -> `views/tenant/AiRecommendation.vue`
- `/weather` -> `views/tenant/Weather.vue`
- `/mqtt` -> `views/tenant/MQTT.vue`
- `/devices` -> `views/tenant/Devices.vue`
- `/master-data` -> `views/tenant/MasterData.vue`
- `/tenant-users` -> `views/tenant/TenantUsers.vue`
- `/settings` -> `views/tenant/Settings.vue`

Super admin routes:

- `/superadmin/login` -> `views/auth/SuperAdminLogin.vue`
- `/superadmin/dashboard` -> `views/superadmin/Dashboard.vue`
- `/superadmin/licenses` -> `views/superadmin/Licenses.vue`

Role branch:

- `tenant_admin` dapat melihat seluruh tenant routes.
- `tenant_user` read-only dibatasi oleh `apps/web/src/config/tenantAccess.ts` ke Dashboard, AI Rekomendasi, Weather Station, Grafik, dan Report.
- `super_admin` hanya masuk area `/superadmin`.

Tidak ada catch-all 404/error page di router. Link "Lupa Kata Sandi?" ada di tenant login tetapi hanya `href="#"`; tidak ada route atau endpoint lupa kata sandi.

## Sumber Teks yang Ditemukan

Teks statis frontend ditemukan di template dan script view/layout. Kategori yang harus diterjemahkan:

- Menu, route meta title/subtitle, topbar, sidebar, bottom navigation.
- Login tenant/super admin, tombol, placeholder, aria-label, loading, dan error lokal.
- Dashboard, peta, badge koneksi, chart labels, empty/loading/error state.
- Weather Station: tab Prakiraan Cuaca, Report Bulanan, Konfigurasi, tabel, filter, form, dan dialog konfirmasi.
- AI Rekomendasi: filter, catatan lapang, loading, section hasil, label confidence/priority/severity.
- Grafik, Report, MQTT, Perangkat, Master Data, User Tenant, Pengaturan, dan Super Admin.
- Pesan store seperti `Sesi login berakhir`, `API backend belum dapat dihubungi`, dan sukses/reset.
- Template ekspor CSV/PDF di `apps/web/src/views/tenant/Report.vue`.

Teks backend ditemukan di:

- `apps/api/src/routes/*`: `error`, `message`, dan sebagian pesan validasi Zod.
- `apps/api/src/middleware/*`: pesan auth/otorisasi.
- `apps/api/src/services/mqttService.ts`: pesan log bukan UI, tidak perlu diterjemahkan untuk pengguna.
- `apps/api/src/db/seedDemo.ts`: output CLI seeding dan default demo, bukan UI runtime.

## Diterjemahkan vs Dipertahankan

Diterjemahkan:

- Label UI buatan aplikasi, helper text, validasi yang tampil pada pengguna, modal, dialog konfirmasi, badge, status, empty/loading/error state, chart UI, kontrol peta buatan aplikasi, dan ekspor.
- Pesan API yang ditampilkan ke user melalui `message`.
- Label enum/status: license, device, crop, tenant user, AI level, telemetry status.
- Label metrik yang diketahui seperti moisture, nitrogen, phosphorus, potassium, temperature, humidity, rainfall, wind.

Dipertahankan:

- Brand `PAMILO`, `Smart Farming GIS`, `BMKG`, `ADM4`, `MQTT`, `EMQX`, `QoS`, `CSV`, `PDF`, `API`.
- Nama tenant, nama user, nama lahan/zona, nama crop/varietas, nama ilmiah, catatan/deskripsi buatan user, email, URL, hostname, credential, ID, topic MQTT, metric key mentah, JSON key, koordinat, dan kode ADM4.
- `error` code backend seperti `Invalid credentials` jika dipakai sebagai kode stabil; yang dilokalkan adalah `message` atau mapping di client.
- Atribusi peta Leaflet/OpenStreetMap/Esri dan atribusi BMKG.
- Token konfirmasi literal `RESET PAMILO`.

## Keputusan Fondasi i18n untuk Batch 01

Karena belum ada fondasi i18n, Batch 01 sebaiknya membuat satu fondasi saja di frontend:

- Tambahkan katalog terpusat di path baru yang eksplisit, misalnya `apps/web/src/i18n/`.
- Namespace semantik: `common`, `nav`, `layout`, `auth`, `dashboard`, `ai`, `weather`, `chart`, `report`, `mqtt`, `devices`, `masterData`, `tenantUsers`, `settings`, `superadmin`, `api`, `validation`, `format`.
- Kode internal bahasa hanya `id` dan `en`.
- Locale tampilan: `id-ID` untuk `id`, `en-US` untuk `en`.
- Dropdown bahasa memakai label tetap dan urutan tetap:
  - `EN - English` dengan value `en`
  - `ID - Indonesia` dengan value `id`
- Dropdown harus menjadi shared component agar bisa dipasang di `Topbar.vue`, `SuperAdminLayout.vue`, dan halaman auth yang belum punya header aplikasi.

Pilihan implementasi yang cocok dengan stack:

- Gunakan mekanisme i18n Vue terpusat, bukan penggantian DOM dan bukan ternary per komponen.
- Jika menambah dependensi, `vue-i18n` cocok untuk Vue 3 dan mendukung interpolation/pluralization. Jika tidak menambah dependensi, harus ada resolver internal yang setara: `t`, pluralization via `Intl.PluralRules`, pemeriksaan missing key, dan formatter bersama.
- Semua key baru wajib ada di `id` dan `en` pada batch yang sama.
- Runtime fallback ke `id` boleh ada, tetapi missing key harus terlihat pada mode dev dan CI/script.

## Implementasi Fondasi Batch 01

Batch 01 membuat fondasi tunggal di `apps/web/src/i18n/` tanpa dependensi baru:

- Katalog: `id.json` dan `en.json`.
- Helper: `index.ts` menyediakan `initI18n`, `setupI18nRouter`, `useI18n`, `t`, `tn`, `setLocale`, `normalizeLocale`, dan `routeMetaText`.
- Formatter: `formatters.ts` menyediakan formatter angka, tanggal, rentang tanggal, waktu relatif, persen, jumlah data, durasi, dan HST/DAP.
- Registry metrik/unit: `metrics.ts` menyediakan label metrik terjemahan dan normalisasi simbol unit seperti `us_cm` -> `µS/cm` dan `mg_kg` -> `mg/kg`.
- Dropdown: `apps/web/src/components/i18n/LanguageSelect.vue` memakai label tetap `EN - English` lalu `ID - Indonesia`.
- Pemeriksaan: `apps/web/scripts/check-i18n.mjs` memeriksa parity key, nilai kosong, placeholder mismatch, dan key literal yang dipakai lewat `t()`/`tn()`.

Contoh penggunaan helper:

```ts
import { useI18n } from "../i18n";
import { formatPercent } from "../i18n/formatters";
import { getMetricLabel, getMetricUnit } from "../i18n/metrics";

const { t, setLocale } = useI18n();

t("auth.apiUnavailable", { target: "localhost:3000" });
formatPercent(43, { valueKind: "percent" }); // 43%, bukan 4.300%
formatPercent(0.43, { valueKind: "ratio" }); // 43%
getMetricLabel("moisture"); // Kelembapan Tanah / Soil Moisture
getMetricUnit("conductivity", "us_cm"); // µS/cm
await setLocale("en", { explicit: true });
```

Persistensi Batch 01:

- Tamu memakai `pamilo.locale.guest`.
- Tenant memakai `pamilo.locale.tenant.{tenantId}.{email}`.
- Super admin memakai `pamilo.locale.superadmin.{email}`.
- Tenant admin juga menyinkronkan pilihan ke `display_preferences_json.language` dengan nilai `id` atau `en`.
- Field `language` bersifat aditif di JSON settings existing; tidak ada kolom/migrasi baru. Rollback cukup menghapus properti `language` dari JSON preferensi bila diperlukan.
- Kegagalan localStorage atau sinkronisasi server tidak mencegah perubahan bahasa in-memory.

Kontrak API Batch 01:

- `apiClient` mengirim `Accept-Language` dan `X-Pamilo-Locale` berisi `id` atau `en`.
- Backend menambahkan `apps/api/src/i18n/locale.ts`; locale dinormalisasi per request ke `request.locale` dengan fallback `id`.
- Locale tidak disimpan pada state global server dan bukan dasar otorisasi.

## Resolver Bahasa Aktif

Urutan resolver yang direkomendasikan:

1. Pilihan eksplisit pada sesi berjalan.
2. Preferensi server akun/tenant jika tersedia dan valid `id`/`en`.
3. Preferensi localStorage yang namespaced per identitas:
   - tamu: `pamilo.locale.guest`
   - tenant: `pamilo.locale.tenant.{tenantId}.{userEmailOrSub}`
   - super admin: `pamilo.locale.superadmin.{email}`
4. Default `id`.

Catatan:

- Browser `navigator.language` tidak dijadikan default karena requirement menetapkan tamu dan user baru default `id`.
- Preferensi satu akun tidak boleh menimpa akun lain di browser yang sama.
- Kegagalan sinkronisasi server tidak boleh mengunci dropdown; UI tetap memakai pilihan lokal eksplisit.
- Locale bukan tenant identity dan bukan dasar otorisasi.

## Penyimpanan Preferensi

Fasilitas yang sudah ada:

- Auth token: `pamilo.accessToken`.
- Auth profile: `pamilo.authProfile`.
- Weather config lokal: `pamilo.weather.configs` dan `pamilo.weather.activeConfigId`.
- Tenant settings backend: `tenant_settings.display_preferences_json` dan `notification_preferences_json`.

Strategi minimum kompatibel:

- Simpan pilihan eksplisit ke localStorage namespaced per identitas agar aman lintas akun.
- Untuk tenant admin, sinkronkan juga ke `display_preferences_json.language` melalui endpoint settings yang sudah ada atau endpoint preferensi aditif yang divalidasi `id|en`.
- Untuk read-only tenant dan super admin, gunakan localStorage namespaced sampai ada endpoint profil/preferensi akun yang sesuai.
- Jangan menyimpan bahasa di global server variable atau JWT sebagai sumber otorisasi.

## Kontrak Locale Frontend/API

Kontrak aditif yang direkomendasikan:

- `apiClient` mengirim `Accept-Language` atau `X-Pamilo-Locale` dengan nilai `id`/`en`.
- API membaca locale per request, validasi ke `id`/`en`, fallback `id`.
- `error` tetap kode stabil/backward compatible.
- `message` dilokalkan jika ditampilkan ke pengguna.
- `issues` dari Zod boleh tetap sebagai struktur teknis, tetapi client harus memetakan pesan field yang tampil ke katalog UI.
- Endpoint lama tetap valid tanpa locale.

## Formatter Bersama

Semua angka/tanggal/waktu relatif/persen/rentang harus lewat formatter bersama:

- `id` -> `id-ID`.
- `en` -> `en-US`.
- Pergantian bahasa tidak mengubah timezone, satuan ukur, mata uang, nilai mentah, presisi, timestamp, atau rumus.
- HST diterjemahkan sebagai DAP pada EN, tetapi rumus usia tanaman tidak berubah.
- Unit teknis seperti `pH`, `mg/kg`, `%`, `mm`, `km/j` perlu distandardkan. Untuk EN, `km/j` tampil sebagai `km/h` jika unit yang dimaksud adalah kilometer per jam, tanpa mengubah nilai.

## Konten AI dan Cuaca

AI:

- Saat ini backend memaksa prompt Bahasa Indonesia di `apps/api/src/routes/aiRecommendationRoutes.ts`.
- Batch khusus AI harus menambah locale pada request secara aditif dan menghasilkan prompt `id` atau `en`.
- Hasil AI lama adalah generated content; jangan diterjemahkan otomatis saat user mengganti bahasa.
- Simpan metadata `generatedLocale` jika riwayat AI ditambahkan nanti.

Cuaca BMKG:

- `apps/web/src/services/bmkgService.ts` menyimpan `condition` dan `conditionEn`.
- Untuk UI EN, gunakan `conditionEn` jika tersedia. Jika tidak tersedia, fallback ke teks sumber dan jangan klaim sudah diterjemahkan.
- Atribusi BMKG dipertahankan.
- Riwayat cuaca backend saat ini menyimpan `current_condition` dan `current_json`; strategi EN harus mengambil `conditionEn` dari JSON jika ada atau menambah field aditif.

## State yang Harus Bertahan Saat Bahasa Berubah

Pergantian bahasa harus reaktif dan tidak melakukan remount route. State yang ditemukan:

- Auth/login session: `pamilo.accessToken`, `pamilo.authProfile`.
- Sidebar collapsed state di `AppLayout.vue`.
- Realtime telemetry SSE/subscription dan refresh timer di `AppLayout.vue` dan `telemetryStore.ts`.
- Dashboard active field, posisi/zoom peta, active map layer, marker/polygon render.
- AI filters: plot, tanggal mulai/akhir, telemetry limit, catatan lapang.
- Weather: active tab, monthly month/page/page size, config form draft, active weather config.
- Chart: selected device, interval, loaded telemetry history.
- Report: start/end date, dataset, device filter, interval, pagination, page size.
- MQTT: search query, modal topic draft, subscription status.
- Devices: search/status filter, add modal draft.
- Master Data: active tab, selected crop, threshold draft, crop modal draft, area modal draft, polygon draft.
- User Tenant: search query, modal draft.
- Settings: active tab, profile/display/notification/password/reset drafts.
- Super Admin Licenses: search/status filter, inline drafts, create modal draft.

## Cache dan Request

- Locale change tidak boleh menggandakan fetch data, SSE subscription, MQTT subscription, atau interval refresh.
- Chart.js options perlu di-update labelnya secara reaktif tanpa mengganti dataset mentah.
- Leaflet map tidak boleh direcreate hanya karena label berubah; update tooltip/popup jika perlu.
- PWA cache mengikuti build normal; tidak ada cache bahasa server-side.

## Batch 15 Final Architecture Notes

- Final audit confirmed the active frontend i18n source remains `apps/web/src/i18n/index.ts` with `id` and `en` only. `id-ID` and `en-US` are centralized there and consumed by shared formatters.
- `LanguageSelect.vue` is the single dropdown implementation for header/auth/settings surfaces. It keeps fixed option order `EN - English` then `ID - Indonesia`, and now shows the full active label on mobile and desktop.
- Backend locale remains per request via `apps/api/src/i18n/locale.ts`; `apiMessage()` in `apps/api/src/i18n/messages.ts` localizes user-facing messages while stable `error` codes stay unchanged.
- Weather date labels now use shared `formatDateTime()` instead of a direct `id-ID` formatter in `bmkgService.ts`.
- No SSR/hydration architecture exists in this repo. Browser/server initial-locale consistency is therefore handled by SPA initialization plus request headers, not SSR state transfer.
- Rollback for Batch 15 is code-only: revert the touched frontend files and docs. No migration or deployment step was added.

## Risiko Awal

- Banyak teks campuran ID/EN dan formatter `id-ID` tersebar di komponen.
- API mengembalikan pesan campuran ID/EN dan belum punya resolver locale.
- Tidak ada lint/test i18n. Batch 01 perlu menambah pemeriksaan missing key.
- Tidak ada route error/catch-all dan lupa password hanya link mati.
- Weather config tersimpan localStorage global, belum namespaced per tenant.
- Demo seed memakai preferensi lama (`darkMode`, `thresholdAlerts`) yang tidak sepenuhnya cocok dengan schema settings terbaru.
