# 15 - GitHub Actions VPS Access

Status: Draft Fase 1  
Pemilik: DevOps + Security

## Tujuan

Dokumen ini menjelaskan konfigurasi aman agar GitHub Actions dapat mengakses VPS untuk pengecekan koneksi dan deployment fase berikutnya.

## Status Saat Ini

Workflow yang ditambahkan pada Fase 1 hanya melakukan read-only SSH connectivity check. Workflow Fase 8 menambahkan deploy staging manual. Keduanya memakai username/password sesuai konfigurasi repository yang tersedia; private key tidak dipakai.

Workflow ini tidak mengubah DNS dan tidak menyentuh database production. Deploy production belum dibuat sampai gate Fase 10 disetujui.

File workflow:

```text
.github/workflows/vps-connectivity.yml
.github/workflows/staging-deploy.yml
```

## Konfigurasi GitHub yang Dipakai

Repository variables boleh berisi data non-sensitif:

| Name | Tipe | Contoh | Catatan |
| --- | --- | --- | --- |
| `VPS_HOST` | Repository variable | `43.157.203.226` | Non-secret |
| `VPS_PORT` | Repository variable | `22` | Non-secret |
| `VPS_USERNAME` | Repository variable | `ubuntu` | Non-secret |
| `STAGING_DEPLOY_PATH` | Repository variable | `/opt/pamilo/staging` | Opsional; default workflow sama |

Repository secrets direkomendasikan kuat untuk data sensitif. Fallback repository variable hanya dipertahankan agar konfigurasi existing tetap bisa dipakai:

| Name | Tipe | Catatan |
| --- | --- | --- |
| `VPS_PASSWORD` | Repository secret, fallback repository variable | Password SSH untuk workflow manual. Secret lebih aman karena otomatis dimask oleh GitHub |
| `VPS_KNOWN_HOSTS` | Repository secret | Output pinned known_hosts untuk VPS; sangat disarankan sebelum deploy production |

Workflow saat ini membaca `VPS_PASSWORD` dari repository secret jika tersedia, lalu fallback ke repository variable supaya konfigurasi existing tetap bisa dipakai. Jangan mencetak password di log workflow.

## Catatan Password

Jika password pernah terlihat di screenshot, perlakukan sebagai credential bocor meskipun workflow tidak mencetak value tersebut.

Langkah mitigasi yang disarankan:

1. Rotate password user VPS.
2. Simpan password baru sebagai repository secret `VPS_PASSWORD` bila memungkinkan.
3. Jika tetap memakai repository variable, pastikan workflow tidak pernah menjalankan shell debug `set -x`.
4. Setelah production siap, gunakan user non-root dan permission paling sempit.

## Known Hosts

Sebelum production deploy, pin host key VPS ke `VPS_KNOWN_HOSTS`.

Contoh pengambilan dari mesin admin:

```text
ssh-keyscan -p 22 -H 43.157.203.226
```

Verifikasi fingerprint melalui channel terpisah sebelum menyimpan hasilnya ke GitHub secret.

## Menjalankan Check

Di GitHub:

1. Buka tab Actions.
2. Pilih workflow `VPS Connectivity Check`.
3. Klik `Run workflow`.
4. Pastikan output hanya menunjukkan `connected`, user, hostname, dan versi Docker jika tersedia.

## Menjalankan Staging Deploy

Di GitHub:

1. Buka tab Actions.
2. Pilih workflow `Staging Deploy`.
3. Isi `image_tag`, atau kosongkan agar workflow memakai SHA commit.
4. Isi `staging_web_port`, default `8080`.
5. Isi `staging_origin` bila sudah ada domain/reverse proxy; kosongkan untuk default `http://VPS_HOST:staging_web_port`.
6. Jalankan workflow dan pastikan step smoke staging lulus.

Workflow staging membuat image immutable di GHCR, mengunggah `compose.staging.yaml`, `mosquitto.self-check.conf`, dan `staging.env` ke `STAGING_DEPLOY_PATH`, lalu menjalankan `docker compose pull` dan `up -d`.

## Acceptance Criteria

- `VPS_HOST`, `VPS_PORT`, dan `VPS_USERNAME` ada sebagai repository variables.
- `VPS_PASSWORD` tersedia sebagai repository secret atau repository variable sesuai konfigurasi yang dipakai.
- Workflow manual `VPS Connectivity Check` berhasil.
- Workflow manual `Staging Deploy` berhasil sampai smoke test bila Fase 8 dijalankan.
- Tidak ada secret tercetak di log workflow.
- Deploy production belum dibuat sampai checklist Fase 8/10 disetujui.
