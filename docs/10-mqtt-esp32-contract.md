# 10 - MQTT and ESP32 Contract

Status: Draft Fase 0  
Pemilik: Backend Lead, IT Infra Lead, Security Lead

## MQTT Public Endpoint

```text
mqtts://mqtt.keycloud.id:8883
```

Port `1883` hanya boleh berada di private Docker network.

## Topic V1

```text
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/telemetry
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/status
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/events
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/commands
pamilo/v1/tenants/{tenant_id}/devices/{device_id}/acks
```

## ACL Matrix

| Actor | Publish | Subscribe |
| --- | --- | --- |
| ESP32 | `telemetry`, `status`, `events`, `acks` miliknya | `commands` miliknya |
| Ingestor | Tidak perlu publish telemetry | Semua telemetry/status via service credential |
| Command service | `commands` device yang terotorisasi | `acks` sesuai kebutuhan |
| Browser | Tidak ada | Tidak ada |

## Payload Sensor V1

```json
{
  "v": 1,
  "device_id": "01JDEVICE",
  "node_id": "soil-01",
  "ts": "2026-08-02T05:00:00Z",
  "seq": 84513,
  "rssi": -67,
  "battery_v": 12.4,
  "m": {
    "st": 27.4,
    "sm": 43.1,
    "n": 36,
    "p": 18,
    "k": 112,
    "ec": 1.24,
    "vwc": 31.6
  },
  "q": {
    "calibration_profile": "soil-v1",
    "flags": []
  }
}
```

## Invalid Payload Examples

- Topic tenant/device tidak cocok dengan body `device_id`.
- `seq` mundur atau duplikat dalam idempotency window.
- Timestamp terlalu jauh dari server time tanpa quality flag.
- Payload lebih besar dari batas.
- Metric di luar dictionary.
- Sensor gagal dikirim sebagai `0` tanpa quality flag.

## ESP32 Behavior

- Publish default setiap 5 menit.
- QoS 1.
- Timestamp UTC dari NTP.
- `seq` monoton per device.
- Offline buffer minimal 24 jam pada interval 5 menit.
- Replay bertahap dengan rate limit setelah reconnect.
- Exponential backoff plus jitter untuk Wi-Fi dan MQTT reconnect.
- Jika satu channel gagal, kirim `null` plus quality flag.
- Heartbeat/status memuat firmware version, uptime, RSSI, tegangan, dan reset reason.

## Ingestor Rules

1. Subscribe dengan service credential internal.
2. Validasi topic, schema, ownership, timestamp, range, payload size.
3. Deduplicate berdasarkan `device_id + node_id + seq` di Redis dengan TTL.
4. Normalisasi unit.
5. Batch write ke telemetry store.
6. Update latest value ke Redis.
7. Debounce update `last_seen` ke MySQL.
8. Tulis invalid payload ke dead-letter storage yang teredaksi.

## QoS Note

QoS 1 `PUBACK` hanya berarti broker menerima pesan. Itu bukan bukti end-to-end bahwa telemetry store sudah menyimpan data. Jika dibutuhkan, application receipt dibuat terpisah setelah durable write.

## Simulator Contract

Simulator wajib bisa:

- Mengirim payload valid.
- Mengirim duplicate `seq`.
- Mengirim payload invalid schema.
- Mengirim sensor `null` dengan flags.
- Mencoba publish ke topic tenant lain untuk memastikan ACL reject.
- Mensimulasikan offline replay.
