# MQTT EMQX Credential Setup

## Why Clients Reconnect

The broker uses EMQX built-in database authentication and the ACL file in `infra/emqx/acl.conf`.
Anonymous MQTT clients are rejected. A client can also authenticate successfully but still be denied
if its username is not allowed by the ACL.

## Demo Users

Create these users in EMQX built-in database for the current demo tenant:

```txt
pamilo_device_demo -> ESP32 publisher
pamilo_web_demo    -> browser/WebSocket subscriber for local demo only
```

The matching ACL rules already allow:

```txt
pamilo_device_demo publish   pamilo/v1/tenants/demo-tenant/devices/+/telemetry
pamilo_web_demo    subscribe pamilo/v1/tenants/demo-tenant/devices/+/telemetry
```

## Create Users From EMQX Dashboard

1. Open EMQX Dashboard at `https://mqtt.keycloud.id`.
2. Go to `Access Control` -> `Authentication`.
3. Open the built-in database authenticator.
4. Open `Users`.
5. Click `Add`.
6. Create `pamilo_device_demo` with a strong password.
7. Create `pamilo_web_demo` with a different strong password if you need browser MQTT testing.

The dashboard is protected by EMQX login. Use the actual values configured in
GitHub Actions production variables/secrets:

```txt
Username variable: EMQX_DASHBOARD_USERNAME
Password secret: EMQX_DASHBOARD_PASSWORD
```

For the current VPS deployment, the deployment workflow also resets/syncs the
Dashboard user password from `EMQX_DASHBOARD_PASSWORD` on every deploy. If login
still shows "Incorrect username or password", confirm that the secret exists in
the `production` environment, then redeploy.

## Create Users From HTTP API

EMQX user-management endpoints are under:

```txt
/api/v5/authentication/{authenticator_id}/users
```

Get the authenticator id from EMQX Dashboard or API, then create a user:

```bash
curl -u 'DASHBOARD_USERNAME:DASHBOARD_PASSWORD' \
  -X POST 'http://127.0.0.1:18083/api/v5/authentication/{authenticator_id}/users' \
  -H 'content-type: application/json' \
  -d '{"user_id":"pamilo_device_demo","password":"CHANGE_ME_STRONG"}'
```

Repeat for `pamilo_web_demo` if needed.

## ESP32 Settings

Use native MQTT with `PubSubClient`:

```txt
Host: mqtt.keycloud.id
Port: 1883
Username: pamilo_device_demo
Password: the password created in EMQX
Topic: pamilo/v1/tenants/demo-tenant/devices/SensorNode01/telemetry
```

Do not use port `8084` with `PubSubClient`; that port is MQTT over WebSocket.
Use port `8883` only when the sketch uses `WiFiClientSecure`.

## Frontend Demo Settings

Browser MQTT credentials are visible to anyone who can load the frontend bundle. Use this only for
local/demo testing, or replace browser MQTT with a backend SSE/WebSocket stream for production.

In `apps/web/.env`, set:

```txt
VITE_MQTT_USERNAME=pamilo_web_demo
VITE_MQTT_PASSWORD=the password created in EMQX
```

Restart the Vite dev server after changing `.env`.
