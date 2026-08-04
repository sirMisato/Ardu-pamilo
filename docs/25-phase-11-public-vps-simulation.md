# 25 - Phase 11 Public VPS Simulation

Status: In Progress
Pemilik: PM + Frontend + Backend + IT Infra + DevOps + Security + QA/QC
Tanggal mulai: 2026-08-04

## Tujuan

Fase 11 membuktikan akses staging lewat IP publik VPS sebelum keputusan production final. Simulasi ini mengecek web, API, UAT read-only, dan MQTT staging self-check tanpa membuka broker MQTT plaintext ke internet.

## Scope Implementasi Saat Ini

- `scripts/simulate-public-vps.mjs` menjalankan simulasi web/API lewat origin public VPS.
- `npm run simulate:public-vps` sebagai entrypoint simulasi.
- `.github/workflows/public-vps-simulation.yml` sebagai workflow manual dari GitHub Actions.
- `infra/staging/public-vps-simulation.env.example` sebagai template env non-secret.
- Report simulasi ditulis ke `.local/public-vps-simulation/`.
- MQTT simulation dijalankan secara internal di VPS Docker network melalui SSH username/password.
- MQTT simulation memverifikasi Redis latest dan VictoriaMetrics history setelah publish payload.
- Artifact GitHub Actions `public-vps-simulation` sudah tersedia dari run `30864101005`.

## Evidence Terkini

| Workflow | Run | Artifact | Status |
| --- | --- | --- | --- |
| `Public VPS Simulation` | `30864101005` | `8875449534` | Success |

## Batas Aman

- Simulasi default memakai staging origin `http://43.157.203.226:8080`.
- MQTT staging tidak dipublish sebagai public plaintext port.
- MQTT staging hanya dibind ke loopback VPS `127.0.0.1:18830` untuk SSH tunnel operator.
- MQTT production tidak disentuh.
- MySQL production tidak disentuh.
- DNS tidak diubah.
- Private key tidak dipakai; workflow memakai `VPS_USERNAME` dan `VPS_PASSWORD`.
- Write flow API default mati dan hanya aktif jika operator set `PAMILO_PUBLIC_VPS_WRITE=true`.

## Public Web dan API Simulation

Jalankan setelah workflow `Staging Deploy` berhasil:

```text
PAMILO_PUBLIC_VPS_BASE_URL=http://43.157.203.226:8080 PAMILO_PUBLIC_VPS_ORIGIN=http://43.157.203.226:8080 npm run simulate:public-vps
```

Jika memakai PowerShell:

```text
$env:PAMILO_PUBLIC_VPS_BASE_URL="http://43.157.203.226:8080"
$env:PAMILO_PUBLIC_VPS_ORIGIN="http://43.157.203.226:8080"
npm run simulate:public-vps
```

Coverage otomatis:

| ID | Area | Bukti |
| --- | --- | --- |
| `SIM-ENV-001` | Target safety | Target staging/pilot/demo, bukan production |
| `WEB-001` | Web | Root web mengembalikan app shell |
| `API-001` | API health | `/health/live` HTTP `200` dan security headers |
| `API-002` | API readiness | `/health/ready` HTTP `200` dan dependency status tercatat |
| `AUTH-001` | Login | User UAT login ke tenant yang benar |
| `AUTH-002` | Session | `/api/v1/me` tidak mengekspos password |
| `TENANT-001` | Farm | List farm tenant aktif tersedia |
| `GIS-001` | Plot | Plot punya area dan centroid |
| `TEL-001` | Telemetry | Latest telemetry bisa dibaca |
| `TEL-002` | Telemetry history | History telemetry bisa dibaca |
| `BMKG-001` | Weather | Attribution BMKG dan cache state terbaca |
| `SEC-001` | Tenancy negative | Direct object access lintas tenant ditolak |
| `WRITE-001` | Mutation optional | Create farm dengan CSRF jika write flow diaktifkan |
| `MQTT-001` | MQTT evidence | Evidence loopback MQTT internal dilampirkan |

## Simulasi via GitHub Actions

Jalankan workflow manual `Public VPS Simulation`.

Input awal:

| Input | Nilai awal |
| --- | --- |
| `public_origin` | `http://43.157.203.226:8080` |
| `expected_host` | `43.157.203.226` |
| `run_mqtt_internal` | `true` |
| `run_write_uat` | `false` |

Workflow memakai variable/secret yang sudah disiapkan:

- `VPS_HOST`
- `VPS_PORT`
- `VPS_USERNAME`
- `VPS_PASSWORD`
- Optional `VPS_KNOWN_HOSTS`
- Optional `STAGING_DEPLOY_PATH`, default `/opt/pamilo/staging`

## Manual API Check

Browser:

```text
http://43.157.203.226:8080
```

Health API:

```text
curl -i http://43.157.203.226:8080/health/live
curl -i http://43.157.203.226:8080/health/ready
```

Login API:

```text
curl -i -c cookies.txt -H "content-type: application/json" -d "{\"email\":\"farmer-a@example.test\",\"password\":\"local-demo-password\",\"tenant_id\":\"tenant-a\"}" http://43.157.203.226:8080/api/v1/auth/login
```

Read farm tenant:

```text
curl -i -b cookies.txt http://43.157.203.226:8080/api/v1/farms
```

`cookies.txt` adalah file lokal sementara dan tidak boleh di-commit.

## Manual MQTT Internal VPS Check

Masuk ke VPS memakai username/password yang sudah ada:

```text
ssh ubuntu@43.157.203.226
```

Masuk ke folder staging:

```text
cd /opt/pamilo/staging
sudo docker compose --env-file staging.env -f compose.staging.yaml up -d mosquitto
```

Jalankan loopback publish/subscribe di container Mosquitto:

```text
sudo docker compose --env-file staging.env -f compose.staging.yaml exec -T mosquitto sh -c 'topic="pamilo/v1/tenants/tenant-a/devices/device-a/telemetry"; payload="{\"v\":1,\"device_id\":\"device-a\",\"node_id\":\"vps-sim-01\",\"ts\":\"2026-08-04T00:00:00Z\",\"seq\":1,\"m\":{\"st\":27.4,\"sm\":43.1},\"q\":{\"calibration_profile\":\"vps-simulation\",\"flags\":[]}}"; rm -f /tmp/pamilo-mqtt-simulation.out; mosquitto_sub -i "pamilo-manual-sub-$$" -h 127.0.0.1 -p 1883 -C 1 -W 8 -t "$topic" > /tmp/pamilo-mqtt-simulation.out & sub_pid="$!"; sleep 1; mosquitto_pub -i "pamilo-manual-pub-$$" -h 127.0.0.1 -p 1883 -t "$topic" -m "$payload"; wait "$sub_pid"; test -s /tmp/pamilo-mqtt-simulation.out; echo "MQTT internal loopback passed"'
```

Catat output command sebagai evidence. Simulasi ini membuktikan broker staging internal menerima payload valid dan worker daemon staging menulis latest/history ke Redis/VictoriaMetrics.

## MQTT Explorer Desktop via SSH Tunnel

Broker staging tidak dibuka langsung ke internet. Untuk melihat broker dari MQTT Explorer desktop, buat tunnel SSH dari komputer lokal ke loopback VPS:

```text
ssh -L 1883:127.0.0.1:18830 ubuntu@43.157.203.226
```

Jika port lokal `1883` sudah dipakai, gunakan port lokal lain:

```text
ssh -L 18830:127.0.0.1:18830 ubuntu@43.157.203.226
```

Setting MQTT Explorer:

| Field | Nilai |
| --- | --- |
| Protocol | `mqtt://` |
| Host | `127.0.0.1` |
| Port | `1883` atau `18830` sesuai tunnel lokal |
| Client ID | `mqtt-explorer-desktop` |
| Username | kosong untuk staging tunnel |
| Password | kosong untuk staging tunnel |
| Encryption | off |

Topic untuk subscribe:

```text
pamilo/v1/#
```

Topic untuk publish payload simulasi:

```text
pamilo/v1/tenants/tenant-a/devices/device-a/telemetry
```

Payload contoh:

```json
{
  "v": 1,
  "device_id": "device-a",
  "node_id": "mqtt-explorer-01",
  "ts": "2026-08-04T01:00:00Z",
  "seq": 1,
  "m": {
    "st": 27.4,
    "sm": 43.1
  },
  "q": {
    "calibration_profile": "mqtt-explorer",
    "flags": []
  }
}
```

Naikkan nilai `seq` setiap publish supaya deduplication ingestor tidak menganggap payload sebagai replay.

## Exit Criteria Fase 11

- `npm run simulate:public-vps` lulus terhadap public VPS origin.
- Browser dapat membuka dashboard staging lewat IP publik.
- API health, login, farm, plot, telemetry latest/history, weather, dan tenancy negative test lulus.
- MQTT loopback internal VPS punya evidence.
- Tidak ada secret, cookie, token, atau password masuk report.
- Tidak ada port data service yang sengaja dibuka publik.

## Open Before Phase 12

- Putuskan apakah write UAT perlu dijalankan di staging public IP.
- Simpan hasil `docker compose ps` dan log tail setelah simulasi.
- Pastikan `VPS_KNOWN_HOSTS` dipin sebelum workflow production apa pun.
