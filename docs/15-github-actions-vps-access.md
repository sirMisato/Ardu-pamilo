# 15 - GitHub Actions VPS Access

Status: Draft Fase 1  
Pemilik: DevOps + Security

## Tujuan

Dokumen ini menjelaskan konfigurasi aman agar GitHub Actions dapat mengakses VPS untuk pengecekan koneksi dan deployment fase berikutnya.

## Status Saat Ini

Workflow yang ditambahkan pada Fase 1 hanya melakukan read-only SSH connectivity check. Workflow ini tidak melakukan deploy, tidak mengubah DNS, tidak membuka port, dan tidak menyentuh database production.

File workflow:

```text
.github/workflows/vps-connectivity.yml
```

## Konfigurasi GitHub yang Benar

Repository variables boleh berisi data non-sensitif:

| Name | Tipe | Contoh | Catatan |
| --- | --- | --- | --- |
| `VPS_HOST` | Repository variable | `43.157.203.226` | Non-secret |
| `VPS_PORT` | Repository variable | `22` | Non-secret |
| `VPS_USERNAME` | Repository variable | `ubuntu` | Non-secret |

Repository secrets wajib dipakai untuk data sensitif:

| Name | Tipe | Catatan |
| --- | --- | --- |
| `VPS_SSH_PRIVATE_KEY` | Repository secret | Private key khusus deploy/check, tanpa passphrase atau dengan agent support fase lanjut |
| `VPS_KNOWN_HOSTS` | Repository secret | Output pinned known_hosts untuk VPS; sangat disarankan sebelum deploy production |

Jangan memakai repository variable untuk password, token, private key, atau credential lain.

## Jika Password Sudah Pernah Terlihat

Jika password pernah disimpan sebagai repository variable atau terlihat di screenshot, perlakukan sebagai credential bocor.

Langkah wajib:

1. Rotate password user VPS atau disable password login.
2. Hapus variable `VPS_PASSWORD` dari repository variables.
3. Gunakan SSH key khusus GitHub Actions.
4. Batasi key tersebut hanya untuk prosedur deploy/check yang diperlukan.
5. Setelah production siap, gunakan user non-root dan permission paling sempit.

## Membuat SSH Key untuk GitHub Actions

Contoh di mesin admin, bukan di repository:

```text
ssh-keygen -t ed25519 -C "github-actions-pamilo" -f pamilo_github_actions
```

Yang disimpan di GitHub:

- Isi `pamilo_github_actions` masuk ke secret `VPS_SSH_PRIVATE_KEY`.
- Isi `pamilo_github_actions.pub` ditambahkan ke `~/.ssh/authorized_keys` user VPS yang disetujui.

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

## Acceptance Criteria

- `VPS_PASSWORD` tidak ada di repository variables.
- `VPS_SSH_PRIVATE_KEY` ada sebagai repository secret.
- `VPS_HOST`, `VPS_PORT`, dan `VPS_USERNAME` ada sebagai repository variables.
- Workflow manual `VPS Connectivity Check` berhasil.
- Tidak ada secret tercetak di log workflow.
- Deploy production belum dibuat sampai checklist Fase 8/10 disetujui.
