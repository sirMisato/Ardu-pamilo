# PAMILO i18n Acceptance Scenarios

Skenario ini menjadi acuan implementasi Batch 01-15. Batch 00 hanya mendokumentasikan.

## Lintas Fitur

1. Default bahasa untuk tamu dan user baru adalah `id`.
2. Dropdown bahasa menampilkan urutan persis:
   - `EN - English`
   - `ID - Indonesia`
3. Value dropdown adalah `en` dan `id`; label pilihan tidak berubah saat bahasa aktif berubah.
4. Dropdown tersedia di desktop dan mobile untuk area tenant, super admin, dan auth/guest.
5. Mengganti bahasa memperbarui teks komponen yang sedang terbuka tanpa logout, navigasi ulang, atau refresh.
6. Mengganti bahasa tidak mereset filter, tab, tanggal, pagination, form draft, polygon draft, posisi peta, pilihan perangkat/lahan, session login, atau subscription realtime.
7. Locale format memakai `id-ID` untuk ID dan `en-US` untuk EN tanpa mengubah timezone, satuan, mata uang, nilai mentah, presisi, atau timestamp.
8. Missing key terlihat pada dev/CI dan tidak tampil sebagai raw key di UI.
9. Satu akun tidak mewarisi preferensi bahasa akun lain pada browser yang sama.
10. Kegagalan sinkronisasi preferensi server tidak membuat dropdown terkunci.

## Auth dan Layout

1. Tenant login dan super admin login menerjemahkan label, placeholder, tombol, loading, error, password visibility aria-label, dan link terkait.
2. Link lupa kata sandi yang belum punya backend tetap dicatat sebagai unavailable/not implemented, bukan mengarah ke fitur palsu.
3. Sidebar, bottom navigation, topbar title/subtitle, profile menu, logout, search/notification aria-label, dan role label berubah bahasa.
4. Read-only tenant tetap hanya melihat Dashboard, AI Rekomendasi, Weather Station, Grafik, dan Report.

## Dashboard dan Peta

1. Dashboard cards, crop detail, progress, metric cards, empty/loading/error state, dan trend text berubah bahasa.
2. FieldMap mengganti label layer, title, connection badge, popup status, dan last update text tanpa recreate map.
3. Posisi/zoom map, active layer, polygon, marker, dan SSE telemetry tetap bertahan saat bahasa berubah.

## AI Rekomendasi

1. Filter, catatan lapang, weather context, loading, empty state, section titles, labels confidence/priority/severity, dan data gap diterjemahkan.
2. Prompt backend mengikuti locale request untuk hasil baru.
3. Hasil AI lama tidak diterjemahkan otomatis; jika riwayat disimpan nanti, tampilkan sesuai generated locale atau beri label fallback.
4. User notes tetap sesuai bahasa asli yang diketik user.

## Weather Station

1. Tab Prakiraan Cuaca, Report Bulanan, dan Konfigurasi diterjemahkan.
2. Kondisi cuaca memakai `condition` untuk ID dan `conditionEn` untuk EN jika tersedia.
3. BMKG, ADM4, URL endpoint, dan attribution tetap dipertahankan.
4. Monthly report mempertahankan bulan, page, page size, filter, dan active tab saat bahasa berubah.
5. Config form mempertahankan draft nama, field, ADM4, endpoint, catatan, status aktif, dan mode edit.

## Grafik

1. Filter device/interval, refresh/loading/info/error state, empty state, chart cards, threshold label, tooltip, dan axis time diterjemahkan.
2. Dataset chart tidak di-fetch ulang hanya karena bahasa berubah.
3. Metric key mentah tetap tersedia, label metrik yang dikenal diterjemahkan.

## Report dan Ekspor

1. Filter date/device/dataset/interval, tabel telemetry/weather/alerts, pagination, rows label, loading/empty/error state diterjemahkan.
2. CSV header dan PDF HTML report mengikuti bahasa aktif.
3. Data record seperti timestamp, device ID, plot name, ADM4, topic, source, metric key, dan user content tidak diterjemahkan.
4. Pagination, page size, dataset, dan date range tidak berubah saat bahasa berubah.

## MQTT dan Perangkat

1. MQTT cards, search placeholder, table header, status badge, modal tambah topic, aria-label, dan form labels diterjemahkan.
2. Perangkat cards, search/status filter, table, add modal, helper text, status, dan empty/loading/error state diterjemahkan.
3. Topic MQTT, QoS, broker host, device UID, telemetry topic, credential, dan metric key preview tetap dipertahankan.

## Master Data

1. Tab Crop Types, Zona & Area, Threshold diterjemahkan.
2. Crop detail, crop modal, threshold save message, status options, area modal, polygon editor controls, confirmation dialog, and empty/loading/error state diterjemahkan.
3. Nama crop, varietas, latin name, deskripsi user, threshold source user, polygon coordinates, and ADM4 tetap dipertahankan.
4. HST tampil sebagai DAP pada EN tanpa mengubah rumus usia tanaman.
5. Draft threshold, selected crop, active tab, and polygon draft tidak hilang saat bahasa berubah.

## User Tenant

1. Summary cards, search, table, modal, role/status labels, password placeholder, success/error messages, and delete confirmation diterjemahkan.
2. Nama user dan email tidak diterjemahkan.
3. Read-only route access tetap sama.

## Pengaturan

1. Tab Profil, Tampilan, Notifikasi, Keamanan, dan Reset Semua Sistem diterjemahkan.
2. Profile/display/notification/security/reset form labels, validation, success/error messages, and reset modal diterjemahkan.
3. Token `RESET PAMILO` tetap literal.
4. Draft form dan active tab tidak berubah saat bahasa berubah.

## Super Admin

1. Super admin login, layout, navigation, dashboard, system health, tenant license table, filters, inline edit, create modal, save/revoke actions, and empty/loading/error state diterjemahkan.
2. Tenant name, owner email, tenant ID, quota numbers, license dates, and stored license enum values tetap dipertahankan.
3. Draft inline license edits dan create modal tidak berubah saat bahasa berubah.

## Backend API

1. API menerima locale per request secara aditif dan memvalidasi hanya `id`/`en`.
2. `message` yang user-facing diterjemahkan.
3. `error` code, enum tersimpan, JSON key, table/column, ID, and tenant isolation tetap kompatibel.
4. Tidak ada global mutable locale di server.
5. Locale tidak memengaruhi otorisasi atau tenant context.

## Batch 15 Verification Closeout

1. Katalog ID/EN, placeholder, nilai kosong, dan key literal terpakai diverifikasi dengan `npm run i18n:check`.
2. Dropdown global diverifikasi dari kode untuk urutan, value, label tetap, persistensi, invalid locale, dan fallback storage; trigger mobile/desktop sekarang menampilkan label aktif penuh.
3. Pemeriksaan build/typecheck web dan API lulus; tidak ada script lint/test di manifest aktif.
4. Browser E2E lintas semua menu belum diverifikasi di lingkungan ini karena tidak tersedia Playwright/Chrome/Edge/Chromium dan tidak ada fixture DB. Status ini dicatat sebagai blocked, bukan passed.
5. PWA manifest bilingual dan riwayat AI tetap blocked/not_applicable sesuai `exceptions.md`.
