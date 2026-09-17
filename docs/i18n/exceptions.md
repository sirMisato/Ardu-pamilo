# PAMILO i18n Exceptions

Batch: 14 - backend, notifications, and cross-feature coverage closeout.

These entries are documented exceptions, not skipped UI strings.

| Area | Status | Reason | Follow-up |
| --- | --- | --- | --- |
| Map tiles and attributions | not_applicable | OpenStreetMap, Esri, Leaflet, BMKG attribution, and map tile place labels are third-party/source content. | Keep source attribution unchanged. |
| Notification feed/templates | not_applicable | The active repo only contains a header notification icon and settings preferences. No notification feed table, event template registry, scheduler, email template, SMS transport, or external delivery route exists. | When notification persistence is added, store event code + params + recipient locale; keep old text-only notifications as source-language historical content. |
| Email or external channels | not_applicable | No mailer, external notification transport, tokenized email template, or preview route exists in `apps/api` or `apps/web`. | Add recipient-locale template rendering and transport mock before enabling delivery. |
| AI recommendation history | blocked | The app has no recommendation history table, cache, or read endpoint. Batch 12 only supports bilingual content for the in-memory generate response. | Add persistence with `contentLocales`, `generatedLocale`, and per-record variant metadata before backfilling older recommendations. |
| Weather source text | source_content | BMKG `weather_desc` and `weather_desc_en` are source fields. Adapter code uses the requested display variant when available; older weather history may only contain source text. | Preserve source text and expose `conditionEn`/`weatherCode` when available. |
| User and tenant content | source_content | Tenant names, user names, emails, plot names, crop names/descriptions, varieties, notes, IDs, topics, metric keys, and raw payloads are user/protocol data. | Do not auto-translate; translate labels around the data. |
| PWA manifest description | blocked | The Vite PWA manifest is a static generated asset. The current SPA has no per-locale manifest negotiation or dynamic manifest endpoint. | Implement dynamic manifest generation or language-specific manifest links if product requires localized install metadata. |
| Browser E2E evidence in Batch 15 environment | blocked | This workspace did not expose local Playwright, Chrome, Edge, or Chromium commands, and no tenant/admin DB fixture credentials were available. | Run desktop/mobile browser E2E with fixture tenants when the runtime is available; keep `verification.md` updated with screenshots/results. |
| Server logs and CLI seed output | not_applicable | MQTT ingestor logs and seed script console output are operational/developer surfaces, not user-facing runtime UI. | Keep logs stable and avoid translating machine/ops messages unless an admin UI exposes them. |
