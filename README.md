# PAMILO Smart Farming GIS

PAMILO is a multi-tenant smart farming GIS platform. The current delivery baseline covers local engineering foundation, auth and tenancy, GIS metadata, device/MQTT contracts, telemetry, BMKG weather, API hardening, staging deployment, pilot/UAT, production release gates, public VPS simulation, ops readiness, and handover preparation.

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

Production release gate:

```text
npm run release:preflight
PAMILO_PRODUCTION_SMOKE_APPROVED=true PAMILO_PRODUCTION_BASE_URL=https://sedayafarm.keycloud.id npm run smoke:production
```

Public VPS simulation and ops gates:

```text
PAMILO_PUBLIC_VPS_BASE_URL=http://43.157.203.226:8080 PAMILO_PUBLIC_VPS_ORIGIN=http://43.157.203.226:8080 npm run simulate:public-vps
npm run domain:readiness
npm run ops:readiness
npm run handover:check
```

## Delivery Boundaries

- No production deployment.
- No DNS changes.
- No production database connection.
- No production MQTT broker connection.
- No real credentials in repository files.

See [docs/28-phase-14-domain-tls-cutover.md](docs/28-phase-14-domain-tls-cutover.md) for the current phase status.
