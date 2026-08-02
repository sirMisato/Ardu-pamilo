# 05 - IT Infra Workplan

Status: Draft Fase 0  
Pemilik: IT Infra Lead

## Misi IT Infra

Menyiapkan fondasi VPS, DNS, firewall, storage, network, dan akses operasional yang aman untuk menjalankan aplikasi berbasis Docker tanpa mengekspos service internal.

## Target Topologi

```text
Internet
  -> Traefik :80/:443/:8883
      -> web private
      -> api private
      -> Mosquitto private :1883
  -> no public access to Redis/VictoriaMetrics/MySQL

VPS 43.157.203.226
  -> Docker network edge
  -> Docker network app
  -> Docker network data
  -> persistent volumes

External
  -> MySQL Hostinger remote TLS/allowlist
  -> BMKG API HTTPS
  -> OSM-compatible tile provider HTTPS
```

## DNS

| Record | Name | Target |
| --- | --- | --- |
| A | `pamilo.keycloud.id` | `43.157.203.226` |
| A | `mqtt.keycloud.id` | `43.157.203.226` |

DNS hanya diubah setelah Fase 8 staging rehearsal dan production go/no-go disetujui.

## Firewall

| Port | Exposure | Catatan |
| --- | --- | --- |
| 80 | Public | HTTP redirect dan ACME challenge |
| 443 | Public | Web/API HTTPS |
| 8883 | Public | MQTT over TLS |
| 22 | Restricted | SSH key only, idealnya allowlist/VPN |
| 1883 | Private Docker only | MQTT internal tanpa TLS tidak diekspos |
| 3306 | Outbound only | Remote MySQL Hostinger |
| 6379 | Private Docker only | Redis tidak public |
| 8428 | Private Docker only | VictoriaMetrics tidak public |

## Storage dan Backup

- Volume Mosquitto config/data jika persistence dipakai.
- Volume Redis jika stream durability dipakai; latest cache boleh ephemeral.
- Volume VictoriaMetrics dengan retention final.
- Volume Traefik certificate.
- Backup metadata MySQL terjadwal dan restore drill.
- Backup telemetry sesuai nilai bisnis, bukan sekadar snapshot tanpa uji restore.
- Secret key backup tidak disimpan bersama backup.

## Hostinger Remote MySQL

- Allowlist hanya IP VPS `43.157.203.226`.
- Jangan gunakan Any Host atau `%`.
- TLS dan certificate validation menjadi gate production.
- Jika paket Hostinger tidak mendukung TLS terverifikasi, opsi production harus ditinjau: database private di VPS, managed database, atau tunnel aman.

## Deliverables per Fase

| Fase | Deliverable infra |
| --- | --- |
| 1 | Spesifikasi VPS final, OS baseline, user non-root, SSH hardening |
| 4 | Mosquitto network dan port mapping staging |
| 5 | Redis/VictoriaMetrics volume dan retention |
| 7 | Firewall review, backup dry-run, certificate monitoring |
| 8 | Staging/prod-like host, DNS rehearsal, restore drill |
| 10 | Production DNS/TLS cutover dan hypercare monitoring |

## Acceptance Criteria Infra

- Public scan hanya menemukan port yang disetujui.
- Service internal tidak bisa diakses dari internet.
- SSH tidak menerima password login.
- Remote MySQL hanya menerima IP VPS.
- Disk alert aktif sebelum 80% usage.
- Certificate expiry alert aktif minimal 14 hari sebelum kedaluwarsa.
