# 33 - Troubleshooting Guide

Status: Phase 1 documentation baseline  
Owner: Support + DevOps + Backend + IT Infra  
Last updated: 2026-08-05

## Safety Rules

- Do not connect local tests to production MQTT.
- Do not connect to production Hostinger MySQL until approved.
- Do not paste credentials into tickets, chat, screenshots, or logs.
- Do not delete Docker volumes while troubleshooting unless a backup and explicit approval exist.
- Capture timestamps, tenant ID, device ID, plot ID, and request ID when escalating.

## First Checks

Run these from the VPS or approved staging environment:

```text
docker compose ps
docker system df
docker logs --tail 100 pamilo-api
docker logs --tail 100 pamilo-mqtt-ingestor
docker logs --tail 100 pamilo-emqx
```

Check health endpoints:

```text
curl -i https://sedayafarm.keycloud.id/health/live
curl -i https://sedayafarm.keycloud.id/health/ready
```

Use environment-specific hostnames for staging. Do not run production smoke without release approval.

## Offline Devices

Symptoms:

- Device status is offline.
- `last_seen_at` is old.
- Latest telemetry is empty or stale.
- Farmer reports ESP32 is powered on but not updating.

Likely causes and actions:

| Cause | Action |
| --- | --- |
| ESP32 power issue | Check power supply, battery voltage, reset reason, and local serial logs. |
| Wi-Fi unavailable | Verify SSID, signal strength, captive portal, and reconnect backoff. |
| NTP/time failure | Ensure ESP32 obtains UTC time before telemetry publish. |
| Wrong broker host/port | Use `mqtt.keycloud.id` and `8883` for production MQTTS. |
| TLS validation failure | Check device CA bundle, SNI hostname, certificate date, and device clock. |
| Credential typo or revoked credential | Re-provision or rotate credential. Password is shown once only. |
| ACL rejects topic | Compare device topic with provisioned tenant/device topics. |
| Topic/body mismatch | Ensure payload `device_id` equals topic `{device_id}`. |
| Duplicate or reset `seq` | Reset idempotency only with care; firmware should keep monotonic sequence. |
| Payload rejected | Inspect redacted dead-letter reason and schema validation errors. |

Validation checklist:

1. Confirm device appears under the expected tenant and plot.
2. Confirm device status is not `revoked`.
3. Confirm EMQX shows a connection attempt.
4. Confirm ingestor receives messages.
5. Confirm Redis latest key updates.
6. Confirm VictoriaMetrics receives numeric points.
7. Confirm API latest endpoint returns data for the plot.

## EMQX Connection Drops

Symptoms:

- ESP32 connects and disconnects repeatedly.
- EMQX client count oscillates.
- Ingestor stops receiving telemetry.

Checks:

```text
docker logs --tail 200 pamilo-emqx
docker exec pamilo-emqx emqx ctl listeners
docker exec pamilo-emqx emqx ctl clients list
```

Common fixes:

| Cause | Action |
| --- | --- |
| Port blocked | Verify VPS firewall allows `8883` and reverse proxy does not intercept raw MQTT incorrectly. |
| TLS certificate mismatch | Ensure cert covers `mqtt.keycloud.id`; ESP32 must connect by hostname, not IP. |
| ACL denied | Regenerate/apply device ACL from provisioning source. |
| Authentication backend unavailable | Check EMQX auth source and internal network to API/MySQL/Redis if used. |
| Node name changed | Restore stable EMQX node name and data directory mapping. |
| Resource pressure | Check CPU, memory, file descriptors, and Docker disk. |
| Keepalive too low | Tune ESP32 keepalive and reconnect jitter. |

## Docker Network Issues

Symptoms:

- API cannot reach Redis or VictoriaMetrics.
- Ingestor cannot reach EMQX.
- Reverse proxy returns `502`.

Checks:

```text
docker compose ps
docker network ls
docker network inspect pamilo_default
docker logs --tail 100 pamilo-nginx
docker logs --tail 100 pamilo-api
```

Actions:

- Use Compose service names for internal URLs, for example `redis`, `victoriametrics`, `emqx`.
- Do not use `localhost` from one container to reach another container.
- Confirm all services join the same internal network.
- Confirm only approved ports are published to the host.
- Restart one service at a time when possible:

  ```text
  docker compose restart api
  docker compose restart mqtt-ingestor
  ```

- If DNS resolution inside containers fails, inspect Compose network and Docker daemon health before recreating the stack.

## Hostinger Remote MySQL Blocks

Symptoms:

- API readiness reports MySQL unavailable.
- MySQL connection timeout.
- Access denied from VPS.
- Connection works in phpMyAdmin but not from VPS.

Common causes:

| Cause | Action |
| --- | --- |
| VPS IP not allowlisted | Add the VPS public IP in Hostinger Remote MySQL. |
| Wrong hostname | Use the MySQL hostname shown in Hostinger Remote MySQL setup. |
| Wrong port | Hostinger remote MySQL commonly uses port `3306`. |
| Credentials wrong | Verify database username format and password. Do not print the password. |
| Remote MySQL disabled | Enable Remote MySQL for the selected database. |
| TLS decision open | Do not add production access until security approval closes the TLS/Hostinger decision. |
| VPS egress blocked | Check firewall/security group outbound rules. |

Do not temporarily allow all hosts (`%`) for production unless Security explicitly approves a time-boxed diagnostic window.

## API or UI Auth Problems

Symptoms:

- Login loops.
- Mutating request returns `CSRF_FAILED`.
- Farmer sees empty data after login.
- Browser console shows CORS errors.

Actions:

- Confirm `API_TRUSTED_ORIGINS` includes the exact HTTPS origin.
- Confirm cookies are secure and same-site settings match deployment.
- Confirm browser time is sane.
- Confirm user has a `tenant_users` row for the selected tenant.
- Confirm role has the required permission.
- Confirm mutating requests send `x-csrf-token`.
- Check API logs by `request_id`.

## Telemetry Not Showing

Symptoms:

- EMQX accepts publish but dashboard has no readings.
- Latest telemetry is empty.
- History chart is empty.
- Dynamic variable is not visible.

Checks:

| Area | What to verify |
| --- | --- |
| Topic | Matches `pamilo/v1/tenants/{tenant_id}/devices/{device_id}/telemetry`. |
| Payload | Valid JSON, correct `v`, `device_id`, `node_id`, `ts`, `seq`, `q`. |
| Device mapping | Device is attached to the selected plot. |
| Dedup | `seq` is not duplicate within the deduplication TTL. |
| Metric catalog | Dynamic metric key, unit, type, and label passed validation. |
| Redis | Latest hash exists for tenant and plot. |
| VictoriaMetrics | Numeric metrics are imported; null/string/boolean values may not appear in numeric history. |
| API | User is requesting the correct tenant and plot. |

For dynamic metrics:

- Metric key must be lowercase snake case.
- Unsupported or oversized metric blocks are rejected.
- Unknown metrics should appear as discovered catalog entries before charting.
- Agronomy alerts require reviewed mapping and threshold metadata.

## Invalid ESP32 JSON Payload Formats

Valid canonical payload:

```json
{
  "v": 1,
  "device_id": "01JDEVICE",
  "node_id": "soil-01",
  "ts": "2026-08-05T00:00:00Z",
  "seq": 101,
  "m": {
    "st": 28.1,
    "sm": 42.5,
    "n": 31,
    "p": 14,
    "k": 96
  },
  "q": {
    "calibration_profile": "soil-v1",
    "flags": []
  }
}
```

Common invalid examples:

| Invalid format | Why it fails | Resolution |
| --- | --- | --- |
| Missing `v` | Contract version is required. | Send `"v": 1`. |
| Topic device is `dev-a`, body has `"device_id": "dev-b"` | Topic/body mismatch can break tenant isolation. | Firmware must use the provisioned device ID in both topic and body. |
| `"seq": "101"` | Sequence must be an integer, not a string. | Send `"seq": 101`. |
| `"ts": "05/08/2026 08:00"` | Timestamp is ambiguous and may not parse as UTC. | Send ISO UTC such as `"2026-08-05T00:00:00Z"`. |
| `"m": { "sm": "42%" }` | Metric values must be numbers or `null`, not formatted strings. | Send `"sm": 42`. Put unit in catalog/contract, not value text. |
| Sensor failure sent as `0` | Zero is treated as a real measurement. | Send `null` and add a quality flag, for example `"flags": ["soil_moisture_sensor_fault"]`. |
| Unknown dynamic metric key `Soil pH` | Dynamic keys must be machine-safe. | Use lowercase snake case such as `soil_ph`. |
| Extra root fields with credentials | Payload can leak secrets and fail schema/policy. | Never send Wi-Fi, MQTT password, tokens, or private config in telemetry. |

If invalid payloads continue:

1. Capture redacted dead-letter reason.
2. Check firmware JSON serialization.
3. Compare topic path with provisioned topic list.
4. Check that numbers are not converted to strings by the firmware.
5. Confirm payload size and metric count are below limits.
6. Publish the same payload to staging broker with a test credential.

## BMKG Weather Missing or Stale

Symptoms:

- Weather panel says ADM4 missing.
- Weather panel says cache stale.
- Forecast list is empty.

Actions:

1. Confirm plot has `adm4_code`.
2. Confirm `mapping_status` is `verified` or accepted for display.
3. Confirm weather worker is running.
4. Confirm BMKG cache has a snapshot for that ADM4.
5. Check recent weather fetch run errors.
6. If BMKG API is failing, serve stale data and let circuit breaker recover.
7. Keep attribution visible even when stale.

BMKG should be fetched by backend/worker only. Browser direct fetches are not part of the architecture.

## Nginx, Domain, or TLS Issues

Symptoms:

- `https://sedayafarm.keycloud.id` does not load.
- `/health/live` works by IP but not domain.
- Certificate warning in browser.
- HTTP works but HTTPS fails.

Actions:

```text
nslookup sedayafarm.keycloud.id
curl -I https://sedayafarm.keycloud.id
curl -i https://sedayafarm.keycloud.id/health/live
docker logs --tail 100 pamilo-nginx
```

Check:

- DNS A record points to `43.157.203.226`.
- Ports `80` and `443` are open.
- Certbot renewal succeeded.
- Nginx upstream points to the correct internal service/port.
- `API_TRUSTED_ORIGINS` includes `https://sedayafarm.keycloud.id`.

Do not change DNS in code tasks.

## Disk Full on VPS

Symptoms:

- Deploy fails while pulling/building images.
- EMQX or VictoriaMetrics becomes unstable.
- Docker reports no space left.

Actions:

1. Inspect usage:

   ```text
   docker system df
   df -h
   du -h --max-depth=1 /var/lib/docker
   ```

2. Safe cleanup:

   ```text
   docker image prune -f
   docker builder prune -f --filter until=168h
   docker container prune -f
   ```

3. Do not prune volumes without backup and approval.
4. If VictoriaMetrics is growing, review retention and ingestion cardinality.

## Escalation Template

Use this structure in support tickets:

```text
Environment:
Time range:
Tenant ID:
Farm ID:
Plot ID:
Device ID:
User email:
Request ID:
Symptom:
Recent change:
Commands run:
Redacted log excerpts:
Expected behavior:
Observed behavior:
```

Never include passwords, tokens, session cookies, private keys, or raw unredacted payloads containing credentials.

## References Verified

- BMKG forecast API: https://data.bmkg.go.id/prakiraan-cuaca/
- Hostinger Remote MySQL access: https://www.hostinger.com/support/1583546-how-to-set-up-remote-mysql-access-in-hostinger/
- OSM tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- EMQX TLS listener notes: https://docs.emqx.com/en/emqx/latest/network/emqx-mqtt-tls.html
