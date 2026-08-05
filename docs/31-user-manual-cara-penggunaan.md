# 31 - User Manual Cara Penggunaan

Status: Phase 1 documentation baseline  
Owner: Product + Support + QA/QC  
Last updated: 2026-08-05

## Tujuan Manual

Manual ini menjelaskan cara penggunaan PAMILO Smart Farming GIS untuk dua kelompok utama:

- Platform Admin: mengelola tenant, data awal, integrasi, dan kesiapan operasional.
- Farmer: mengelola farm, plot, perangkat ESP32, monitoring telemetry, cuaca BMKG, dan laporan.

Catatan status: UI repository saat ini masih baseline demo dan belum memiliki editor Leaflet gambar bebas penuh. Manual ini menggambarkan target pengalaman platform yang harus dicapai, sambil tetap selaras dengan kontrak API yang sudah dibuat.

## Peran Pengguna

| Peran | Hak akses utama |
| --- | --- |
| `platform_admin` | Membantu onboarding tenant, melihat status sistem, mengelola master data dan threshold yang sudah direview, membantu provisioning dan troubleshooting. |
| `farmer_owner` | Mengelola farm, plot, device, dan pengguna operator dalam tenant sendiri. |
| `farmer_operator` | Melihat farm, plot, device, telemetry, cuaca, dan laporan dalam tenant sendiri. Tidak provisioning device. |

## Masuk ke Platform

1. Buka:

   ```text
   https://sedayafarm.keycloud.id
   ```

2. Masukkan email dan password.
3. Pilih tenant aktif jika akun memiliki lebih dari satu tenant.
4. Setelah masuk, dashboard hanya menampilkan data milik tenant aktif.

Jika data tenant lain terlihat, hentikan penggunaan dan laporkan sebagai insiden keamanan.

## Platform Admin

### 1. Onboarding Tenant

1. Buat tenant farmer baru.
2. Buat user `farmer_owner` untuk tenant tersebut.
3. Pastikan email dan role sudah benar.
4. Minta farmer mengganti password awal dan mengaktifkan MFA saat fitur tersedia.

Data tenant tidak boleh digabung dengan tenant lain. Jangan membuat farm milik farmer A di tenant farmer B.

### 2. Menyiapkan Master Data Tanaman

Master crop awal:

| Crop code | Nama Indonesia | Nama Inggris |
| --- | --- | --- |
| `padi` | Padi | Rice |
| `jagung` | Jagung | Corn |
| `bawang_merah` | Bawang Merah | Shallot |
| `cabai` | Cabai | Chili |
| `sawit` | Kelapa Sawit | Palm Oil |

Untuk setiap varietas:

1. Pilih crop.
2. Masukkan nama varietas.
3. Masukkan sumber resmi atau dokumen agronomi.
4. Isi reviewer, versi, dan status.
5. Simpan sebagai `draft` sampai direview.

### 3. Menyiapkan Threshold Agronomi

Threshold aman untuk NPK, pH, moisture, EC, VWC, dan suhu tidak boleh dibuat sebagai angka universal. Setiap threshold harus memiliki:

- crop,
- varietas bila relevan,
- fase pertumbuhan,
- metric,
- unit,
- metode atau profil kalibrasi,
- konteks tanah bila tersedia,
- batas bawah atau batas atas,
- severity,
- durasi dan hysteresis,
- sumber,
- reviewer,
- versi,
- status.

Hanya threshold `verified` yang boleh dipakai untuk alert farmer-facing.

### 4. Monitoring Integrasi

Platform Admin memantau:

- API readiness,
- EMQX broker status,
- jumlah device online/offline,
- Redis latest telemetry,
- VictoriaMetrics history ingestion,
- BMKG cache freshness,
- Docker disk usage,
- GitHub Actions CI/CD status.

## Farmer Owner

### 1. Membuat Farm

1. Masuk sebagai farmer owner.
2. Buka panel Farm.
3. Pilih `Tambah Farm`.
4. Isi nama farm dan zona waktu.
5. Simpan.

Farm yang dibuat otomatis berada dalam tenant aktif.

### 2. Membuat Plot di Peta GIS

1. Pilih farm.
2. Buka mode gambar plot pada peta.
3. Klik titik-titik batas lahan mengikuti batas lapangan.
4. Tutup polygon pada titik awal.
5. Isi nama plot.
6. Isi atau pilih kode ADM4 jika sudah diketahui.
7. Simpan.

Sistem menghitung:

- luas dalam `m2`,
- luas dalam hektare,
- centroid,
- bounding box,
- status pemetaan ADM4.

Jika polygon saling berpotongan atau tidak tertutup, sistem akan menolak data dan meminta gambar ulang.

### 3. Memetakan ADM4 untuk Cuaca BMKG

ADM4 adalah kode wilayah administrasi tingkat desa/kelurahan yang dipakai BMKG untuk prakiraan cuaca.

1. Buka detail plot.
2. Periksa ADM4.
3. Jika status `needs_review` atau `unmapped`, minta admin memverifikasi lokasi.
4. Setelah ADM4 valid, panel Weather akan menampilkan prakiraan BMKG.

Jika ADM4 kosong, panel cuaca menampilkan status `missing`, bukan error.

### 4. Menambahkan Device ESP32

1. Pilih plot.
2. Buka panel Device.
3. Pilih `Provision`.
4. Isi serial number ESP32 dan label device.
5. Simpan.
6. Salin konfigurasi ke firmware/provisioning tool:
   - MQTT host: `mqtt.keycloud.id`
   - MQTT port: `8883`
   - protocol: `mqtts`
   - client ID,
   - MQTT username,
   - password satu kali tampil,
   - topic publish dan subscribe.

Password device ditampilkan satu kali. Jika hilang, revoke atau rotate credential.

### 5. Monitoring Telemetry

1. Pilih plot.
2. Panel Telemetry menampilkan nilai terakhir dari semua metric aktif.
3. Panel History menampilkan chart metric yang dipilih.
4. Untuk dynamic metric, sistem otomatis membuat kartu/chart ketika ESP32 mengirim variable baru yang valid.

Contoh variable yang bisa tampil otomatis:

- `soil_temperature`,
- `soil_moisture`,
- `soil_ph`,
- `leaf_wetness`,
- `tank_level`,
- metric custom lain yang lolos validasi.

Metric baru belum otomatis menjadi alert agronomi. Admin/agronomy reviewer harus memetakan metric ke threshold yang valid.

### 6. Membaca Cuaca BMKG

Panel Weather menampilkan:

- sumber data `BMKG`,
- status cache `fresh`, `stale`, atau `missing`,
- jam prakiraan,
- suhu,
- kelembapan,
- kondisi cuaca,
- angin,
- tutupan awan,
- jarak pandang.

Jika status `stale`, data terakhir masih ditampilkan tetapi perlu refresh worker/cache.

### 7. Revoke Device

Revoke device ketika:

- perangkat hilang,
- credential bocor,
- perangkat dipindah ke tenant/plot lain,
- perangkat rusak permanen.

Setelah revoke, device tidak boleh bisa publish telemetry baru.

## Farmer Operator

Farmer operator dapat:

- melihat farm dan plot,
- melihat device,
- melihat telemetry,
- melihat weather,
- membuka laporan.

Farmer operator tidak dapat:

- membuat farm atau plot,
- provision/revoke device,
- mengubah master data,
- mengubah threshold.

## Praktik Aman untuk Farmer

- Jangan membagikan password akun.
- Jangan mengirim credential MQTT lewat chat publik.
- Jangan memakai credential device yang sama untuk lebih dari satu ESP32.
- Jangan memindahkan device ke plot lain tanpa update di platform.
- Pastikan ESP32 memakai waktu UTC dari NTP agar history chart akurat.
- Laporkan segera jika device milik tenant lain terlihat.

## Checklist Setelah Onboarding

- Tenant dibuat.
- Farmer owner bisa login.
- Minimal satu farm dibuat.
- Minimal satu plot valid dibuat.
- ADM4 plot sudah diverifikasi atau ditandai `needs_review`.
- Minimal satu device provisioned.
- ESP32 berhasil connect ke `mqtt.keycloud.id:8883`.
- Telemetry latest muncul.
- History chart muncul untuk metric numeric.
- Weather BMKG muncul untuk plot dengan ADM4 valid.

