# PAMILO Smart Farming GIS

PAMILO is a multi-tenant smart farming GIS platform. Phase 1 focuses on the local engineering foundation: monorepo structure, shared contracts, API/web/worker skeletons, Docker local services, and CI checks.

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

## Phase 1 Boundaries

- No production deployment.
- No DNS changes.
- No production database connection.
- No production MQTT broker connection.
- No real credentials in repository files.

See [docs/14-phase-1-foundation.md](docs/14-phase-1-foundation.md) for the current phase status.
