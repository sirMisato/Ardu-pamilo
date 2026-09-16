# PAMILO i18n Glossary

Gunakan istilah ini secara konsisten di katalog `id` dan `en`. Brand, kode, dan data pengguna tetap dipertahankan sesuai sumber.

## Bahasa

| Key concept | ID | EN | Catatan |
| --- | --- | --- | --- |
| Language option EN | EN - English | EN - English | Label tetap sama pada semua bahasa |
| Language option ID | ID - Indonesia | ID - Indonesia | Label tetap sama pada semua bahasa |
| Indonesian locale | id-ID | id-ID | Formatter display untuk `id` |
| English locale | en-US | en-US | Formatter display untuk `en` |

## Menu Utama

| ID | EN |
| --- | --- |
| Dashboard | Dashboard |
| AI Rekomendasi | AI Recommendations |
| Weather Station | Weather Station |
| Grafik | Charts |
| Report | Reports |
| MQTT | MQTT |
| Perangkat | Devices |
| Master Data | Master Data |
| User Tenant | Tenant Users |
| Pengaturan | Settings |

## Weather Station

| ID | EN | Catatan |
| --- | --- | --- |
| Prakiraan Cuaca | Weather Forecast | Tab weather |
| Report Bulanan | Monthly Report | Tab weather |
| Konfigurasi | Configuration | Tab weather |
| Histori Cuaca | Weather History | Tabel riwayat |
| Cuaca Saat Ini | Current Weather | Ringkasan current |
| Suhu | Temperature | Unit tetap Celsius |
| Kelembapan | Humidity | Persen |
| Curah Hujan | Rainfall | mm |
| Peluang Hujan | Rain Chance | Persen |
| Angin | Wind | `km/j` di ID, `km/h` di EN |
| Tutupan Awan | Cloud Cover | Persen |
| Kondisi | Condition | Teks BMKG |
| BMKG | BMKG | Jangan diterjemahkan |
| ADM4 | ADM4 | Jangan diterjemahkan |

## Agronomi dan Lahan

| ID | EN | Catatan |
| --- | --- | --- |
| Lahan | Field | Untuk field operasional/peta |
| Zona / Area | Zone / Area | Sesuai UI Master Data |
| Jenis Tanaman | Crop Type | Current UI memakai Crop Type |
| Tanaman | Crop | Konteks umum |
| Varietas | Variety | Data user, jangan auto-translate nilainya |
| Nama ilmiah | Scientific Name | Nilai latin dipertahankan |
| Tanggal Tanam | Planting Date |  |
| Periode Tanam | Planting Period |  |
| Umur Tanaman | Crop Age |  |
| HST | DAP | Days after planting |
| Estimasi Panen | Harvest Estimate |  |
| Fase Vegetatif | Vegetative Stage |  |
| Fase Generatif | Generative Stage |  |
| Panen | Harvest |  |
| Ambang Batas | Threshold |  |
| Sumber Threshold | Threshold Source |  |

## Metrik Sensor

| Metric key | ID label | EN label | Unit |
| --- | --- | --- | --- |
| ph | pH | pH | range |
| moisture | Kelembapan Tanah | Soil Moisture | % |
| nitrogen | Nitrogen | Nitrogen | mg/kg |
| phosphorus | Fosfor | Phosphorus | mg/kg |
| potassium | Kalium | Potassium | mg/kg |
| temperature | Suhu | Temperature | C |
| soil_temperature | Suhu Tanah | Soil Temperature | C |
| humidity | Kelembapan | Humidity | % |
| rainfall | Curah Hujan | Rainfall | mm |
| conductivity | Konduktivitas | Conductivity | source unit |
| battery | Baterai | Battery | % |

Metric key mentah dari payload tetap dipertahankan untuk data/ekspor teknis. Label tampil boleh diterjemahkan jika key dikenali.

## Status dan Role

| Stored value | ID label | EN label | Catatan |
| --- | --- | --- | --- |
| active | Aktif | Active | Crop/user/license context |
| inactive | Nonaktif | Inactive | Tenant user |
| draft | Draft | Draft | Crop |
| archived | Diarsipkan | Archived | Crop |
| online | Online | Online | Device |
| offline | Offline | Offline | Device |
| maintenance | Perawatan | Maintenance | Device |
| trial | Trial | Trial | License |
| suspended | Ditangguhkan | Suspended | License |
| revoked | Dicabut | Revoked | License |
| tenant_admin | Admin Tenant | Tenant Admin | Role display |
| tenant_user | User Tenant Read-only | Read-only Tenant User | Role display |
| super_admin | Super Admin | Super Admin | Role display |
| low | Rendah | Low | AI level |
| medium | Sedang | Medium | AI level |
| high | Tinggi | High | AI level |
| normal | Normal | Normal | Metric status |
| warning | Waspada | Warning | Alert/metric status |
| critical | Kritis | Critical | Alert/metric status |

## UI Umum

| ID | EN |
| --- | --- |
| Masuk | Sign In |
| Masuk Admin | Admin Sign In |
| Logout | Log Out |
| Refresh | Refresh |
| Tambah | Add |
| Simpan | Save |
| Batal | Cancel |
| Kembali | Back |
| Terapkan | Apply |
| Bulan Ini | This Month |
| Cari | Search |
| Semua Status | All Statuses |
| Semua Zona | All Zones |
| Semua Device | All Devices |
| Belum ada data | No data yet |
| Memuat | Loading |
| Menyimpan | Saving |
| Menghapus | Deleting |
| Gagal | Failed |
| Berhasil | Success |

## Istilah yang Tidak Diterjemahkan

PAMILO, Smart Farming GIS, BMKG, ADM4, MQTT, EMQX, QoS, API, CSV, PDF, JSON, JWT, SSE, tenant ID, device UID, topic MQTT, URL, hostname, email, credential, koordinat, nama orang, nama tenant, nama lahan, nama crop/varietas, nama ilmiah, catatan user, deskripsi user, metric key mentah, JSON key, enum tersimpan, dan token `RESET PAMILO`.
