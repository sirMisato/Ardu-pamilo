# 18 - Phase 4 Device and MQTT

Status: In Progress  
Pemilik: Backend + IT Infra + Security + QA/QC  
Tanggal mulai: 2026-08-03

## Tujuan

Fase 4 membangun fondasi provisioning device ESP32 dan material akses MQTT. Implementasi awal tetap lokal dan testable, tanpa menyentuh broker production atau menulis credential ke VPS.

## Scope Implementasi Saat Ini

- Shared MQTT access helper di `packages/shared/src/mqtt.ts`.
- Generator topic publish/subscribe per device.
- Generator Mosquitto ACL least-privilege per device:
  - write: `telemetry`, `status`, `events`, `acks`
  - read: `commands`
- Guard identifier untuk mencegah slash/newline injection ke topic atau ACL.
- Permission baru `device:read`.
- Device API:
  - `GET /api/v1/plots/:plotId/devices`
  - `POST /api/v1/plots/:plotId/devices`
  - `POST /api/v1/devices/:deviceId/revoke`
- Provisioning response berisi password MQTT hanya pada response `POST`.
- List dan revoke response tidak mengembalikan password.
- Device credential disimpan sebagai hash dan fingerprint di repository in-memory.
- Duplicate active serial number ditolak per tenant.
- Audit event:
  - `device.provisioned`
  - `device.revoked`
- Frontend tenant dashboard:
  - list device per plot
  - provision device untuk role write
  - tampilkan credential one-time setelah provisioning
  - revoke device

## Security dan Tenancy

- Semua device route membutuhkan session login.
- Mutasi device membutuhkan `x-csrf-token`.
- Role `farmer_operator` hanya bisa read device.
- Provision/revoke membutuhkan permission `device:provision`.
- Plot wajib dicek dengan `TenantContext` sebelum list/provision device.
- Cross-tenant plot/device access mengembalikan `404`.
- Password MQTT tidak dicatat ke audit log.
- Provisioning response memakai header `Cache-Control: no-store`.
- Client tidak boleh mengirim `tenant_id`; tenant berasal dari session aktif.

## Explicit Non-Scope

- Belum ada Mosquitto production write.
- Belum ada `mosquitto_passwd` automation.
- Belum ada TLS certificate deployment.
- Belum ada persistent device table.
- Belum ada firmware simulator CLI.
- Belum ada command/ack service.
- Belum ada ingestor ownership check terhadap registry device persistent.

## QA Coverage Saat Ini

- Shared MQTT helper membuat topic dan ACL per device.
- Shared MQTT helper menolak identifier tidak aman.
- Role matrix mengizinkan operator membaca device tetapi tidak provisioning.
- List device tenant aktif berhasil.
- List device untuk plot tenant lain mengembalikan `404`.
- Provisioning menghasilkan password one-time, username, topics, dan ACL.
- Provisioning response `no-store`.
- List/revoke tidak mengekspos password.
- Duplicate active serial number ditolak.
- Provisioning membutuhkan CSRF dan role provisioning.
- Revoke mencatat audit event dan mengubah status device.

## Acceptance Criteria Fase 4 Saat Ini

- `npm run ci` hijau.
- Tidak ada credential nyata di repo.
- Credential MQTT yang dibuat runtime tidak di-hardcode.
- Secret provisioning hanya muncul satu kali di response provisioning.
- API device memakai envelope standar.
- ACL generated hanya memberi akses ke topic device miliknya.
- Frontend menampilkan device dari API dan tidak memakai seed hardcoded.

## Open Before Phase 5

- Kunci adapter database dan migration runner dari keputusan DEC-002.
- Tambahkan table persistent `devices`, `device_credentials`, dan audit log durable.
- Integrasikan provisioning dengan file/password backend Mosquitto atau auth plugin.
- Tambahkan simulator MQTT yang bisa mengirim valid/invalid/duplicate/replay payload.
- Tambahkan worker ingestor ownership check terhadap registry device.
- Tambahkan rate limit replay dan dead-letter storage teredaksi.
