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

## Batch 02 Status

Status: completed for dropdown header, app shell, active auth screens, and shared auth/navigation text.

Perubahan Batch 02:

- Memperkuat `apps/web/src/components/i18n/LanguageSelect.vue` menjadi shared listbox/dropdown dengan urutan opsi wajib `EN - English`, lalu `ID - Indonesia`, trigger ringkas di mobile, `aria-selected`, dan dukungan keyboard dasar.
- Menjaga dropdown yang sama tetap dipakai di tenant topbar, super admin layout, tenant login, dan super admin login.
- Menyelaraskan istilah menu di katalog dan glossary: Dasbor/Dashboard, Rekomendasi AI/AI Recommendations, Stasiun Cuaca/Weather Station, Grafik/Charts, Laporan/Reports, MQTT/MQTT, Perangkat/Devices, Data Induk/Master Data, Pengguna Tenant/Tenant Users, Pengaturan/Settings.
- Melokalisasi role label profil, aria menu akun, aria pencarian global, placeholder password, subtitle lisensi super admin, serta fallback HTTP umum.
- Memetakan kode error auth yang stabil dari backend untuk login tenant dan super admin ke katalog ID/EN.
- Menambahkan handler `pamilo:auth-expired` di shell aplikasi agar 401 mengarahkan ke login yang sesuai tanpa membuat mekanisme locale kedua.
- Memperbarui `docs/i18n/coverage.csv` dan `docs/i18n/glossary.md`.

Pemeriksaan aktual Batch 02:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 131 keys, 50 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| Dev server `npm run dev -- --port 5177 --strictPort` | Berhasil berjalan di `http://localhost:5177/`, lalu dihentikan |
| `npx playwright install chromium` | Berhasil memasang browser runtime Playwright lokal user |
| `npx playwright screenshot --viewport-size=1280,800 http://localhost:5177/login desktop-batch02.png` | Berhasil mengambil screenshot smoke desktop; artefak dihapus |
| `npx playwright screenshot --viewport-size=375,812 http://localhost:5177/login mobile-batch02.png` | Berhasil mengambil screenshot smoke mobile 375 px; artefak dihapus |

Verifikasi perilaku Batch 02:

- Label dropdown tetap persis `EN - English` dan `ID - Indonesia` dari satu katalog opsi.
- Default locale tetap `id`; perubahan locale memakai sumber locale Batch 01 dan tidak melakukan navigasi route.
- Header tenant, super admin header, dan layout autentikasi memakai komponen dropdown yang sama.
- Auth login tenant dan super admin menampilkan teks ID/EN dari katalog, termasuk error credentials/license/inactive/admin-config yang berasal dari kode backend stabil.
- Menu/judul/subtitle shell mengikuti glossary Batch 02.

Keterbatasan verifikasi:

- Playwright screenshot CLI berhasil, tetapi Playwright test interaktif sementara gagal karena module resolution paket `@playwright/test`/`playwright/test` dari `npx` tidak tersedia untuk spec dalam repo tanpa memasang dependency proyek. Keyboard/listbox diverifikasi lewat typecheck, build, dan inspeksi implementasi; full automated interaction test belum diklaim.
- Form login tidak diverifikasi terhadap API nyata untuk pengiriman email/reset karena fitur lupa/reset password tidak memiliki route/backend aktif.
- Halaman isi fitur seperti Dashboard, Weather, AI, Chart, Report, MQTT, Devices, Master Data, Tenant Users, Settings, dan Super Admin detail tetap menunggu batch masing-masing; Batch 02 hanya menutup kerangka/shared shell dan auth aktif.

Batch berikutnya yang siap dikerjakan: Batch 03, fokus Dashboard dan FieldMap.

## Batch 03 Status

Status: completed for Dashboard, realtime sensor cards, and FieldMap UI text.

Perubahan Batch 03:

- Melokalisasi `apps/web/src/views/tenant/Dashboard.vue` untuk ringkasan status, detail tanaman, progress/fase tanaman, kartu cuaca/realtime, pemantauan lahan, kartu metrik terbaru, delta terhadap kemarin, dan empty state.
- Melokalisasi `apps/web/src/components/dashboard/FieldMap.vue` untuk kontrol Peta/Map dan Satelit/Satellite, indikator koneksi, popup marker, status online/offline, update terakhir, empty telemetry, tombol Detail/Reports, dan label metrik popup.
- Memperbarui `apps/web/src/i18n/metrics.ts` agar label metrik memakai registry bersama, menormalisasi alias seperti `soil_moisture`, `soil_temperature`, `ec`, dan tetap memberi fallback aman untuk metric custom tanpa mengubah metric key payload.
- Menambahkan `apps/web/src/i18n/weather.ts` sebagai adapter kondisi cuaca bersama awal; Dashboard memakai `conditionEn` saat bahasa aktif `en` dan mempertahankan teks sumber saat tidak tersedia.
- Memakai formatter bersama untuk count, area hektare, suhu, persen progress/delta, tanggal, waktu popup, dan HST/DAP.
- Memastikan perubahan locale pada popup peta memanggil `refreshPopup()` dan update tooltip, tanpa menginisialisasi ulang Leaflet map, mengganti layer aktif, atau menjalankan ulang subscription.
- Memperbarui `docs/i18n/coverage.csv` dan `docs/i18n/glossary.md`.

Pemeriksaan aktual Batch 03:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 189 keys, 109 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| Pencarian string Dashboard/FieldMap dengan `rg` | Tidak menemukan string UI lama utama seperti `Detail Tanaman`, `Field Map Monitoring`, `Latest Metric`, `Waiting for MQTT`, `Details`, atau `Laporan` sebagai teks literal user-facing baru |

Verifikasi perilaku Batch 03:

- Metric key mentah tetap dipakai untuk threshold dan identitas payload; label tampilan memakai registry/fallback.
- Nilai sensor `null` tampil `-`, nilai `0` tetap angka valid, dan custom metric tidak dihapus dari kartu/popup.
- Locale change memperbarui teks Dashboard secara reaktif dari computed values.
- Popup Leaflet diperbarui melalui content refresh saat locale berubah; map instance, polygon, active layer, dan posisi tidak dibuat ulang oleh perubahan bahasa.
- AppLayout realtime connect/refresh interval tidak diubah, sehingga perubahan bahasa tidak menambah subscription dari Batch 03.

Keterbatasan verifikasi:

- Tidak menjalankan skenario Dashboard dengan API/data nyata karena kredensial demo dan layanan backend lokal tidak tersedia dari konteks aktif. Skenario data normal/kosong/offline/null/0/custom diverifikasi lewat jalur kode, formatter, dan build/typecheck, bukan sesi browser end-to-end.
- Pesan error internal `telemetryStore.ts` masih dicatat untuk Batch 13 karena itu pesan store/API/SSE lintas fitur.
- Cuaca dinamis lengkap tetap menjadi Batch 04; Batch 03 hanya memakai adapter bersama awal untuk ringkasan Dashboard.

Batch berikutnya yang siap dikerjakan: Batch 04, fokus Weather Station.

## Batch 04 Status

Status: completed for Weather Station forecast, monthly report, configuration labels, and shared weather condition adapter.

Perubahan Batch 04:

- Melokalisasi `apps/web/src/views/tenant/Weather.vue` untuk judul Weather Station, lokasi, tombol refresh, tab Prakiraan Cuaca/Weather Forecast, Laporan Bulanan/Monthly Report, Konfigurasi/Configuration, kartu kondisi saat ini, prakiraan 3 hari, prakiraan per interval, sumber data, waktu pembaruan, loading/empty/error state, tabel histori, pagination, form konfigurasi, status konfigurasi, aria label ikon aksi, dan dialog hapus.
- Memperluas katalog `apps/web/src/i18n/id.json` dan `apps/web/src/i18n/en.json` dengan namespace `weather.*` dan shared `common.actions`/`common.status`.
- Memperkuat adapter `apps/web/src/i18n/weather.ts` untuk kondisi cuaca, detail kode cuaca, fallback kode tidak dikenal, tone badge, arah angin ID/EN, dan format kecepatan angin `km/j` atau `km/h` tanpa mengubah nilai.
- Memperbarui `apps/web/src/services/bmkgService.ts` agar fallback kode cuaca memakai adapter pusat, mock forecast memiliki label ID/EN yang benar, dan ringkasan harian menyimpan `summaryEn`.
- Weather history tetap memakai kontrak backend lama; tampilan client membaca `conditionEn` dan `weatherCode` dari `current_json` bila tersedia, sehingga Dashboard/forecast/histori dapat memakai adapter yang sama tanpa migrasi database.
- Berdasarkan dokumentasi resmi BMKG yang dicek pada 2026-09-16, payload prakiraan menyediakan `weather_desc` untuk Indonesia dan `weather_desc_en` untuk English, `ws` dalam km/jam, `wd` arah angin, `tcc` tutupan awan, `vs_text` jarak pandang, serta data 3 hari per 3 jam. Atribusi BMKG tetap dipertahankan.

Pemeriksaan aktual Batch 04:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 255 keys, 176 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| `npx --no-install tsx --version` di `apps/web` | Gagal karena `tsx` tidak terpasang dan `npx --no-install` tidak boleh memasang paket; fixture runtime TS ad hoc tidak dijalankan |
| Pencarian literal Weather utama dengan `rg` | Tidak menemukan string UI lama utama seperti `Prakiraan Cuaca`, `Report Bulanan`, `Histori Cuaca`, `Pilih bulan`, atau pesan error lokal sebagai literal user-facing di `Weather.vue` |

Verifikasi perilaku Batch 04:

- Perubahan bahasa memperbarui label Weather secara reaktif dari computed/template dan tidak mengubah `activeTab`, `monthlyFilters.month`, page size, current page, form draft, konfigurasi aktif, atau payload cuaca.
- Peluang hujan tetap persen, curah hujan tetap mm, suhu tetap C, dan angin tetap km/j/km/h sesuai locale tampilan tanpa konversi nilai.
- Kondisi cuaca mengutamakan field BMKG `weather_desc`/`weather_desc_en`; jika hanya kode tersedia, adapter pusat memetakan kode yang didukung; kode tidak dikenal menampilkan `Kondisi cuaca tidak dikenal`/`Unknown weather condition` dengan detail kode bila ada.
- Nama lokasi, ADM4, Endpoint/URL, atribusi BMKG, dan source payload tersimpan tetap dipertahankan; yang diterjemahkan hanya label buatan aplikasi.
- Tanggal dan waktu Weather memakai formatter bersama `id-ID`/`en-US` dari locale aktif, tanpa mengubah timezone aplikasi/data.

Keterbatasan verifikasi:

- Tidak menjalankan browser end-to-end dengan akun nyata/API BMKG nyata karena kredensial dan layanan backend lokal tidak tersedia dari konteks aktif.
- Fixture eksplisit untuk seluruh kombinasi kondisi didukung, kode tak dikenal, pergantian hari, nilai 0/null/pecahan diverifikasi melalui jalur kode, typecheck, build, dan inspeksi adapter; runner TS ad hoc tidak tersedia tanpa menambah paket baru.
- AI weather context dan Report weather export masih menunggu batch pemilik masing-masing, tetapi adapter cuaca bersama sudah tersedia untuk dipakai Batch 05 dan Batch 07.

Batch berikutnya yang siap dikerjakan: Batch 05, fokus AI Rekomendasi dan strategi prompt/hasil AI berbasis locale.

## Batch 05 Status

Status: completed for Weather Station monthly report and configuration hardening.

Catatan penomoran: instruksi aktif pengguna menamai pekerjaan ini `BATCH 05: Weather Station: laporan bulanan dan konfigurasi`. Roadmap awal di dokumen audit pernah menempatkan AI pada Batch 05; pekerjaan AI belum dijalankan dan tetap menunggu instruksi batch berikutnya.

Perubahan Batch 05:

- Memperdalam lokalisasi tab Laporan Bulanan di `apps/web/src/views/tenant/Weather.vue`: label Bulan Laporan/Report Month, tombol Apply/This Month/Refresh, kartu jumlah rekaman, suhu rata-rata, total curah hujan, rekaman hujan, kondisi terbaru, empty histori bulanan, header tabel, pagination, jumlah baris, dan kalimat `{start}-{end}` dari total data.
- Menjaga filter bulan sebagai nilai `YYYY-MM`; batas awal/akhir bulan tetap dibuat dengan zona waktu aplikasi/browser yang sama seperti sebelumnya dan tidak berubah karena locale.
- Menambahkan `:lang="displayLocale"` pada input `type="month"` agar widget kalender native mengikuti locale dokumen sejauh didukung browser.
- Memperdalam tab Konfigurasi: validasi app-level untuk nama, lahan, ADM4 BMKG, endpoint wajib/URL valid; feedback berhasil/gagal untuk simpan, hapus, aktifkan, serta konfigurasi tidak ditemukan; aria label aktifkan/edit/hapus tetap memakai nama konfigurasi asli.
- Menjaga nilai nama konfigurasi, catatan pengguna, URL endpoint, ADM4, field ID, dan ID relasi tidak diterjemahkan atau diubah.
- Melokalisasi `message` backend Weather history di `apps/api/src/routes/weatherRoutes.ts` untuk invalid payload, invalid query, dan plot not found memakai `request.locale`; `error` code dan kontrak API tetap stabil.
- Memperbarui `docs/i18n/coverage.csv` untuk menandai monthly report, configuration, dan backend history Weather sebagai Batch 05 implemented.

Pemeriksaan aktual Batch 05:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 270 keys, 178 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| `npm run typecheck` di `apps/api` | Lulus |
| `npm run build` di `apps/api` | Lulus |
| Pencarian literal Weather monthly/config dengan `rg` | Tidak menemukan literal lama utama di `Weather.vue`; literal teknis yang dipertahankan meliputi `ADM4`, `BMKG`, `Endpoint`, URL/source, dan data storage |

Verifikasi perilaku Batch 05:

- Locale change memperbarui label dan feedback secara reaktif karena feedback menyimpan translation key, bukan string final; draft form `configForm` tetap berada di state reactive yang sama.
- Tombol simpan tidak diblokir oleh browser native validation; validasi aplikasi menampilkan pesan katalog ID/EN untuk fixture invalid seperti nama kosong, lahan kosong, ADM4 kosong, endpoint kosong, dan endpoint bukan URL HTTP/HTTPS.
- Handler edit/activate/delete menangani konfigurasi tidak ditemukan dengan pesan lokal, bukan silent return.
- Operasi create/update/delete/activate tetap lokal ke weatherConfigStore; tidak mengubah konfigurasi BMKG produksi atau mengirim pesan eksternal.

Keterbatasan verifikasi:

- Tidak menjalankan browser end-to-end dengan akun nyata atau database pengujian aktif. Skenario filter bulan, pagination, tambah/edit/batal/success/error, dan locale switch saat draft diverifikasi lewat jalur kode, typecheck, build, dan pemeriksaan state reactive.
- Browser native month picker memiliki dukungan locale berbeda antar browser; aplikasi sudah memberi `lang` aktif dan document language dari fondasi Batch 01.

Batch berikutnya yang siap dikerjakan bila diminta: AI Rekomendasi dan strategi prompt/hasil AI berbasis locale.

## Batch 06 Status

Status: completed for Grafik and sensor visualization localization.

Perubahan Batch 06:

- Melokalisasi `apps/web/src/views/tenant/Chart.vue` untuk filter Nama Perangkat/Device Name, interval, Refresh/Loading, capped info, error lokal, empty state, rentang 24 jam terakhir, jumlah titik data, dan label unit.
- Mengganti kamus label metric lokal di halaman Grafik dengan registry bersama `apps/web/src/i18n/metrics.ts` melalui `getMetricLabel`, `getMetricUnit`, dan `normalizeMetricKey`.
- Melokalisasi konfigurasi Chart.js: judul chart, dataset `Aktual/Actual`, legenda `Batas Bawah/Low Threshold` dan `Batas Atas/High Threshold`, tooltip, label sumbu waktu/nilai, tick tanggal/jam, dan nilai tooltip dengan formatter angka locale aktif.
- Menambahkan pluralization untuk `{count} titik data/{count} data points`, interpolation untuk `{hours} jam terakhir/Last {hours} hours`, dan `Setiap {minutes} menit/Every {minutes} minutes`.
- Memperbaiki `apps/web/scripts/check-i18n.mjs` agar key plural parent yang dipakai lewat `tn()` dikenali bila katalog memiliki `.other`.
- Menjaga metric key, dataset `id`, parameter API, agregasi bucket, nilai numerik dataset, threshold min/max, perangkat terpilih, interval, dan history window tetap tidak berubah oleh locale.
- Tidak ditemukan fitur ekspor chart pada halaman Grafik, sehingga lokalisasi kontrol ekspor chart tidak berlaku untuk Batch 06.

Pemeriksaan aktual Batch 06:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 294 keys, 198 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| Pencarian literal Chart dengan `rg` | Tidak menemukan literal lama utama seperti `Nama Device`, `Per 15 menit`, `Actual`, `Low`, `High`, `id-ID`, atau pesan error lokal sebagai teks user-facing di `Chart.vue` |

Verifikasi perilaku Batch 06:

- Chart data tetap berupa number/null dan label terjemahan tidak dipakai sebagai API parameter atau identifier dataset.
- Computed `chartCards` membangun ulang `chartData` dan `chartOptions` saat locale berubah, sehingga tooltip/legend/tick callback memakai bahasa terbaru tanpa refetch atau subscription baru.
- Formatter bersama menangani nilai pecahan, 0, null, tanggal lintas hari, dan jumlah titik data; threshold tetap memakai nilai min/max asli.
- Custom metric tetap diberi fallback label dari metric key tanpa mengubah key mentah.

Keterbatasan verifikasi:

- Tidak menjalankan browser end-to-end untuk membuka tooltip Chart.js setelah language switch karena tidak ada akun/API telemetry test aktif dalam konteks kerja. Verifikasi dilakukan lewat jalur kode, i18n check, typecheck, build, dan pencarian literal.

Batch berikutnya yang siap dikerjakan bila diminta: Report dan ekspor.
