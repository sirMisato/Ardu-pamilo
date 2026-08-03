# AGENTS

## Repo Map

- `apps/api`: Fastify API.
- `apps/web`: Vue/Vite frontend.
- `apps/workers/mqtt-ingestor`: MQTT ingestion worker.
- `packages/shared`: shared schemas and contracts.
- `docs`: PM and technical documentation.
- `infra`: local infrastructure config.

## Commands

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run ci`

## Security Invariants

- Never commit real credentials.
- Browser code must not contain MQTT, Redis, VictoriaMetrics, or MySQL credentials.
- Tenant-owned backend operations require TenantContext.
- Production MQTT must use TLS and per-device ACLs.
- Production DB access must not be added until the TLS/Hostinger decision is closed.

## Do Not

- Do not deploy production from this repository without release approval.
- Do not change DNS in code tasks.
- Do not connect to production MQTT or MySQL during local tests.
- Do not add universal agronomy thresholds without provenance.
