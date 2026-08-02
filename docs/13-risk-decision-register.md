# 13 - Risk and Decision Register

Status: Draft Fase 0  
Pemilik: PM

## Cara Pakai

Register ini dipakai sebagai gate sebelum tim masuk ke fase berikutnya. Keputusan dibagi menjadi:

- Blocker: harus diputuskan sebelum fase terkait dimulai.
- Deferable: boleh ditunda, tetapi punya fase deadline yang jelas.
- Risk indicator: sinyal yang bisa diuji oleh QA, Security, DevOps, atau Infra.

## Blocker Decisions

Keputusan berikut wajib dikunci sebelum Fase 1 atau sebelum pekerjaan teknis yang bergantung padanya dimulai.

| ID | Keputusan | Mengapa blocker | Output yang harus ada | Owner | Gate |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Baseline VPS dan environment strategy | Menentukan Docker sizing, telemetry retention, backup, dan cara staging | OS, CPU, RAM, disk, bandwidth, staging strategy, disk growth budget | IT Infra + DevOps | Sebelum Fase 1 |
| DEC-002 | Strategi MySQL Hostinger dan TLS | Backend/DevOps perlu tahu apakah remote MySQL production aman dipakai | Bukti TLS verified atau keputusan pindah ke DB private/managed | IT Infra + Security | Sebelum Fase 1 |
| DEC-003 | Retention telemetry awal | Menentukan sizing VictoriaMetrics, backup, dan query history | Raw retention, rollup retention, expected device/node count pilot | PM + Backend + Infra | Sebelum Fase 1 |
| DEC-004 | RPO/RTO minimum | Menentukan desain backup, restore drill, dan release readiness | RPO metadata, RPO telemetry, RTO layanan inti | PM + IT Infra + DevOps | Sebelum Fase 1 |
| DEC-008A | Role minimum MVP | Auth, route guard, dan test tenant membutuhkan role matrix awal | Matrix permission untuk `farmer_owner`, `farmer_operator`, `platform_admin` | PM + Security + Backend | Sebelum Fase 2 |

## Deferable Decisions

Keputusan berikut boleh ditunda dari Fase 1, tetapi tidak boleh melewati gate yang ditentukan.

| ID | Keputusan | Boleh ditunda sampai | Dampak jika terlambat | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-005 | Tile provider production atau self-host tiles | Sebelum Fase 3 GIS selesai | Risiko policy OSM atau tile blocked saat pilot | PM + Frontend + Infra | Open |
| DEC-006 | Daftar varietas resmi versi pertama | Sebelum Fase 6 agronomy | Master data tidak siap untuk threshold/rekomendasi | Agronomy Reviewer + PM | Open |
| DEC-007 | Sumber threshold dan workflow validasi agronomy | Sebelum Fase 6 agronomy | Alert/rekomendasi tidak boleh dianggap verified | Agronomy Reviewer + QA | Open |
| DEC-008B | Role lanjutan agronom/PPL/admin lintas tenant | Sebelum Fase 6 atau admin advanced | Risiko over-permission dan audit kurang tajam | PM + Security | Open |
| DEC-009 | Kanal notifikasi awal | Sebelum Fase 6 alert | Alert hanya bisa in-app sampai kanal dipilih | PM + Frontend + Backend | Open |
| DEC-010 | Responsive web/PWA atau mobile native fase lanjut | Setelah MVP web stabil | Roadmap mobile belum final | PM + Frontend | Open |

## Decision Options

| ID | Opsi aman awal | Opsi alternatif | Bukti keputusan |
| --- | --- | --- | --- |
| DEC-001 | Satu VPS untuk MVP plus staging terpisah ringan atau namespace staging | VPS berbeda untuk staging dan production | Spesifikasi tertulis, hasil sizing, owner biaya |
| DEC-002 | Hostinger MySQL hanya jika TLS verified | DB di VPS/private network atau managed MySQL | Screenshot/command verification TLS, allowlist IP |
| DEC-003 | Raw telemetry 30 hari, rollup lebih lama untuk pilot | Retention lebih pendek/panjang sesuai kapasitas | Kalkulasi sample per device/node/metric |
| DEC-004 | RPO metadata 24 jam, RPO telemetry 1 jam, RTO 4 jam | Target lebih ketat jika nilai bisnis menuntut | Restore drill plan dan acceptance |
| DEC-008A | MVP role sederhana: owner, operator, platform admin | Tambah agronomist sejak awal | Permission matrix dan negative test list |

## Risk Register With Testable Indicators

| ID | Risiko | Dampak | Trigger | Indikator yang bisa diuji | Mitigasi | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| RISK-001 | Cross-tenant data leak | Critical | Direct ID, list, search, export, SSE, cache, MQTT salah scope | Automated tenant A/B negative tests semua gagal akses silang | TenantContext, repository guard, ACL, regression tests | Security + Backend + QA |
| RISK-002 | Remote MySQL tanpa TLS terverifikasi | High | Hostinger plan tidak menyediakan TLS/cert validation | Test koneksi TLS gagal atau cert tidak tervalidasi | Release gate, DB private/managed fallback | IT Infra + Security |
| RISK-003 | Shared MySQL limit koneksi | High | Pool timeout, latency naik, error `Too many connections` | Integration/load test menunjukkan pool exhaustion atau p95 tinggi | Pool limit, debounce, batch writes, telemetry di VictoriaMetrics | Backend + Infra |
| RISK-004 | OSM tile blocked atau melanggar policy | Medium | Tile request tinggi, attribution hilang, User-Agent/Referer tidak valid | QA visual check attribution, network check tile URL/cache headers | Provider configurable, cache, no prefetch, production tile decision | Frontend + Infra |
| RISK-005 | BMKG schema berubah atau outage | Medium | Worker parse error, stale cache, HTTP 4xx/5xx | Contract test fixture gagal, stale label muncul benar saat mock failure | Adapter versioning, timeout, retry, circuit breaker | Backend + QA |
| RISK-006 | Sensor NPK dianggap setara uji lab | High | UI/copy/rekomendasi mengklaim nilai absolut tanpa provenance | QA content review menemukan threshold tanpa source/reviewer/version | Provenance, calibration profile, disclaimer, review workflow | PM + Agronomy Reviewer + QA |
| RISK-007 | Disk VPS penuh oleh telemetry/log | High | Disk usage > 80%, log growth tidak terkendali | Alert disk aktif, retention test, log rotation check | Retention, rollup, log rotation, backup cleanup | IT Infra + DevOps |
| RISK-008 | Device flood setelah offline | Medium | Banyak device replay bersamaan | MQTT/load test replay tidak melewati rate target dan tidak duplicate | Replay throttle, idempotency key, broker limit | Backend + IT Infra |
| RISK-009 | Secret bocor di repo/log/image | Critical | Secret masuk commit, CI log, response provisioning, Docker image | Secret scan CI, log redaction test, one-time secret display test | Secret scan, redaction, rotation, no hardcode | Security + DevOps |
| RISK-010 | Rollback tidak bisa dilakukan | High | Release gagal, migration error, image lama tidak tersedia | Staging rollback rehearsal berhasil dan tercatat | Immutable image, migration plan, rollback runbook | DevOps + QA |
| RISK-011 | CSRF/session cookie lemah | High | Auth memakai cookie tanpa CSRF/SameSite policy | Security test mutasi cross-site ditolak | HttpOnly, Secure, SameSite, CSRF token/origin check | Security + Backend + QA |
| RISK-012 | Privacy data lokasi polygon tidak jelas | High | Export/admin access tanpa consent dan retention policy | QA cek consent, audit log, export authorization | Privacy policy, audit, role guard, retention decision | PM + Security |
| RISK-013 | Migration gagal atau corrupt metadata | High | Schema migration gagal di staging/prod | Migration dry-run, backup-before-migrate, rollback test | Idempotent migration, backup, staging rehearsal | Backend + DevOps + QA |
| RISK-014 | Device diprovision ke tenant salah | Critical | Admin/operator memilih tenant/plot salah atau API bug | Provisioning negative test dan audit log menunjukkan tenant benar | Tenant-scoped provisioning, confirmation UI, audit | Backend + Frontend + QA |

## Risk Indicator Checklist

Checklist ini harus dipakai QA/QC dan Security sebelum gate besar.

| Area | Bukti minimum |
| --- | --- |
| Tenancy | Test tenant A/B untuk REST direct ID, list/search, export, cache, SSE, MQTT |
| Auth/session | Cookie flags, CSRF test, logout revoke session |
| MQTT | ACL publish/subscribe reject lintas tenant, anonymous disabled, TLS valid |
| Telemetry | Duplicate `seq` tidak menggandakan data, replay throttled, invalid payload masuk dead-letter |
| GIS | Self-intersection ditolak, area dari backend, attribution OSM terlihat |
| BMKG | Cache per `adm4`, failure menampilkan stale label, contract fixture lulus |
| Infra | Public port scan sesuai daftar, Redis/VictoriaMetrics tidak public |
| DevOps | Secret scan hijau, image digest tercatat, rollback rehearsal lulus |
| Backup | Restore drill berhasil di environment terisolasi |

## Assumptions

- Satu VPS dipakai untuk aplikasi dan service pendukung pada MVP sampai DEC-001 dikunci.
- Database control plane tetap MySQL Hostinger sampai DEC-002 dikunci.
- Traffic awal berada pada skala pilot sampai DEC-003 dikunci.
- ESP32 mampu menyimpan offline buffer minimal 24 jam.
- Tim punya akses GitHub Actions dan GHCR.
- Tidak ada credential production di repo saat ini.
- Role Firmware/Embedded belum menjadi role tim terpisah; pekerjaan ESP32 sementara dimiliki Backend + IT Infra.

## Decision Log Format

Setiap keputusan final ditulis dengan format:

```text
ID:
Tanggal:
Owner:
Status:
Context:
Decision:
Alternatives:
Consequences:
Evidence:
Review date:
```
