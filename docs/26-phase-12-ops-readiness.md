# 26 - Phase 12 Ops Readiness

Status: In Progress
Pemilik: PM + DevOps + IT Infra + Security + QA/QC
Tanggal mulai: 2026-08-04

## Tujuan

Fase 12 mengunci kesiapan operasional setelah simulasi public VPS. Fokus fase ini adalah observability, alerting, incident response, backup/restore, rollback, dan owner hypercare.

## Scope Implementasi Saat Ini

- `scripts/ops-readiness.mjs` untuk validasi evidence readiness operasional.
- `npm run ops:readiness` sebagai entrypoint gate.
- `infra/ops/ops-readiness.env.example` sebagai template non-secret.
- Report readiness ditulis ke `.local/ops-readiness/`.

## Batas Aman

- Script hanya memvalidasi evidence refs dan tidak melakukan request production.
- Freshness threshold yang dicatat adalah indikator operasional stale data, bukan threshold rekomendasi agronomy.
- Production deploy, DNS, MQTT production, dan MySQL production tetap di luar scope.

## Ops Readiness Gate

Dry-run lokal:

```text
npm run ops:readiness
```

Gate mode setelah evidence lengkap:

```text
PAMILO_OPS_MODE=gate npm run ops:readiness
```

Checklist otomatis:

| ID | Area | Evidence |
| --- | --- | --- |
| `OPS-001` | Simulasi public VPS | Ref report Phase 11 |
| `OPS-002` | Observability | Dashboard API, web, MQTT, Redis, VictoriaMetrics |
| `OPS-003` | Alerting | Kanal alert dan eskalasi |
| `OPS-004` | Incident owner | Incident commander dan on-call roster |
| `OPS-005` | Logs | Retention dan redaction policy |
| `OPS-006` | Backup | Backup schedule dan restore drill |
| `OPS-007` | Rollback | Runbook rollback dan rehearsal |
| `OPS-008` | Freshness | Indikator stale telemetry/weather |
| `OPS-009` | Security incident | Runbook incident dan secret rotation |
| `OPS-010` | Approval | PM, QA/QC, Security, Infra, DevOps |

## Minimum Dashboard

Dashboard operasional minimal harus menampilkan:

- API uptime, p95 latency, error rate, dan readiness.
- Web uptime via public origin.
- MQTT broker connected clients, publish rate, dan auth/ACL reject.
- Telemetry freshness per tenant/plot/device.
- Redis memory, persistence, dan restart count.
- VictoriaMetrics disk usage, ingestion rate, dan query latency.
- Disk VPS, CPU, RAM, network, dan container restart.

## Alert Minimum

| Alert | Trigger awal |
| --- | --- |
| API down | `/health/live` gagal 2 kali berturut-turut |
| API not ready | `/health/ready` gagal atau dependency critical tidak sehat |
| Web down | Public origin tidak mengembalikan HTML |
| MQTT ingestion stale | Tidak ada telemetry baru di window operasional yang disetujui |
| Disk high | Disk usage melewati ambang operasional yang disetujui Infra |
| Secret leak suspected | Secret scan/log review menemukan credential |
| Cross-tenant suspected | Negative test gagal atau user melaporkan data tenant lain |

## Incident Drill

1. PM membuka incident record dan menunjuk incident commander.
2. DevOps mengambil snapshot status service dan log tail.
3. QA/QC menjalankan smoke atau UAT read-only sesuai target.
4. Security memeriksa indikasi credential leak atau cross-tenant.
5. Infra memeriksa disk, network, dan host health.
6. Backend memeriksa error API, readiness, dan data dependency.
7. Frontend memeriksa akses web desktop/mobile dan console error.
8. PM memutuskan continue, mitigate, rollback, atau stop release.

## Exit Criteria Fase 12

- `npm run ops:readiness` gate lulus.
- Dashboard dan alert minimum tersedia.
- On-call dan incident commander jelas.
- Backup/restore dan rollback evidence tersedia.
- Security incident dan secret rotation runbook tersedia.
- Tidak ada blocker Critical/High terbuka untuk operasi.

## Open Before Phase 13

- Lampirkan hasil Phase 11 simulation.
- Lampirkan dashboard/alert screenshot atau URL internal.
- Lampirkan restore drill dan rollback rehearsal terbaru.
- Lengkapi approval refs operasional dari role inti.
