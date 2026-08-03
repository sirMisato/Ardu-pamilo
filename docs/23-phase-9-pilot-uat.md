# 23 - Phase 9 Pilot UAT

Status: In Progress  
Pemilik: PM + QA/QC + semua lead  
Tanggal mulai: 2026-08-04

## Tujuan

Fase 9 menyiapkan pilot lapangan dan UAT berbasis evidence setelah staging tersedia. Fokus fase ini adalah membuktikan workflow utama dipahami user, telemetry pilot bisa diverifikasi, risiko keamanan tetap tertutup, dan keputusan go/no-go menuju production punya bukti.

## Scope Implementasi Saat Ini

- `scripts/pilot-uat.mjs` menjalankan automated UAT terhadap local atau staging origin.
- `npm run uat:pilot` menjadi entrypoint automated UAT.
- Report Markdown otomatis dibuat di `.local/pilot-uat/`.
- Script menolak target production host.
- Script tidak menyimpan password di report.
- Write flow staging bersifat eksplisit lewat `PAMILO_UAT_WRITE=true`.
- Manual checklist pilot ditulis ke report untuk bukti browser, perangkat lapangan, training, dan sign-off.

## Menjalankan UAT Lokal

Naikkan API dan Web dev server:

```text
npm run dev:api
npm run dev:web
```

Jalankan UAT:

```text
PAMILO_UAT_BASE_URL=http://127.0.0.1:5173 PAMILO_UAT_ORIGIN=http://127.0.0.1:5173 npm run uat:pilot
```

Default lokal memakai seeded user `farmer-a@example.test`, tenant `tenant-a`, dan write flow aktif.

## Menjalankan UAT Staging

Setelah workflow `Staging Deploy` lulus, jalankan dari runner/operator:

```text
PAMILO_UAT_ENVIRONMENT=staging PAMILO_UAT_BASE_URL=http://43.157.203.226:8080 PAMILO_UAT_ORIGIN=http://43.157.203.226:8080 PAMILO_UAT_WRITE=true npm run uat:pilot
```

Jika staging sudah memakai domain dan TLS:

```text
PAMILO_UAT_ENVIRONMENT=staging PAMILO_UAT_BASE_URL=https://staging.example.test PAMILO_UAT_ORIGIN=https://staging.example.test PAMILO_UAT_WRITE=true npm run uat:pilot
```

Credential UAT boleh diberikan lewat environment:

```text
PAMILO_UAT_EMAIL=<uat-email> PAMILO_UAT_PASSWORD=<uat-password> PAMILO_UAT_TENANT_ID=<tenant-id> npm run uat:pilot
```

Jangan menulis credential UAT ke file repo.

## Automated UAT Coverage

| ID | Area | Bukti |
| --- | --- | --- |
| `ENV-001` | Target safety | Environment bukan production dan target aman |
| `OPS-001` | Health/security | `/health/live` dan baseline security header |
| `OPS-002` | Readiness | `/health/ready` dan status dependensi |
| `AUTH-001` | Login | User pilot login ke tenant benar |
| `AUTH-002` | Session profile | `/api/v1/me` tidak mengekspos credential |
| `TENANT-001` | Tenant list | Farm tenant aktif terbaca |
| `GIS-001` | GIS metadata | Plot punya area dan centroid |
| `TENANT-002` | Isolation negative | Direct object access tenant lain ditolak |
| `SEC-001` | CSRF negative | Mutation tanpa token ditolak |
| `TEL-001` | Telemetry latest | Latest readings tersedia |
| `TEL-002` | Telemetry history | Query history valid |
| `BMKG-001` | Weather | Attribution BMKG dan cache state tersedia |
| `DEVICE-001` | Device read | List device tidak mengekspos password |
| `WRITE-001` | Write flow | Farm dan plot pilot dibuat dengan CSRF |
| `DEVICE-002` | Provision/revoke | Credential one-time terverifikasi lalu device direvoke |

## Manual Pilot Checklist

| ID | Owner | Evidence wajib |
| --- | --- | --- |
| `MAN-001` | Frontend + QA/QC | Screenshot desktop dashboard setelah login, pilih farm, pilih plot, panel telemetry, dan panel BMKG |
| `MAN-002` | Frontend + QA/QC | Screenshot mobile dashboard tanpa overlap teks/control |
| `MAN-003` | Backend + IT Infra + QA/QC | Timestamp payload ESP32 lapangan muncul di telemetry staging dalam target pilot |
| `MAN-004` | IT Infra + DevOps | `docker compose ps`, disk usage, dan tail log container setelah pilot window |
| `MAN-005` | Security + QA/QC | Konfirmasi tidak ada password, MQTT secret, cookie, token, atau stack trace di browser/log/report |
| `MAN-006` | PM + QA/QC | Catatan training farmer/operator dan feedback |
| `MAN-007` | PM | Keputusan acceptance: accepted, accepted with caveats, atau rejected |

## Entry Criteria

- Workflow `Staging Deploy` lulus.
- Staging origin final untuk pilot diketahui.
- Akun UAT dan tenant pilot tersedia.
- Field device atau simulator pilot sudah punya serial yang disepakati.
- QA/QC punya daftar browser/device yang akan dipakai.
- Security menyetujui credential handling untuk UAT.

## Exit Criteria

- `npm run uat:pilot` lulus di staging dengan `PAMILO_UAT_WRITE=true`.
- Semua checklist manual punya evidence.
- Tidak ada bug Critical/High terbuka.
- Bug Medium punya owner dan target.
- Training farmer/operator selesai.
- Report pilot disetujui PM, QA/QC, Security, Backend, Frontend, Infra, dan DevOps.

## Explicit Non-Scope

- Tidak ada production deploy.
- Tidak ada DNS production cutover.
- Tidak ada koneksi database production.
- Tidak ada koneksi broker MQTT production.
- Tidak ada threshold agronomy universal baru tanpa provenance.

## Open Before Phase 10

- Hasil workflow `Staging Deploy` harus disimpan.
- Hasil `npm run uat:pilot` staging harus dilampirkan.
- Evidence manual pilot harus lengkap.
- Go/no-go production harus memakai checklist `docs/12-deployment-readiness.md`.
- Keputusan MySQL TLS/Hostinger masih harus dikunci sebelum akses DB production.
