# EMQX Configuration Notes

## Production Listener Strategy

Expose only MQTT over TLS to devices:

```txt
8883/tcp -> public device MQTT TLS
18083/tcp -> EMQX dashboard, restrict by firewall or VPN
1883/tcp -> internal Docker network only
```

The backend ingestion service connects internally to:

```txt
mqtt://emqx:1883
```

Devices should connect externally to:

```txt
mqtts://<your-domain>:8883
```

## Dynamic Topic Subscription

Use a stable topic root that includes tenant and device identity:

```txt
pamilo/v1/tenants/{tenantId}/devices/{deviceId}/telemetry
pamilo/v1/tenants/{tenantId}/devices/{deviceId}/status
pamilo/v1/tenants/{tenantId}/devices/{deviceId}/events
```

The backend MQTT ingestion service should subscribe to:

```txt
pamilo/v1/tenants/+/devices/+/telemetry
pamilo/v1/tenants/+/devices/+/status
pamilo/v1/tenants/+/devices/+/events
```

This subscription pattern allows any custom sensor variables in the JSON payload. Metric names are parsed from payload keys, not from MQTT topic names.

## Payload Handling Rules

Preferred telemetry payload:

```json
{
  "device_id": "device-001",
  "node_id": "soil-node-a",
  "timestamp": "2026-08-06T12:00:00Z",
  "metrics": {
    "ph": 6.7,
    "moisture": 42.1,
    "nitrogen": 18,
    "custom_metric": "any value"
  },
  "meta": {
    "battery": 87
  }
}
```

The worker should also tolerate flat JSON payloads:

```json
{
  "ph": 6.7,
  "moisture": 42.1
}
```

For every received metric:

- infer `value_type` as `number`, `string`, `boolean`, or `null`;
- persist the original `raw_payload`;
- store each metric as an independent row keyed by tenant, device, node, metric name, and timestamp;
- update a `telemetry_latest` projection for dashboard speed.

## ACL Model

Anonymous access must stay disabled.

Device clients should only publish to their own tenant/device topics:

```txt
allow publish pamilo/v1/tenants/{tenantId}/devices/{deviceId}/telemetry
allow publish pamilo/v1/tenants/{tenantId}/devices/{deviceId}/status
allow publish pamilo/v1/tenants/{tenantId}/devices/{deviceId}/events
deny all
```

The backend service account may subscribe broadly:

```txt
allow subscribe pamilo/v1/tenants/+/devices/+/telemetry
allow subscribe pamilo/v1/tenants/+/devices/+/status
allow subscribe pamilo/v1/tenants/+/devices/+/events
```

For production, prefer EMQX built-in authentication and authorization backed by MySQL or a managed secret provisioning flow. File-based ACLs are acceptable only as a bootstrap mechanism.

## Required Runtime Inputs

The deploy workflow creates `infra/emqx/certs` with a bootstrap self-signed certificate if no certificate exists yet. Replace it with a real certificate before production device onboarding.

The workflow expects these GitHub Secrets:

```txt
EMQX_DASHBOARD_PASSWORD
EMQX_DASHBOARD_USERNAME
MYSQL_DATABASE
MYSQL_HOST
MYSQL_PASSWORD
MYSQL_USER
MQTT_SERVICE_PASSWORD
MQTT_SERVICE_USERNAME
SESSION_SECRET
VPS_HOST
VPS_PASSWORD
VPS_PORT
VPS_USERNAME
```

The workflow expects this GitHub Variable:

```txt
PUBLIC_WEB_ORIGIN
```

Optional:

```txt
BMKG_BASE_URL
MYSQL_PORT
VPS_APP_DIR
```

Do not commit production secrets or private TLS keys.

## Bootstrap MQTT Credentials

`infra/emqx/base.hocon` enables EMQX built-in database authentication. Create the backend service account and per-device users through EMQX Dashboard or EMQX Management API after first boot.

Minimum accounts:

```txt
pamilo_ingestor -> backend service subscriber
pamilo.<tenantId>.<deviceId> -> per-device publisher
```

Use strong generated passwords and store only hashed credentials in the application database.
