# PAMILO i18n Maintenance Guide

Use this guide when adding or changing UI/API text after Batch 15.

## Adding UI Text

1. Add semantic keys to both `apps/web/src/i18n/id.json` and `apps/web/src/i18n/en.json` in the relevant namespace.
2. Use `t("namespace.key")` or `tn("namespace.key", count)` from `useI18n()`.
3. Keep placeholder names identical in ID and EN, for example `{name}` in both catalogs.
4. Translate complete sentences. Do not build Indonesian or English sentences by concatenating fragments.
5. Do not translate brand, user content, IDs, topics, metric keys, raw JSON keys, enum values, coordinates, emails, URLs, hostnames, or `RESET PAMILO`.

Example:

```json
{
  "devices": {
    "feedback": {
      "deviceSaved": "Perangkat {deviceUid} ditambahkan."
    }
  }
}
```

```ts
t("devices.feedback.deviceSaved", { deviceUid: device.deviceUid });
```

## Plural and Interpolation

Use `tn()` for count-sensitive text and keep plural leaves in both catalogs:

```json
{
  "charts": {
    "dataPoints": {
      "one": "{count} data point",
      "other": "{count} data points"
    }
  }
}
```

Indonesian may use the same text for `one` and `other`, but both keys must exist when English needs them.

## Formatters

Use shared helpers from `apps/web/src/i18n/formatters.ts`:

- `formatNumber`
- `formatPercent`
- `formatDateTime`
- `formatDateRange`
- `formatRelativeTime`
- `formatDataCount`
- `formatDurationMinutes`
- `formatCropAge`

Rules:

- `id` displays with `id-ID`; `en` displays with `en-US`.
- Locale changes must not change timezone, units, raw numeric values, precision, timestamps, or business formulas.
- Percent values must declare intent: ratios use `valueKind: "ratio"`, percentage numbers use `valueKind: "percent"`.
- HST is displayed as DAP in English through catalog/formatter text only; the crop-age calculation stays unchanged.

## Metrics, Weather, and Dynamic Data

- Use `apps/web/src/i18n/metrics.ts` for known metric labels and unit normalization.
- Use `apps/web/src/i18n/weather.ts` for BMKG condition labels, wind labels, and weather code fallback.
- Preserve BMKG source text and attribution. Prefer `condition` for ID and `conditionEn` for EN when present.
- User notes, crop names, plot names, tenant names, scientific names, varieties, and descriptions remain in the source language entered by the user.
- AI generated output must be requested or stored with locale metadata. Switching the dropdown must select an existing localized variant and must not call the AI provider again.

## Locale Resolver and Persistence

Allowed internal codes are only `id` and `en`.

Frontend priority:

1. Explicit selection in the current session.
2. Account/server preference when available and valid.
3. Namespaced local preference:
   - Guest: `pamilo.locale.guest`
   - Tenant: `pamilo.locale.tenant.{tenantId}.{email}`
   - Super admin: `pamilo.locale.superadmin.{email}`
4. Default `id`.

Backend:

- `apiClient` sends `Accept-Language` and `X-Pamilo-Locale`.
- API resolves locale per request in `apps/api/src/i18n/locale.ts`.
- Locale is not tenant identity, not an authorization input, and not stored in a global mutable server variable.

## API Messages, Jobs, and Cache

- Keep `error` codes stable and localize the user-facing `message`.
- Add backend messages to `apps/api/src/i18n/messages.ts`.
- Keep API additions aditive. Old clients must still work without locale headers.
- Async jobs, caches, and generated content should include locale metadata in the cache key or stored payload when the output text depends on language.
- Do not share cached generated text across tenants, users, or locales unless the data is explicitly locale-neutral.

## Verification

Run from the app directories:

```powershell
cd apps/web
npm run i18n:check
npm run typecheck
npm run build

cd ../api
npm run typecheck
npm run build
```

When a browser runtime and fixtures are available, also verify:

- New guest starts in ID, switches to EN, refreshes, navigates, switches back to ID.
- Header dropdown order remains `EN - English` then `ID - Indonesia`.
- Forms, filters, tabs, pagination, date ranges, map position, polygon draft, chart selection, and realtime subscriptions survive locale changes.
- API messages respond in ID/EN based on request locale and invalid locale falls back safely.

Update these docs with each localization change:

- `docs/i18n/coverage.csv`
- `docs/i18n/progress.md`
- `docs/i18n/glossary.md` when terminology changes
- `docs/i18n/exceptions.md` for real source/third-party/blocked surfaces only

