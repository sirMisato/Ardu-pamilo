# 21 - Phase 7 Hardening and QA

Status: In Progress  
Pemilik: Backend + Security + QA/QC + DevOps  
Tanggal mulai: 2026-08-03

## Tujuan

Fase 7 mengunci baseline hardening dan regression QA sebelum pekerjaan staging deployment. Fokus implementasi awal adalah kontrol yang bisa dibuktikan otomatis di CI: header keamanan, response error aman, body limit, dan penguatan CSRF origin.

## Scope Implementasi Saat Ini

- API body limit default `262144` bytes.
- Body limit bisa diubah lewat `API_BODY_LIMIT_BYTES`.
- Trusted browser origin bisa diatur lewat `API_TRUSTED_ORIGINS`.
- Default non-production mengizinkan Vite dev origin:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- Baseline security headers untuk semua response API:
  - `X-Request-Id`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Cross-Origin-Resource-Policy: same-origin`
  - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'`
- `Strict-Transport-Security` aktif saat `NODE_ENV=production`.
- Unknown route sekarang memakai response envelope standar.
- Unhandled error memakai response envelope standar dan tidak mengembalikan stack trace, internal host, DSN, atau credential.
- CSRF-protected mutation tetap butuh `x-csrf-token` dan sekarang menolak `Origin` yang tidak dipercaya.
- Server log untuk unhandled error tidak mencatat object error mentah agar message exception tidak membocorkan credential.

## Security dan Tenancy

- Perubahan ini tidak mengubah aturan tenant ownership.
- Cross-tenant guard tetap berada di repository/route tenant-owned.
- Origin check berlaku sebagai lapisan tambahan untuk route mutasi yang sudah memakai CSRF.
- Production wajib mengisi `API_TRUSTED_ORIGINS` sesuai origin publik yang disetujui.
- Browser tetap tidak menerima credential MQTT, Redis, VictoriaMetrics, atau MySQL.

## Explicit Non-Scope

- Belum ada automated dependency vulnerability gate di CI.
- Belum ada Playwright E2E browser suite.
- Belum ada load baseline telemetry/history/SSE.
- Belum ada backup/restore drill.
- Belum ada pen-test report manual.
- Belum ada WAF/CDN config.
- Belum ada production deployment approval.

## QA Coverage Saat Ini

- Security headers baseline hadir pada response.
- Unknown route mengembalikan envelope `NOT_FOUND`.
- Unhandled error mengembalikan envelope `INTERNAL_SERVER_ERROR` tanpa detail internal.
- Oversized JSON payload mengembalikan envelope `PAYLOAD_TOO_LARGE`.
- CSRF token valid dari untrusted origin tetap ditolak.
- Local Vite dev origin tetap diizinkan untuk route mutasi saat non-production.
- Auth dan farm mutation regression test tetap lulus.

## Acceptance Criteria Fase 7 Saat Ini

- `npm run ci` hijau.
- Secret scan tidak menemukan credential.
- API error tidak mengembalikan stack trace.
- Route tidak dikenal tidak mengembalikan default error shape framework.
- Mutasi session-authenticated menolak untrusted origin.
- Staging nanti wajib mengisi `API_TRUSTED_ORIGINS` sebelum diekspos publik.

## Open Before Phase 8

- Tambahkan Playwright E2E untuk login, farm/plot, device provisioning, telemetry, dan weather.
- Tambahkan dependency scan job yang stabil untuk CI.
- Tambahkan load baseline untuk login, latest telemetry, history query, dan weather.
- Tambahkan staging smoke script yang bisa dijalankan GitHub Actions.
- Tambahkan backup/restore rehearsal plan dengan bukti hasil.
- Tambahkan observability checklist untuk error rate, latency, dan stale telemetry/weather.
