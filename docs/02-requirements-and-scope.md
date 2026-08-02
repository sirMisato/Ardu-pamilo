# 02 - Requirements and Scope

Status: Draft Fase 0  
Pemilik: PM, QA/QC

## Tujuan Produk

Membantu petani dan operator lahan memantau kondisi plot pertanian hampir real-time, melihat histori sensor, memetakan polygon lahan, menerima prakiraan cuaca BMKG, dan mendapatkan alert berbasis aturan yang dapat ditelusuri sumbernya.

## Persona dan Role

| Role | Kebutuhan utama |
| --- | --- |
| `farmer_owner` | Mengelola farm, plot, perangkat, user tenant, dan notifikasi |
| `farmer_operator` | Memantau data, melihat alert, mengelola aktivitas terbatas |
| `agronomist` | Meninjau rekomendasi, threshold, dan data agronomy yang diberi akses |
| `platform_admin` | Operasi lintas tenant dengan MFA, alasan akses, dan audit |
| QA/QC | Memvalidasi fitur, security invariants, data correctness, dan deploy readiness |

## Scope MVP

- Login, logout, session aman, profil user, role, tenant aktif.
- CRUD farm dan plot milik tenant aktif.
- Editor polygon dengan validasi bentuk dan area dari backend.
- Provisioning device ESP32, sensor node, dan channel.
- MQTT ingestion untuk payload sensor tanah v1.
- Dashboard latest telemetry, device status, dan alert aktif.
- Histori sensor dengan range, metric, dan resolution terbatas.
- SSE untuk delta update; fallback polling ber-ETag.
- Integrasi BMKG berdasarkan `adm4`.
- Master data crop, variety, planting cycle, calibration profile, threshold set.
- Audit log untuk perubahan penting dan akses admin.
- Observability, backup, restore drill, CI/CD, staging, dan rollback.

## Out of Scope MVP

- Mobile native app.
- OTA firmware production.
- AI recommendation tanpa review agronomy.
- Offline map dari `tile.openstreetmap.org`.
- Multi-region high availability.
- Direct browser connection ke MQTT atau database.
- Threshold produksi tanpa sumber dan validasi.

## Non-Functional Requirements

| Area | Target awal |
| --- | --- |
| Latest telemetry latency | <= 10 detik setelah ingestor menerima payload valid |
| Sensor interval default | 5 menit, bisa dikonfigurasi |
| ESP32 offline buffer | Minimal 24 jam pada interval 5 menit |
| Dashboard map first load | <= 3 detik untuk data pilot wajar |
| Cross-tenant isolation | 100% negative tests untuk REST, export, cache, SSE, MQTT |
| Availability MVP | Single VPS, restore dan rollback terdokumentasi |
| RPO metadata | 24 jam atau lebih baik, final harus disetujui |
| RPO telemetry | 1 jam atau sesuai nilai bisnis, final harus disetujui |
| RTO layanan inti | 4 jam untuk target awal |

## Acceptance Criteria MVP

- Farmer A tidak bisa membaca, menebak, mengubah, export, stream, atau subscribe data Farmer B.
- Payload valid dari simulator tampil di dashboard latest dalam target latency.
- Payload duplicate dari QoS/replay tidak menggandakan histori atau alert.
- Sensor gagal dibaca tersimpan sebagai `null` plus quality flag, bukan `0`.
- Polygon invalid atau self-intersecting ditolak oleh backend.
- Area disimpan dalam `area_m2` dan `area_ha`.
- Plot memiliki `adm4` terverifikasi atau status `unmapped`.
- UI menampilkan attribution OSM dan BMKG.
- Semua container punya healthcheck dan log rotation.
- Backup bisa direstore di environment terisolasi.

## Requirement Traceability

Setiap requirement harus punya:

- ID requirement, contoh `REQ-TEN-001`.
- Owner role.
- Acceptance criteria.
- Test case QA.
- Status: Draft, Ready, In Progress, Done, Deferred.
- Link issue/PR setelah implementasi dimulai.
