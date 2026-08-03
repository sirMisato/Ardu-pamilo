# 00 - PM Roadmap dan Fase Delivery

Status: Draft Fase 0  
Pemilik: Project Manager  
Tanggal: 2026-08-02

## Tujuan

Dokumen ini menjadi pusat koordinasi tim kecil PAMILO Smart Farming GIS sampai sistem layak deploy. Fokus Fase 0 adalah menyiapkan dokumentasi teknis, pembagian kerja, gate kualitas, dan daftar keputusan yang harus disetujui sebelum implementasi.

## Dokumen Fase 0

| File | Pemilik utama | Isi utama |
| --- | --- | --- |
| `00-pm-roadmap.md` | PM | Fase, milestone, RACI, gate, ritme kerja |
| `01-system-overview.md` | PM + semua lead | Gambaran sistem, arsitektur, data flow |
| `02-requirements-and-scope.md` | PM + QA | Scope, NFR, acceptance criteria |
| `03-frontend-uiux.md` | Frontend UI/UX | IA, route, state, GIS UX, aksesibilitas |
| `04-backend.md` | Backend | Modul, API, data model, tenancy guard |
| `05-it-infra.md` | IT Infra | VPS, DNS, firewall, network, storage |
| `06-devops.md` | DevOps | CI/CD, Docker, release, rollback |
| `07-security.md` | Security | Threat model, auth, tenant isolation, incident |
| `08-qa-qc.md` | QA/QC | Test strategy, matrix, exit criteria |
| `09-data-api-contracts.md` | Backend + Frontend + QA | Kontrak data, API, error, pagination |
| `10-mqtt-esp32-contract.md` | Backend + Infra + Security | Topic, ACL, payload, replay, simulator |
| `11-gis-bmkg-agronomy.md` | Frontend + Backend + Agronomy | GIS, BMKG, master data tanaman |
| `12-deployment-readiness.md` | PM + DevOps + Security + QA | Checklist staging/production |
| `13-risk-decision-register.md` | PM | Risiko, asumsi, keputusan terbuka |

## Fase Proyek

| Fase | Nama | Hasil utama | Gate kelulusan |
| --- | --- | --- | --- |
| 0 | Dokumentasi dan persiapan | Dokumen teknis per role, roadmap, risk register | Review dokumen disetujui |
| 1 | Foundation | Monorepo, standar kode, env lokal, Docker skeleton, CI awal | Build, lint, unit test hijau |
| 2 | Auth dan tenancy | User, tenant, role, session, audit, repository guard | Cross-tenant negative test lulus |
| 3 | GIS dan metadata | Farm, plot polygon, area, centroid, adm4, master crops | GIS acceptance dan data validation lulus |
| 4 | Device dan MQTT | Provisioning device, Mosquitto TLS, ACL, simulator ESP32 | End-to-end payload valid masuk pipeline |
| 5 | Telemetry | Ingestor, Redis latest, VictoriaMetrics history, SSE | Latest data tampil <= 10 detik setelah ingest |
| 6 | BMKG dan agronomy | Weather worker, cache adm4, threshold governance | Stale/failure test dan provenance lulus |
| 7 | Hardening dan QA | Security hardening, E2E, load, backup drill | QA sign-off dan security checklist lulus |
| 8 | Staging deployment | VPS staging/prod-like, CI/CD, observability | Deploy dan rollback rehearsal lulus |
| 9 | Pilot | Perangkat lapangan, UAT, monitoring, training. Status awal ada di `docs/23-phase-9-pilot-uat.md` | Pilot acceptance ditandatangani |
| 10 | Production release | DNS/TLS production, release tagged, hypercare | Go-live checklist selesai |

## RACI Ringkas

| Area | PM | Frontend | Backend | IT Infra | DevOps | Security | QA/QC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Scope dan prioritas | A/R | C | C | C | C | C | C |
| UI/UX dashboard GIS | A | R | C | I | I | C | C |
| API dan domain logic | A | C | R | I | C | C | C |
| MQTT dan telemetry | A | C | R | C | C | C | C |
| VPS, DNS, firewall | A | I | C | R | C | C | I |
| CI/CD dan release | A | C | C | C | R | C | C |
| Security review | A | C | C | C | C | R | C |
| Test planning | A | C | C | C | C | C | R |

Legenda: R = Responsible, A = Accountable, C = Consulted, I = Informed.

## Ritme Kerja

- Daily sync 15 menit: blocker, progress, risiko.
- Weekly planning 45 menit: prioritas fase, scope cut, keputusan terbuka.
- Weekly demo 30 menit: hasil yang berjalan, bukan hanya status.
- Security/QA review wajib sebelum tiap gate fase.
- Semua keputusan arsitektur dicatat di `13-risk-decision-register.md`.

## Definition of Done Umum

- Requirement punya acceptance criteria.
- Perubahan kode memiliki test yang sesuai risiko.
- Tidak ada credential nyata di repo, log, image, atau dokumentasi.
- Semua endpoint tenant-owned menjalankan tenant enforcement.
- Dokumentasi role yang terdampak ikut diperbarui.
- CI hijau untuk lint, typecheck, unit, integration, dan secret scan.
- Deployment bisa di-rollback dengan langkah yang sudah diuji.

## Larangan Fase 0

- Jangan deploy production.
- Jangan mengubah DNS.
- Jangan membuka port VPS.
- Jangan menghubungi broker production.
- Jangan membaca atau menulis database production.
- Jangan memasukkan credential nyata.
