# 07 - Security Workplan

Status: Draft Fase 0  
Pemilik: Security Lead

## Misi Security

Menjaga isolasi tenant, credential lifecycle, secure transport, auditability, dan readiness incident response sejak desain. Untuk sistem ini, bug cross-tenant adalah severity kritis.

## Security Invariants

- Browser tidak punya credential MQTT, Redis, VictoriaMetrics, atau MySQL.
- Semua public traffic memakai TLS.
- MQTT public hanya `mqtts://mqtt.keycloud.id:8883`.
- Anonymous MQTT disabled.
- Setiap device punya credential unik dan bisa di-rotate/revoke.
- Device hanya boleh publish/subscribe topic miliknya.
- Platform admin lintas tenant wajib MFA, alasan akses, dan audit log.
- Secret tidak ada di Git, image, response, log, atau screenshot.
- Cookie session harus `HttpOnly`, `Secure`, `SameSite`, dan punya CSRF protection untuk request mutasi.

## Threat Model Ringkas

| Threat | Risiko | Kontrol |
| --- | --- | --- |
| Cross-tenant ID guessing | Data tenant bocor | TenantContext, repository guard, negative tests |
| MQTT topic abuse | Device publish ke tenant lain | ACL topic per device, credential unik |
| Replay/duplicate payload | Grafik/alert salah | `device_id + node_id + seq` idempotency |
| Credential leak | Akses tidak sah | Secret rotation, one-time display, redaction |
| Public internal service | Data exfiltration | Firewall, Docker network private |
| CSRF | Mutasi tanpa consent user | SameSite, CSRF token/double submit, origin check |
| BMKG schema drift | UI salah interpretasi | Adapter versioning, contract tests |
| OSM tile misuse | Tile blocked | Attribution, cache, no prefetch, valid Referer/User-Agent |

## Authorization Rules

- `tenant_id` dari session/token menjadi sumber kebenaran.
- Query body yang membawa `tenant_id` untuk resource tenant-owned ditolak.
- Resource not found lintas tenant sebaiknya `404`, kecuali policy butuh `403`.
- Search/export/SSE/cache harus diuji lintas tenant, bukan hanya CRUD.
- Admin route lintas tenant dipisah dari farmer route.

## MQTT Security

- TLS certificate valid dan chain terverifikasi.
- `allow_anonymous false`.
- Password file atau auth plugin dikelola dari provisioning.
- ACL source generated dari registry device.
- Fase 4 awal hanya menampilkan password MQTT sekali pada response provisioning dan memakai `Cache-Control: no-store`.
- Topic v1:

```text
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/telemetry
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/status
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/events
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/commands
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/acks
```

## Incident Response: Cross-Tenant Data Leak

1. Freeze affected release and preserve logs.
2. Disable risky route/stream/topic if needed.
3. Identify tenants and resources affected.
4. Rotate exposed credentials.
5. Patch and add regression negative test.
6. Produce incident report: timeline, blast radius, root cause, fix, prevention.
7. Notify owner sesuai kebijakan privasi dan regulasi yang disetujui.

## Deliverables per Fase

| Fase | Deliverable security |
| --- | --- |
| 1 | Secure coding standard, secret policy |
| 2 | Auth/session review, tenant isolation tests |
| 4 | MQTT ACL review, device credential lifecycle |
| 5 | SSE/cache/export tenant tests |
| 7 | Threat model review, dependency scan, pen-test checklist |
| 8 | Staging security sign-off |
| 10 | Production go/no-go security approval. Status awal ada di `docs/24-phase-10-production-release.md` |
| 11 | Review simulasi public VPS, termasuk batas MQTT internal. Status awal ada di `docs/25-phase-11-public-vps-simulation.md` |
| 12 | Incident response, alert, log retention, dan secret rotation readiness. Status awal ada di `docs/26-phase-12-ops-readiness.md` |
| 13 | Handover security sign-off dan residual risk acceptance. Status awal ada di `docs/27-phase-13-operations-handover.md` |
| 14 | Domain/TLS readiness, HSTS, trusted origin, dan public exposure review. Status awal ada di `docs/28-phase-14-domain-tls-cutover.md` |

## Source Facts Verified

- Mosquitto supports MQTT 5.0, 3.1.1, and 3.1; password files can be managed with `mosquitto_passwd`. Diakses 2026-08-02: https://mosquitto.org/ dan https://mosquitto.org/man/mosquitto_passwd-1.html

## Phase 2 Notes

- Auth skeleton memakai cookie session server-side dan CSRF token untuk mutasi.
- Data identity/session/audit masih in-memory untuk local/test sampai keputusan database production dikunci.
- Cross-tenant direct ID test pertama tersedia melalui `GET /api/v1/plots/:plotId`.

## Phase 7 Notes

- Status awal hardening ada di `docs/21-phase-7-hardening-qa.md`.
- API sudah menambahkan baseline security headers dan `X-Request-Id`.
- API sudah memakai global safe error envelope untuk unknown route, oversized payload, dan unhandled error.
- CSRF route mutasi sekarang menolak `Origin` yang tidak dipercaya, dengan allowlist via `API_TRUSTED_ORIGINS`.
- `Strict-Transport-Security` hanya aktif saat `NODE_ENV=production`.

## Phase 10 Notes

- Production smoke tidak boleh dijalankan tanpa `PAMILO_PRODUCTION_SMOKE_APPROVED=true`.
- Production DB access tetap diblokir sampai keputusan MySQL TLS/Hostinger tertutup.
- MQTT production wajib TLS dan ACL per device sebelum release approval.
- Release gate wajib punya approval ref dari Security dan QA/QC.
- Report preflight/smoke tidak boleh memuat password, token, cookie, atau private key.

## Phase 11-13 Notes

- Public VPS simulation boleh memakai HTTP sementara hanya untuk staging IP yang disetujui.
- MQTT staging self-check tetap internal di Docker network dan tidak membuka port broker public.
- `Public VPS Simulation` workflow memakai username/password VPS sesuai konfigurasi existing dan tidak membutuhkan private key.
- Ops readiness membedakan freshness indikator operasional dari threshold agronomy.
- Handover gate wajib mencatat residual risk dan sign-off Security sebelum production release nyata.
- Domain readiness network check hanya boleh dijalankan setelah approval; production smoke tetap memakai guard approval terpisah.
