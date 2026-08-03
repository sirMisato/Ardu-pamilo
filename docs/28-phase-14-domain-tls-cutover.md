# 28 - Phase 14 Domain TLS Cutover Readiness

Status: In Progress
Pemilik: PM + IT Infra + DevOps + Security + QA/QC
Tanggal mulai: 2026-08-04

## Tujuan

Fase 14 menyiapkan kesiapan domain dan TLS untuk website `sedayafarm.keycloud.id`. Fase ini hanya membuat gate, runbook, dan evidence check. Tidak ada DNS change, production deploy, production MQTT, atau production MySQL access dari repo.

## Scope Implementasi Saat Ini

- `scripts/domain-readiness.mjs` untuk validasi kesiapan domain/TLS.
- `npm run domain:readiness` sebagai entrypoint gate.
- `.github/workflows/domain-tls-readiness.yml` sebagai workflow manual non-deploy.
- `infra/production/domain-readiness.env.example` sebagai template env non-secret.
- Report readiness ditulis ke `.local/domain-readiness/`.
- GitHub Actions dry-run dengan `run_network_checks=true` sudah dijalankan di run `30859422632` dan menghasilkan artifact `domain-tls-readiness`.

## Batas Aman

- Default script tidak melakukan DNS lookup atau request HTTPS.
- DNS/HTTPS check hanya berjalan jika `PAMILO_DOMAIN_NETWORK_APPROVED=true`.
- Gate tidak menjalankan SSH, deploy, Docker command, atau DNS mutation.
- Production smoke tetap memakai `npm run smoke:production` dan membutuhkan `PAMILO_PRODUCTION_SMOKE_APPROVED=true`.
- Production MQTT dan MySQL tidak disentuh.
- Private key tidak dipakai.

## Domain Readiness Gate

Dry-run lokal:

```text
npm run domain:readiness
```

Dry-run dengan evidence placeholder:

```text
PAMILO_DOMAIN_DNS_CHANGE_WINDOW_REF=change-001 PAMILO_DOMAIN_TLS_CERTIFICATE_REF=cert-001 PAMILO_DOMAIN_REVERSE_PROXY_REF=proxy-001 PAMILO_DOMAIN_FIREWALL_EVIDENCE_REF=firewall-001 PAMILO_DOMAIN_ROLLBACK_REF=rollback-001 PAMILO_DOMAIN_QA_SMOKE_PLAN_REF=smoke-001 PAMILO_DOMAIN_PM_APPROVAL_REF=pm-001 PAMILO_DOMAIN_QA_APPROVAL_REF=qa-001 PAMILO_DOMAIN_SECURITY_APPROVAL_REF=sec-001 PAMILO_DOMAIN_INFRA_APPROVAL_REF=infra-001 PAMILO_DOMAIN_DEVOPS_APPROVAL_REF=devops-001 npm run domain:readiness
```

Gate mode setelah evidence lengkap dan network check disetujui:

```text
PAMILO_DOMAIN_MODE=gate PAMILO_DOMAIN_NETWORK_APPROVED=true npm run domain:readiness
```

PowerShell contoh:

```text
$env:PAMILO_DOMAIN_MODE="gate"
$env:PAMILO_DOMAIN_NETWORK_APPROVED="true"
$env:PAMILO_WEB_DOMAIN="sedayafarm.keycloud.id"
$env:PAMILO_WEB_PRODUCTION_ORIGIN="https://sedayafarm.keycloud.id"
npm run domain:readiness
```

## Automated Checks

| ID | Area | Bukti |
| --- | --- | --- |
| `DOM-001` | Domain | Domain valid dan bukan IP temporary |
| `DOM-002` | HTTPS origin | Origin production memakai HTTPS dan cocok dengan domain |
| `DOM-003` | Backend CORS/CSRF | `API_TRUSTED_ORIGINS` mencakup domain production |
| `DOM-004` | Evidence | DNS window, TLS cert, reverse proxy, firewall, rollback, smoke plan |
| `DOM-005` | Approval | PM, QA/QC, Security, Infra, DevOps |
| `DOM-006` | DNS network check | A record mengarah ke `43.157.203.226` |
| `DOM-007` | HTTPS network check | Web root dan `/health/live` sehat via HTTPS |
| `DOM-008` | Safety | Tidak ada production MQTT/MySQL request |

## GitHub Actions

Jalankan workflow manual `Domain TLS Readiness`.

Input penting:

| Input | Nilai awal |
| --- | --- |
| `web_domain` | `sedayafarm.keycloud.id` |
| `production_origin` | `https://sedayafarm.keycloud.id` |
| `expected_vps_ip` | `43.157.203.226` |
| `run_network_checks` | `false` sampai ada approval |
| `mode` | `dry-run`, lalu `gate` saat evidence lengkap |

Workflow ini tidak memakai SSH dan tidak mengubah DNS.

## Manual Operator Checks

DNS:

```text
nslookup sedayafarm.keycloud.id
```

HTTPS:

```text
curl -I https://sedayafarm.keycloud.id
curl -i https://sedayafarm.keycloud.id/health/live
```

Production smoke setelah release approval:

```text
PAMILO_PRODUCTION_SMOKE_APPROVED=true PAMILO_PRODUCTION_BASE_URL=https://sedayafarm.keycloud.id npm run smoke:production
```

## Exit Criteria Fase 14

- Domain `sedayafarm.keycloud.id` disetujui sebagai web production origin.
- DNS A record mengarah ke VPS yang disetujui.
- TLS valid dan `/health/live` bisa dibaca lewat HTTPS.
- Reverse proxy hanya mengekspos port public yang disetujui.
- `API_TRUSTED_ORIGINS` mencakup `https://sedayafarm.keycloud.id`.
- Rollback DNS/proxy terdokumentasi.
- QA smoke plan dan approval refs lengkap.

## Open Before Production Cutover

- Jalankan ulang `Domain TLS Readiness` mode `gate` setelah evidence approval lengkap.
- Jalankan `Production Release Gate` dengan evidence Phase 14.
- Jalankan `smoke:production` hanya setelah production deploy disetujui.
- Pastikan MQTT production tetap `mqtts://mqtt.keycloud.id:8883` dengan TLS dan per-device ACL.
