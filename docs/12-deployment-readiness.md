# 12 - Deployment Readiness

Status: Draft Fase 0  
Pemilik: PM, DevOps Lead, IT Infra Lead, Security Lead, QA/QC Lead

## Tujuan

Menentukan syarat minimum agar PAMILO layak deploy ke staging dan production. Checklist ini dipakai untuk go/no-go meeting.

## Staging Readiness

- Environment staging tersedia dan prod-like.
- Semua service berjalan di Docker Compose.
- DNS staging atau host sementara tersedia.
- TLS valid untuk web dan MQTT.
- MySQL remote staging/test tidak memakai production data mentah.
- Redis dan VictoriaMetrics punya volume dan retention.
- CI deploy staging memakai image immutable.
- Smoke test otomatis lulus.
- Rollback rehearsal berhasil.

## Production Readiness

- Scope release dan release notes disetujui.
- Semua P0/P1 bugs selesai.
- Security checklist lulus.
- QA regression lulus.
- Load baseline lulus untuk target pilot.
- Backup terbaru tersedia.
- Restore drill berhasil di environment terisolasi.
- Migration plan dan rollback plan disetujui.
- DNS change window disetujui.
- Monitoring dan alert aktif.
- Hypercare owner dan jadwal standby jelas.

## Smoke Test Production

| Check | Expected |
| --- | --- |
| Web HTTPS | `https://pamilo.keycloud.id` valid TLS dan response sehat |
| API ready | `/health/ready` sehat |
| MQTT TLS | `mqtt.keycloud.id:8883` handshake valid |
| Login | User test bisa login |
| Tenant isolation | User test hanya melihat tenant sendiri |
| Map | Plot tampil dengan attribution OSM |
| Telemetry latest | Payload simulator tampil |
| BMKG | Weather tampil atau stale label benar |
| Logs | Tidak ada secret atau stack trace sensitif |
| Metrics | Dashboard observability menerima data |

## Rollback Criteria

Rollback dilakukan jika:

- Login gagal untuk mayoritas user.
- Cross-tenant issue terdeteksi.
- API error rate melewati threshold yang disetujui.
- MQTT ingest berhenti.
- Migration merusak data dan tidak bisa diperbaiki cepat.
- Data telemetry corrupt atau duplicate masif.

## Rollback Evidence

Setelah rollback:

- Image digest aktif tercatat.
- Migration state tercatat.
- Healthcheck hijau.
- Smoke test lulus.
- Incident note dibuat.

## Go/No-Go Approvals

| Role | Approval |
| --- | --- |
| PM | Scope, timing, communication |
| Backend Lead | API, data, migration |
| Frontend Lead | UI, UX, browser support |
| IT Infra Lead | DNS, TLS, firewall, storage |
| DevOps Lead | CI/CD, deploy, rollback |
| Security Lead | Threat model, secrets, auth, tenancy |
| QA/QC Lead | Test report, residual risk |
