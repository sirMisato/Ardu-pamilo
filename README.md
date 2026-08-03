# PAMILO Smart Farming GIS

PAMILO is a multi-tenant smart farming GIS platform. The current delivery baseline covers local engineering foundation, auth and tenancy, GIS metadata, device/MQTT contracts, telemetry, BMKG weather, API hardening, and Phase 8 staging deployment readiness.

## Repository Map

```text
apps/
  api/                       Fastify API skeleton
  web/                       Vue/Vite frontend skeleton
  workers/mqtt-ingestor/     MQTT telemetry ingestor skeleton
packages/
  shared/                    Shared telemetry, MQTT, and tenancy contracts
docs/                        PM, role, risk, and deployment documentation
infra/                       Local infrastructure config
scripts/                     Repository maintenance scripts
```

## Commands

```text
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run ci
```

Local development:

```text
npm run dev:api
npm run dev:web
npm run dev:mqtt-ingestor
```

Docker local skeleton:

```text
docker compose up
```

Staging smoke:

```text
PAMILO_BASE_URL=http://<staging-host>:8080 npm run smoke:staging
```

Pilot UAT:

```text
PAMILO_UAT_BASE_URL=http://<staging-host>:8080 PAMILO_UAT_ORIGIN=http://<staging-host>:8080 npm run uat:pilot
```

## Delivery Boundaries

- No production deployment.
- No DNS changes.
- No production database connection.
- No production MQTT broker connection.
- No real credentials in repository files.

See [docs/23-phase-9-pilot-uat.md](docs/23-phase-9-pilot-uat.md) for the current phase status.
