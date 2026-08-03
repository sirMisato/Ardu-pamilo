# 16 - Phase 2 Auth and Tenancy

Status: In Progress  
Pemilik: Backend + Security + QA/QC  
Tanggal mulai: 2026-08-03

## Tujuan

Fase 2 membangun fondasi autentikasi dan isolasi tenant. Implementasi awal sengaja lokal dan testable, tanpa koneksi database production, karena keputusan MySQL/TLS masih harus dikunci.

## Scope Implementasi Saat Ini

- Role/permission shared contract di `packages/shared/src/tenancy.ts`.
- Fastify auth routes:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/me`
- Cookie session server-side dengan session ID opaque.
- CSRF token untuk mutasi session-authenticated.
- In-memory identity store untuk demo/test users.
- In-memory session store.
- In-memory audit log untuk event `auth.login_success`, `auth.login_failed`, dan `auth.logout`.
- Tenant-owned plot probe route:
  - `GET /api/v1/plots/:plotId`
- Frontend login/session integration:
  - login form
  - `/api/v1/me` session restore
  - logout with CSRF header
  - tenant plot probe display
  - available tenant list from auth response
  - local tenant switch flow for multi-tenant demo user
- Vite dev proxy from `/api` to the local API.
- Negative test cross-tenant: user tenant A mendapat `404` saat membaca plot tenant B.
- Draft SQL migration untuk auth/tenancy:
  - `infra/db/migrations/0001_auth_tenancy.sql`

## Explicit Non-Scope

- Tidak ada production database connection.
- Tidak ada migration yang dijalankan ke Hostinger.
- Tidak ada password/secret nyata.
- Tidak ada user management UI penuh.
- Tidak ada production-ready visual dashboard.
- Tidak ada full CRUD farm/plot; itu Fase 3.
- Tidak ada platform admin route lintas tenant; itu harus route terpisah dengan MFA/audit reason.

## Demo Users Lokal

Semua user lokal memakai password demo `local-demo-password`.

| Email | Tenant | Role |
| --- | --- | --- |
| `farmer-a@example.test` | `tenant-a` | `farmer_owner` |
| `operator-a@example.test` | `tenant-a` | `farmer_operator` |
| `farmer-b@example.test` | `tenant-b` | `farmer_owner` |
| `platform-admin@example.test` | `tenant-a` | `platform_admin` |
| `multi@example.test` | `tenant-a`, `tenant-b` | `farmer_owner`, `farmer_operator` |

Data ini hanya untuk local/test. Jangan gunakan sebagai seed production.

## Security Notes

- Session cookie `pamilo_session` diset `HttpOnly`, `SameSite=Lax`, dan `Secure` saat `NODE_ENV=production`.
- CSRF token dikembalikan pada login dan harus dikirim sebagai header `x-csrf-token` untuk logout.
- Sejak Fase 7, mutasi dengan `Origin` tidak dipercaya ditolak walaupun token CSRF valid. Trusted origin staging/production dikonfigurasi lewat `API_TRUSTED_ORIGINS`.
- Tenant ID dari client hanya boleh dipakai saat login untuk memilih tenant membership yang memang dimiliki user.
- Tenant-owned repository tetap wajib menerima `TenantContext`.
- Cross-tenant not found memakai `404` untuk tidak membocorkan keberadaan resource.

## Tests

Test yang ditambahkan:

- Shared role permission mapping.
- Login sukses dan gagal.
- `/api/v1/me` dengan session.
- Logout membutuhkan CSRF token.
- Audit event login/logout.
- Tenant A bisa membaca plot A.
- Tenant A mendapat `404` untuk plot B.
- Repository tenant-owned gagal jika tidak ada TenantContext.

## Acceptance Criteria Fase 2 Saat Ini

- `npm run ci` hijau.
- Tidak ada real credential pada repo.
- Endpoint auth mengembalikan envelope standar.
- Frontend login bisa memakai cookie session lewat Vite proxy.
- Mutasi logout menolak request tanpa CSRF token.
- Cross-tenant direct ID test lulus.
- Audit event dasar tercatat.
- Draft migration auth/tenancy tersedia, tetapi belum diterapkan ke production.

## Open Before Fase 3

- Putuskan adapter database setelah DEC-002 selesai.
- Ganti in-memory identity/session/audit dengan adapter persistent.
- Tambahkan migration runner yang idempotent.
- Ganti tenant switch flow dari re-login lokal ke dedicated tenant switch endpoint setelah persistent session adapter tersedia.
- Tambahkan persistent frontend auth store setelah session adapter final.
- Tambahkan role matrix detail untuk farm/plot/device CRUD.
