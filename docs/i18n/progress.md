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

## Batch 07 Status

Status: completed for Report page and available client-side report outputs.

Perubahan Batch 07:

- Melokalisasi `apps/web/src/views/tenant/Report.vue` untuk filter Tanggal Mulai/Start Date, Tanggal Akhir/End Date, Perangkat/Device, Dataset, Interval, Refresh, tabel telemetry/cuaca/peringatan, loading/empty/updating state, validasi rentang tanggal, pagination, dan aria label pagination.
- Memperluas katalog `apps/web/src/i18n/id.json` dan `apps/web/src/i18n/en.json` dengan namespace `reports.*` untuk header tabel, dataset, sampling interval, status metrik, severity alert, pesan ekspor, print summary, dan error report.
- Mengganti label metrik hard-coded di laporan dengan registry bersama `apps/web/src/i18n/metrics.ts`; metric key/payload tetap menjadi identitas data dan tidak diterjemahkan.
- Mengganti formatter lokal `id-ID` di Report dengan formatter bersama untuk tanggal, angka, persen, dan jumlah data. Nilai mentah metrik disimpan di row dan diformat saat render/ekspor agar locale switch tidak perlu refetch.
- Menggunakan adapter cuaca bersama `apps/web/src/i18n/weather.ts` untuk kondisi cuaca, arah/kecepatan angin, dan deteksi hujan/petir pada alert sintetis. Nama lokasi, ADM4, source backend, perangkat, plot, dan nilai data tetap asli.
- Melokalisasi output laporan yang benar-benar tersedia: CSV human-readable dan HTML cetak yang dibuka melalui tombol PDF/browser print. Header, judul, ringkasan periode, status, severity, pesan alert, timestamp pembuatan pada HTML cetak, dan nama file CSV memakai bahasa aktif saat diminta.
- Menambahkan `locale` eksplisit ke query history Report di samping header locale dari `apiClient`. Tidak ditemukan generator backend, background job, cache laporan, spreadsheet XLSX, PDF native, atau ekspor raw mesin dalam repo ini.
- Locale switch membangun ulang row turunan dari cache respons terakhir tanpa request ulang, sehingga filter, tanggal, perangkat, dataset, interval, page size, current page, dan data yang sedang terbuka tetap bertahan.

Pemeriksaan aktual Batch 07:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 342 keys, 241 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| Pencarian literal Report utama dengan `rg` | Tidak menemukan string UI lama utama seperti `Start Date`, `Data Logs`, `Memuat data report`, `Popup PDF`, `Preview data export`, atau formatter hard-coded `id-ID` di `Report.vue`; hasil tersisa hanya nama variabel seperti `sampledRows` |

Verifikasi perilaku Batch 07:

- Format yang dipetakan dari kode hanya CSV dan printable HTML/browser print dari tombol PDF. Tidak ada generator PDF native, spreadsheet XLSX, gambar chart, background job, cache laporan, atau endpoint ekspor khusus di repo yang bisa dilokalisasi.
- CSV tetap memakai koma sebagai delimiter dan semua sel di-quote, sehingga angka/desimal lokal yang mengandung koma aman sebagai satu sel. Ekspor raw mesin tidak ada; karena itu tidak ada schema/header kontraktual mesin yang diubah.
- Jumlah record, nilai numerik mentah, timestamp asal, device UID, plot/lokasi, ADM4, dan source backend tidak diubah oleh locale. Perubahan bahasa hanya mengganti label, format tampilan, dan kalimat aplikasi.
- Request Report EN lalu UI diganti ke ID saat data sudah terbuka tidak memicu fetch ulang; row turunan direbuild dari cache dengan bahasa baru. Tidak ada background job asinkron; output ekspor memakai bahasa aktif pada saat tombol CSV/PDF ditekan.
- Popup print/PDF yang diblokir browser menampilkan pesan error lokal. Empty report di halaman dan HTML cetak memakai bahasa aktif.

Keterbatasan verifikasi:

- Tidak menjalankan browser end-to-end dengan akun nyata atau dataset database aktif, sehingga sampel file CSV/print ID dan EN tidak benar-benar diunduh dari data backend lokal. Verifikasi dilakukan lewat jalur kode, i18n check, typecheck, build, dan pencarian literal.
- Tidak ada service/generator laporan backend untuk diuji terkait job queue/cache/HTTP cache. Jika fitur itu berada di repositori lain, perubahan yang diperlukan adalah menyimpan `locale` bersama parameter request, menambahkan locale ke cache key, dan melokalisasi template server dengan katalog yang setara.

Batch berikutnya yang siap dikerjakan bila diminta: MQTT dan Perangkat.

## Batch 08 Status

Status: completed for MQTT module localization and sensor connection UI.

Perubahan Batch 08:

- Melokalisasi `apps/web/src/views/tenant/MQTT.vue` untuk kartu broker MQTT, endpoint WebSocket, subscription aktif, pencarian, tombol tambah topic, header tabel, badge status, aksi, empty state, modal tambah topic, validasi, dan konfirmasi hapus.
- Menambahkan katalog `mqtt.*` di `apps/web/src/i18n/id.json` dan `apps/web/src/i18n/en.json` untuk endpoint native TLS, transport telemetry, placeholder `Cari perangkat, topic, atau metric key` / `Search devices, topics, or metric keys`, status terhubung/terputus/menghubungkan, tooltip lihat/hapus/salin, dan pesan copy berhasil/gagal.
- Menambahkan detail modal MQTT yang membaca cache `telemetryStore` untuk menampilkan status koneksi, jumlah key, dynamic key asli, dan raw payload read-only. Tombol salin topic/payload menyalin string asli tanpa menerjemahkan atau mengubah payload.
- Memakai formatter bersama untuk jumlah topic aktif, jumlah key, waktu pesan terakhir, dan waktu relatif; formatter `Intl.DateTimeFormat("id-ID")` lokal di halaman MQTT dihapus.
- Menjaga hostname, port/URI, MQTT topic, device ID, tenant ID dalam topic, QoS value, metric key, raw JSON payload, status source enum, dan isi protokol tetap sebagai nilai asli.
- Status subscription tetap memakai kode stabil `active`/`paused` di data tersimpan dan dipetakan ke label katalog saat render. Status koneksi realtime memakai `telemetryStore.connectionState` tanpa watcher locale yang memanggil connect/disconnect, publish, subscribe/unsubscribe, atau autentikasi broker.
- Dynamic keys tetap menampilkan key teknis asli; bila metric key dikenal, label ramah bilingual ditambahkan sebagai teks pendamping, bukan pengganti key mentah.

Pemeriksaan aktual Batch 08:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 407 keys, 286 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| Pencarian literal MQTT utama dengan `rg` | Tidak menemukan literal lama utama di `MQTT.vue` seperti `Cari device`, `Tambah Topic`, `Tambah MQTT Topic`, `Hubungkan topic`, `Last Message`, `Dynamic Keys`, `Native MQTT TLS endpoint`, `Frontend telemetry transport`, atau `id-ID` |

Verifikasi perilaku Batch 08:

- Locale switch memperbarui label MQTT dari computed/template dan tidak mengubah `searchQuery`, `topicForm`, modal terbuka, `selectedSubscriptionId`, subscription tersimpan, telemetry cache, atau auth state.
- Detail modal memakai data telemetry yang sudah ada di store; membuka/menutup detail dan mengganti bahasa tidak menambah request, subscription, atau koneksi MQTT/SSE.
- Copy topic dan copy payload memakai nilai mentah yang sama dengan UI/protokol. Raw payload tidak diterjemahkan, tidak diparse ulang untuk dikirim, dan tidak dimutasi.
- Hapus subscription memakai dialog konfirmasi lokal tetapi hanya menghapus daftar lokal halaman setelah user mengonfirmasi; tidak memutus subscription produksi atau memanggil broker.
- Empty state daftar dan hasil pencarian, validasi Device ID/topic, serta feedback simpan/update/hapus/copy tersedia dalam ID dan EN.

Keterbatasan verifikasi:

- Tidak menjalankan browser end-to-end dengan broker produksi atau akun nyata. Skenario telemetry masuk saat language switch diverifikasi lewat jalur kode: render bergantung pada computed dari store yang sudah ada dan tidak ada watcher locale yang memanggil operasi koneksi.
- Clipboard success/failure tidak diuji di browser nyata; handler dan fallback error diverifikasi lewat typecheck/build.
- Halaman `/devices` tetap belum dimigrasikan pada batch ini karena instruksi aktif memfokuskan seluruh modul MQTT. Baris Devices di coverage tetap `not_started` untuk batch berikut yang sesuai.

Batch berikutnya yang siap dikerjakan bila diminta: Perangkat atau Master Data, sesuai urutan batch yang ingin dilanjutkan.

## Batch 09 Status

Status: completed for Perangkat page and available sensor profile flows.

Catatan penomoran: instruksi aktif pengguna menamai pekerjaan ini `BATCH 09: Perangkat dan profil sensor`. Roadmap awal di dokumen audit menempatkan Master Data pada Batch 09; pekerjaan Master Data belum dijalankan dan tetap menunggu instruksi batch berikutnya.

Perubahan Batch 09:

- Melokalisasi `apps/web/src/views/tenant/Devices.vue` untuk ringkasan Total Perangkat/Total Devices, Terhubung/Online, Plot Aktif/Active Plots, pencarian, filter Semua Status/All Statuses, tombol Tambah Perangkat/Add Device, loading/error/empty state, header tabel, status badge, baterai, dan waktu terakhir terhubung.
- Menambahkan namespace `devices.*` di `apps/web/src/i18n/id.json` dan `apps/web/src/i18n/en.json` untuk form tambah perangkat, helper, validasi, status, profil sensor sistem, detail perangkat, copy Device UID/topic, konfirmasi hapus, serta feedback berhasil/gagal.
- Menambahkan detail modal read-only untuk perangkat yang menampilkan Device UID, status, plot/area terpasang, profil sensor, terakhir terhubung, baterai, dan telemetry topic tanpa mengubah data atau memanggil API tambahan.
- Menambahkan tombol salin Device UID dan telemetry topic. Nilai yang disalin tetap string asli, bukan label terjemahan.
- Menambahkan konfirmasi hapus lokal sebelum memanggil `deleteDevice`; pengujian tidak menyentuh data produksi.
- Memakai formatter bersama untuk jumlah perangkat/plot, tanggal terakhir terhubung, dan angka persentase baterai. Nilai baterai `0` tetap tampil `0%`, `100` tetap `100%`, dan nilai null/tidak valid tampil `-`.
- Memisahkan label profil sensor sistem dari nilai canonical. Nilai `Custom Payload` tampil sebagai `Payload Kustom` / `Custom Payload`, sementara nama profil custom pengguna tetap ditampilkan apa adanya.
- Memperbarui `apps/web/src/stores/deviceStore.ts` agar fallback error lokal memakai key terjemahan reaktif dan hitungan Plot Aktif tidak menghitung perangkat tanpa plot.
- Memperbarui `docs/i18n/glossary.md` untuk konsistensi status perangkat: ringkasan memakai `Terhubung` / `Online`, badge status memakai `Online`, `Offline`, dan `Perawatan` / `Maintenance`.

Pemeriksaan aktual Batch 09:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 468 keys, 328 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| Pencarian literal Devices utama dengan `rg` | Tidak menemukan literal lama utama di `Devices.vue`/`deviceStore.ts` seperti `Total Perangkat`, `Cari device`, `Tambah Perangkat`, `Assigned Plot`, `Sensor Profile`, `Last Seen`, `Memuat perangkat`, atau formatter hard-coded `id-ID` sebagai teks user-facing |

Verifikasi perilaku Batch 09:

- Locale switch memperbarui label Devices dari computed/template dan tidak mengubah `searchQuery`, `statusFilter`, `selectedDeviceId`, `deviceForm`, `plotId`, pilihan profil sensor, status enum, atau telemetry topic draft.
- Submit tambah perangkat tetap mengirim nilai canonical yang sama: `deviceUid`, `displayName`, `plotId`, `status` (`online`/`offline`/`maintenance`), `metadata.sensorProfile`, `metadata.batteryPercent`, dan `telemetryTopic`.
- Status online/offline/maintenance dipetakan dari enum tersimpan; enum tidak diterjemahkan atau dikirim sebagai label.
- Device UID, telemetry topic, plot ID/nama plot, timestamp, dan nama profil custom pengguna tetap dipertahankan. Profil sistem yang dikenal hanya diberi label tampil bilingual.
- Tidak ada operasi edit perangkat di active UI/API (`deviceRoutes.ts` hanya menyediakan GET/POST/DELETE), sehingga edit flow dicatat tidak tersedia pada batch ini.

Keterbatasan verifikasi:

- Tidak menjalankan browser end-to-end dengan akun nyata atau database fixture aktif. Skenario online/offline, baterai 0/100/null, perangkat tanpa plot, profil custom, dan validasi gagal diverifikasi lewat jalur kode, i18n check, typecheck, build, dan inspeksi transform payload.
- Tombol hapus tidak diuji terhadap data produksi. Handler hanya memanggil DELETE setelah konfirmasi user.
- Pesan backend Device API lengkap tetap menjadi Batch 13; Batch 09 melokalisasi fallback client dan mempertahankan pesan API mentah bila backend mengembalikan `message`.

Batch berikutnya yang siap dikerjakan bila diminta: Master Data.

## Batch 10 Status

Status: completed for Master Data Crop Types and Thresholds. Zona & Area remains deferred to Batch 11 per active instructions.

Catatan penomoran: instruksi aktif pengguna menamai pekerjaan ini `BATCH 10: Master Data: tanaman dan ambang batas`. Roadmap awal di dokumen audit menempatkan User Tenant pada Batch 10; pekerjaan User Tenant belum dijalankan.

Perubahan Batch 10:

- Melokalisasi `apps/web/src/views/tenant/MasterData.vue` untuk judul Master Data Agronomi/Agronomy Master Data, deskripsi, tab, tombol tambah tanaman, kartu daftar crop, detail crop, status aktif/draft/diarsipkan, tombol edit/hapus/simpan, modal tambah/edit tanaman, validasi crop, dan tabel Threshold Matrix.
- Menambahkan namespace `masterData.*` di `apps/web/src/i18n/id.json` dan `apps/web/src/i18n/en.json` untuk label tanaman, nama ilmiah, varietas, deskripsi, tanggal tanam, umur tanaman, durasi budidaya, progres, estimasi panen, rentang min/max, status, validasi, konfirmasi hapus, dan feedback simpan.
- Mengganti formatter lokal Master Data dengan formatter bersama untuk tanggal, angka, persen progres, dan HST/DAP. Tooltip umur tanaman menjelaskan `Hari setelah tanam (HST)` / `Days after planting (DAP)`.
- Menggunakan registry metrik bersama `apps/web/src/i18n/metrics.ts` untuk label threshold pH, kelembapan tanah, nitrogen, fosfor, dan kalium. Tidak ada threshold EC/suhu di kontrak `ThresholdKey` saat ini, sehingga tidak ditambahkan sebagai field baru.
- Menambahkan parsing input threshold yang menerima desimal titik atau koma untuk nilai sederhana seperti `5.5` dan `5,5`, lalu menyimpan nilai numerik canonical. Parsing tidak melakukan replace global ribuan/desimal yang berisiko salah.
- Menambahkan validasi client untuk nama tanaman wajib, durasi budidaya harus angka > 0, nilai threshold harus angka, dan min tidak boleh lebih besar dari max.
- Menyelaraskan subtitle route Master Data di `apps/web/src/router/index.ts` dan `routes.masterDataSubtitle`.
- Tidak menambah schema bilingual crop karena kontrak/database aktif hanya menyediakan `name` dan `description` tanpa ID katalog sistem yang stabil. Nama/deskripsi crop dari database tetap dipertahankan sebagai konten tenant/user.

Pemeriksaan aktual Batch 10:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 524 keys, 371 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| Pencarian literal Master Data crop/threshold dengan `rg` | Tidak menemukan literal lama utama di `MasterData.vue`/router seperti `Master Data Agronomi`, `Crop Types`, `Threshold Matrix`, `Tanggal Tanam`, `Simpan Threshold`, `Perubahan threshold`, `Tambah Crop`, `Hapus crop`, atau formatter hard-coded `id-ID` |

Verifikasi perilaku Batch 10:

- Locale switch memperbarui label Crop Types dan Threshold dari computed/template dan tidak mengubah `activeTab`, `selectedCropId`, draft crop form, draft threshold, relasi plot, status enum, atau nilai threshold.
- Submit crop tetap mengirim payload canonical: `name`, `latinName`, `description`, `plantingDate`, `plantingPeriodDays`, `status`, `thresholdSource`, dan `varieties`; label terjemahan tidak dikirim.
- Submit threshold tetap mengirim nilai min/max numerik atau `null`, unit asli, dan key threshold asli. Nilai min/max, rumus HST/DAP, progres, periode tanam, dan estimasi panen tidak berubah karena locale.
- Nama ilmiah, varietas, nama tanaman custom, deskripsi user, dan threshold source tetap dari sumber data; tidak diterjemahkan otomatis.
- Zona & Area dan Polygon editor tidak dimigrasikan pada batch ini selain label tab/tombol umum yang terlihat di header Master Data; coverage dipindah ke Batch 11.

Keterbatasan verifikasi:

- Tidak menjalankan browser end-to-end dengan database uji aktif. Simpan/edit/hapus crop dan threshold diverifikasi melalui jalur kode, typecheck, build, dan pemeriksaan payload transform, bukan request nyata.
- Tidak ada katalog crop sistem dengan ID stabil di schema/API aktif. Contoh seperti Cabai Rawit/Bird's Eye Chili tidak bisa dipetakan dengan aman tanpa schema/seed aditif di batch khusus data katalog.
- Pesan backend Crop/Plot API lengkap tetap menjadi Batch 13; Batch 10 melokalisasi validasi dan feedback client yang tersedia.

Batch berikutnya yang siap dikerjakan bila diminta: Master Data Zona & Area.

## Batch 11 Status

Status: completed for Master Data Zona & Area and the available location polygon editor.

Perubahan Batch 11:

- Melokalisasi tab Zona & Area di `apps/web/src/views/tenant/MasterData.vue`: header tabel, label tanaman tidak dipilih, empty/loading state, aria label edit/hapus, konfirmasi hapus, feedback tambah/edit/hapus, dan format luas hektare memakai locale aktif.
- Melokalisasi modal Tambah/Edit Zona / Area: Nama Zona / Area, Luas (ha), Tanaman/Crop, BMKG ADM4, Poligon Lokasi/Location Polygon, Kembali/Back, Simpan Area/Save Area, teks bantuan relasi zona-tanaman-BMKG, validasi nama/luas/poligon, dan tombol tutup.
- Melokalisasi `apps/web/src/components/maps/PolygonMapEditor.vue`: Peta/Map, Satelit/Satellite, tooltip layer, tooltip zoom Leaflet, petunjuk menggambar/menyelesaikan poligon, Kembali/Back, Urungkan/Undo, Hapus/Clear, jumlah titik, Simpan Poligon/Save Polygon, dan error gagal memuat layer peta.
- Mengubah kontrol zoom Leaflet menjadi `L.control.zoom()` dengan title dari katalog dan memperbaruinya saat locale berubah tanpa membuat map instance kedua. Atribusi OpenStreetMap/Esri dan nama tempat pada tiles tetap dipertahankan.
- Memperbarui `apps/web/src/stores/masterDataStore.ts` agar fallback error master data memakai translation key reaktif, sehingga pesan client ikut berubah saat locale diganti.
- Menjaga payload area tetap canonical: `name`, `areaHectares` number/null, `cropId`, `bmkgAdm4Code`, dan `polygonGeojson`. Nama area/tanaman milik user, ID, ADM4, koordinat, urutan vertex, dan GeoJSON tidak diterjemahkan.

Pemeriksaan aktual Batch 11:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 573 keys, 405 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| Pencarian literal Zona/Area dan Polygon utama dengan `rg` | Tidak menemukan literal lama utama sebagai teks user-facing di `MasterData.vue`, `PolygonMapEditor.vue`, atau `masterDataStore.ts`; hasil tersisa adalah nama tipe/variabel seperti `ApiCrop`/`CropPayload` |

Verifikasi perilaku Batch 11:

- Locale switch memperbarui label Zona & Area, modal, validasi, feedback, layer button, dan zoom tooltip dari computed/template tanpa fetch ulang dan tanpa mengubah `activeTab`, draft form, modal terbuka, crop terpilih, BMKG ADM4, luas, atau draft polygon.
- `PolygonMapEditor` hanya mengganti zoom control Leaflet pada perubahan locale; map instance, base layer aktif, titik polygon, center, dan zoom tidak dibuat ulang. `renderPolygon()` tidak dipanggil oleh watcher locale.
- Submit area dari tombol form atau tombol Simpan Poligon menjalankan validasi yang sama dan mengirim polygon GeoJSON yang sama dari draft saat ini. Nilai luas tampilan diformat dari `areaHectares`, tetapi payload tetap number/null.
- Tidak ditemukan Leaflet Draw atau plugin editor geometri pihak ketiga di repo. Fitur edit/hapus poligon yang tersedia adalah kontrol aplikasi `Undo` dan `Clear`; keduanya dilokalisasi. Tidak ada aturan geometri/agronomi baru yang ditambahkan.

Keterbatasan verifikasi:

- Tidak menjalankan browser end-to-end dengan akun/database fixture aktif, sehingga create/update/delete plot tidak ditembakkan ke backend lokal. Verifikasi dilakukan lewat jalur kode, i18n check, typecheck, build, diff, dan pemeriksaan payload transform.
- Pesan backend Plot/Crop API seperti `Crop not found`, `Empty update`, dan konflik perangkat masih menjadi Batch 13. Batch 11 melokalisasi fallback dan validasi client yang tersedia.

Batch berikutnya yang siap dikerjakan bila diminta: Pengguna Tenant atau Pengaturan, sesuai urutan batch aktif berikutnya yang dikirim.

## Batch 12 Status

Status: completed for AI Recommendations UI and new bilingual AI recommendation content contract.

Perubahan Batch 12:

- Melokalisasi `apps/web/src/views/tenant/AiRecommendation.vue` untuk filter Zona/Area, Tanggal Mulai/Start Date, Tanggal Akhir/End Date, jumlah baris telemetri, tombol Buat Rekomendasi/Generate Recommendations, status pemrosesan, validasi tanggal/baris telemetry, error state, empty state, dan formatter waktu/angka.
- Melokalisasi Konteks Cuaca/Weather Context, Saat Ini/Current, peluang hujan, kelembapan, refresh weather, Catatan Lapang/Field Notes, placeholder catatan, Ringkasan Rekomendasi/Recommendation Summary, Peringatan Risiko/Risk Alerts, Pemupukan/Fertilization, Penanganan OPT/Pest and Disease Management, Irigasi/Irrigation, Optimalisasi Panen/Harvest Optimization, Kesenjangan Data/Data Gaps, serta label Rendah/Sedang/Tinggi dan Low/Medium/High.
- Menggunakan adapter cuaca bersama `apps/web/src/i18n/weather.ts` untuk memilih `condition` atau `conditionEn` tanpa menerjemahkan ulang teks BMKG, dan memakai formatter bersama untuk persen, angka, suhu, serta waktu dibuat.
- Memperbarui `apps/web/src/stores/aiRecommendationStore.ts` agar request Generate mengirim `locale` eksplisit, error fallback memakai katalog reaktif, dan `localizedResponse` memilih varian `recommendations.id` atau `recommendations.en` dari respons yang sudah tersimpan saat dropdown berubah. Pergantian bahasa tidak memanggil AI lagi.
- Memperbarui `apps/api/src/routes/aiRecommendationRoutes.ts` agar satu panggilan provider menghasilkan satu analisis dengan dua varian terstruktur `recommendations.id` dan `recommendations.en`. Field lama `recommendation` tetap dikembalikan berisi varian sesuai locale request untuk kompatibilitas klien lama.
- Menambahkan metadata respons: `contentLocales`, `contentVersion`, dan `generatedLocale`. Parser backend memvalidasi kesetaraan struktur dasar: confidence sama, jumlah data gaps sama, jumlah risk alerts sama, severity sama, jumlah item rekomendasi sama, priority/confidence/action count sama.
- Melokalisasi pesan API AI untuk provider belum dikonfigurasi, plot tidak ditemukan, timeout provider, dan provider gagal. `error` code tetap stabil.
- Menaikkan default `AI_RECOMMENDATION_MAX_TOKENS` dari 1600 ke 3200 agar output bilingual JSON tidak mudah terpotong; tetap bisa dioverride env dan tetap dibatasi maksimum existing 4000.

Pemeriksaan aktual Batch 12:

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run i18n:check` di `apps/web` | Lulus: 622 keys, 445 used keys |
| `npm run typecheck` di `apps/web` | Lulus |
| `npm run build` di `apps/web` | Lulus, tetap ada warning baseline chunk JS > 500 kB |
| `npm run typecheck` di `apps/api` | Lulus |
| `npm run build` di `apps/api` | Lulus |
| Pencarian literal AI utama dengan `rg` | Tidak menemukan literal UI lama utama di `AiRecommendation.vue`/`aiRecommendationStore.ts`; hasil `rows` hanya bagian key `rowsOption` |

Verifikasi perilaku Batch 12:

- Locale switch memperbarui label AI dari computed/template dan memilih varian rekomendasi tersimpan dari `lastResponse`; tidak mengubah `filters.plotId`, tanggal mulai/akhir, `telemetryLimit`, `farmerNotes`, weather config aktif, auth state, atau memanggil endpoint AI.
- Generate mengirim payload canonical yang sama untuk data agronomi, ditambah `locale` aditif. Nama model/provider, nama lahan, crop/varietas/nama ilmiah, ADM4, metric key, catatan user, ID, timestamp, unit, dan angka sumber tetap dipertahankan.
- Backend meminta output bilingual dalam satu panggilan provider dan menolak respons tanpa varian English atau respons bilingual yang struktur/enum pentingnya berbeda. Tidak ada dua analisis agronomi independen.
- Respons lama single-locale yang mungkin masih berada di memory client tetap dapat ditampilkan dengan penanda bahasa sumber/varian belum tersedia, bukan disamarkan sebagai terjemahan lengkap.

Keterbatasan verifikasi dan riwayat:

- Repo ini tidak memiliki tabel, endpoint, cache, atau UI riwayat rekomendasi AI. Karena itu inventaris/backfill riwayat lama dan aksi `Terjemahkan rekomendasi/Translate recommendation` untuk arsip tersimpan tidak bisa dijalankan di repo ini dan dicatat not_applicable/blocked sampai storage riwayat ada.
- Tidak menjalankan panggilan AI nyata atau penerjemahan massal berbayar. Verifikasi provider dilakukan melalui schema/prompt/parser/typecheck/build, bukan request eksternal.
- Tidak ada test runner unit di manifest. Fixture mocked provider untuk bilingual valid, ID-only, EN-only, angka berbeda, dan timeout belum diotomasi sebagai test; validasi parser dan kontrak dicek lewat typecheck/build dan inspeksi jalur kode.

Batch berikutnya yang siap dikerjakan bila diminta: Pengguna Tenant, Pengaturan, Super Admin, atau Backend API messages sesuai instruksi batch aktif berikutnya.
