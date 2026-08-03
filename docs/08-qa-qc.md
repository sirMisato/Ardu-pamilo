# 08 - QA/QC Test Strategy

Status: Draft Fase 0  
Pemilik: QA/QC Lead

## Misi QA/QC

Membuktikan sistem benar, aman, dan layak deploy melalui test fungsional, integration, E2E, cross-tenant negative test, performance baseline, dan release validation.

## Test Pyramid

- Unit test: domain logic, validators, utility.
- Integration test: API + DB, API + Redis, ingestor + broker, BMKG adapter.
- Contract test: OpenAPI, MQTT payload v1, BMKG normalized model.
- E2E test: login, dashboard, map, plot editor, device flow, telemetry display.
- Security negative test: cross-tenant, auth, CSRF, ACL.
- Load test: ingest rate, API history query, SSE connection count.
- Operational test: backup restore, rollback, healthcheck, stale mode.

## Critical Test Matrix

| Area | Test wajib | Expected |
| --- | --- | --- |
| REST direct ID | User A fetch plot User B | `404` atau `403`, no disclosure |
| REST list/search | User A list/search | Hanya tenant A |
| Export | User A export | Tidak ada data tenant B |
| Cache latest | Key tenant A/B | Namespace tidak bercampur |
| SSE | User A stream | Event hanya tenant A |
| MQTT publish | Device A publish topic B | Broker reject |
| MQTT subscribe | Device A subscribe topic B | Broker reject |
| Replay | Same `seq` dikirim ulang | Tidak menggandakan histori |
| Sensor null | Channel gagal | Value `null` + quality flag |
| Polygon invalid | Self-intersection | Backend reject |
| BMKG stale | API BMKG gagal | UI tampil stale label |

## Entry Criteria per Fase

- Requirement sudah punya acceptance criteria.
- Test data tenant A/B tersedia.
- Environment test bisa di-reset.
- Schema kontrak tersedia.
- Risiko utama fase tercatat.

## Exit Criteria per Fase

- Semua test P0/P1 lulus.
- Tidak ada bug severity critical/high terbuka.
- Bug medium punya owner dan target.
- Test report tersimpan.
- PM, owner role, Security, dan QA menyetujui gate.

## Deliverables per Fase

| Fase | Deliverable QA/QC |
| --- | --- |
| 1 | Test plan, fixture tenant A/B, CI test baseline |
| 2 | Auth and tenancy test suite |
| 3 | GIS and metadata test cases |
| 4 | MQTT simulator and ACL tests |
| 5 | Telemetry latency and history tests |
| 6 | BMKG adapter and alert tests. Status awal ada di `docs/20-phase-6-bmkg-agronomy.md` |
| 7 | Full regression, load baseline, security regression. Status awal ada di `docs/21-phase-7-hardening-qa.md` |
| 8 | Staging smoke, rollback validation. Status awal ada di `docs/22-phase-8-staging-deployment.md` |
| 9 | UAT script and pilot acceptance report. Status awal ada di `docs/23-phase-9-pilot-uat.md` |
| 10 | Production smoke and hypercare checklist. Status awal ada di `docs/24-phase-10-production-release.md` |
| 11 | Public VPS simulation untuk web, API, telemetry, weather, tenancy, dan MQTT loopback. Status awal ada di `docs/25-phase-11-public-vps-simulation.md` |
| 12 | Ops readiness checklist untuk alert, incident drill, backup, rollback, dan stale indicators. Status awal ada di `docs/26-phase-12-ops-readiness.md` |
| 13 | Handover evidence dan sign-off regression gap. Status awal ada di `docs/27-phase-13-operations-handover.md` |

## Smoke Coverage Fase 8

`npm run smoke:staging` menjadi gate awal untuk staging deployment. Coverage minimum:

| Area | Check | Expected |
| --- | --- | --- |
| Web/API health | `/health/live` dan `/health/ready` | HTTP `200` |
| Security headers | `X-Frame-Options`, `X-Content-Type-Options` | Header ada dan bernilai aman |
| Login | Seeded farmer A login | Cookie session diterima |
| Tenant data | Farmer A list farms | Data hanya tenant terkait |
| CSRF mutation | Create farm dengan token dan trusted origin | HTTP `201` |
| Telemetry latest | Plot A latest telemetry | Payload tersedia |
| BMKG weather | Plot A weather | Attribution BMKG tersedia |

## Bug Severity

| Severity | Definisi |
| --- | --- |
| Critical | Data leak, auth bypass, destructive data loss, production cannot start |
| High | Core workflow blocked, telemetry invalid, security control broken |
| Medium | Important workflow degraded with workaround |
| Low | Cosmetic, copy, non-blocking UX issue |

## Acceptance Criteria QA/QC

- Cross-tenant matrix otomatis masuk CI.
- Semua endpoint API punya contract test.
- Semua payload MQTT valid/invalid punya fixture.
- Playwright mencakup desktop dan mobile.
- Load test baseline didokumentasikan sebelum production.
- Restore drill dan rollback rehearsal punya bukti hasil.

## UAT Fase 9

`npm run uat:pilot` menghasilkan report Markdown di `.local/pilot-uat/`. Report tersebut wajib dilampirkan bersama evidence manual browser, perangkat lapangan, log operasional, dan sign-off sebelum Fase 10.

## Smoke Fase 10

`npm run smoke:production` hanya boleh dijalankan setelah release approval eksplisit dan production target disetujui. Script membutuhkan `PAMILO_PRODUCTION_SMOKE_APPROVED=true` sebelum melakukan request production.

## Simulasi Fase 11

`npm run simulate:public-vps` menjalankan read-only simulation terhadap public VPS origin. Mutation tetap skip kecuali `PAMILO_PUBLIC_VPS_WRITE=true`, dan MQTT evidence dilampirkan dari loopback internal VPS.
