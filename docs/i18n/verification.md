# PAMILO i18n Final Verification

Batch: 15 - final audit, hardening, and maintenance closeout.

Date: 2026-09-17

## Environment

| Item | Result |
| --- | --- |
| Repository | `c:\laragon\www\Ardu-pamilo` |
| Web stack | Vue 3, Vite, Pinia, Vue Router, Tailwind, Chart.js, Leaflet |
| API stack | Fastify, TypeScript, Kysely, MySQL |
| SSR | Not used; SPA only, so SSR/hydration locale checks are not applicable |
| Browser automation | Blocked in this environment: no local Playwright, Chrome, Edge, or Chromium command was available |
| Database fixture | Not available from the active workspace context; destructive/reset scenarios were not executed |

## Command Results

| Check | Result |
| --- | --- |
| `npm run i18n:check` in `apps/web` | Passed: 791 keys, 618 used keys |
| Catalog identical-value audit | 55 identical ID/EN values; reviewed as technical/brand/accepted short labels. Manual review remainder: `navigation.aiShort=AI`, `navigation.mqtt=MQTT`, both intentional |
| Hard-coded formatter audit | Passed for app code outside shared i18n helpers. `id-ID`/`en-US` now only appear in i18n config/helpers and HST/DAP catalog text |
| Vue template literal audit | Remaining literals are brand/source/technical strings such as PAMILO, Smart Farming GIS, OpenStreetMap attribution, QoS, ADM4, Endpoint, Device UID, Telemetry Topic, plus unused `PlaceholderView.vue` |
| `npm run typecheck` in `apps/web` | Passed |
| `npm run build` in `apps/web` | Passed; Vite chunk-size warning remains baseline |
| `npm run typecheck` in `apps/api` | Passed |
| `npm run build` in `apps/api` | Passed |
| Preview smoke | `npm run preview -- --host 127.0.0.1 --port 4173`; `/login` returned HTTP 200 and contained `<div id="app">` |
| API locale resolver smoke | `id=>id`, `id-ID=>id`, `en=>en`, `en-US=>en`, `fr=>null`, empty=>null, null=>null |
| API message smoke | `loginInvalidCredentials` returned localized ID and EN messages from built API output |

No `lint` or `test` script exists in either `apps/web/package.json` or `apps/api/package.json`.

## Feature Matrix

| Feature or State | ID | EN | Verification |
| --- | --- | --- | --- |
| New visitor default locale | verified | verified | `initI18n()` defaults to `id` when guest storage is absent |
| Language dropdown order and values | verified | verified | `languageOptions` order is `en`, then `id`; labels are fixed `EN - English`, `ID - Indonesia` |
| Header active language label desktop/mobile | verified | verified | Batch 15 changed `LanguageSelect.vue` so the trigger shows the full active label at all breakpoints |
| Invalid locale | verified | verified | Frontend/API `normalizeLocale` only accepts `id`, `id-ID`, `en`, `en-US`; invalid values fall back through resolver |
| Storage failure | verified by code | verified by code | `safeReadStorage`/`safeWriteStorage` catch storage errors; in-memory locale still updates |
| Tenant/super admin account isolation | verified by code | verified by code | Locale storage keys are namespaced by role, tenant id, and user email |
| Auth pages | implemented | implemented | Catalog keys and route title keys present for tenant and super admin login |
| Tenant shell and navigation | implemented | implemented | Sidebar, bottom nav, topbar, route meta, role labels, logout/search/notification labels migrated |
| Dashboard and FieldMap | implemented | implemented | Cards, map controls, popups, connection states, metric labels use catalog/formatters |
| AI recommendation UI | implemented | implemented | UI labels localized; generate request sends locale; stored bilingual response variant switches without a new model call |
| AI recommendation history | not_applicable | blocked | No history table/cache/read endpoint exists; see exceptions |
| Weather forecast/monthly/config | implemented | implemented | Tabs, report, config, BMKG adapter, and shared formatter paths migrated |
| Chart | implemented | implemented | Filters, chart labels/options, tooltips, thresholds, and formatters localized |
| Report and export | implemented | implemented | CSV headers/filename and printable PDF HTML use active locale; raw records stay canonical |
| MQTT | implemented | implemented | UI labels localized; topics, QoS, broker, metric keys, and raw payload preserved |
| Devices | implemented | implemented | Cards, filters, table, modal, detail, and feedback localized; Device UID/topic preserved |
| Master Data crop/area/threshold | implemented | implemented | UI, validation, polygon controls, HST/DAP, and formatter paths migrated |
| User Tenant | implemented | implemented | Summary, table, modal, validation, confirmations, and API messages localized |
| Settings | implemented | implemented | All tabs and reset guard localized; display tab uses the same `LanguageSelect` source |
| Super Admin | implemented | implemented | Dashboard/licenses/layout localized; Batch 15 fixed layout header and ID terminology |
| Backend API messages | implemented | implemented | `request.locale` is per request; `message` localized; stable `error` codes preserved |
| Notifications feed/templates | not_applicable | not_applicable | No feed/template/delivery module exists |
| PWA manifest | blocked | blocked | Static generated manifest has no per-locale negotiation |
| Browser E2E state preservation | blocked | blocked | Browser automation and DB fixtures unavailable in this environment; state preservation verified by code paths and absence of locale-driven fetch/subscription watchers |

## Findings Fixed in Batch 15

| Finding | Fix |
| --- | --- |
| Mobile language trigger showed only `EN`/`ID`, while the requirement says the header shows the active choice | `LanguageSelect.vue` now displays the full active label (`EN - English` / `ID - Indonesia`) at mobile and desktop sizes |
| Super admin layout brand area had hard-coded `Super Admin` and `License Control` | `SuperAdminLayout.vue` now uses `roles.superAdmin` and `layout.licenseControl`; ID label is `Kontrol Lisensi` |
| Some ID catalog entries stayed overly English (`Admin Email`, `Refresh`, `Edit`, `License Management`, `System Overview`, `Update User`) | Updated ID catalog terminology to clearer Indonesian while preserving protocol/brand/source terms |
| `bmkgService.ts` used `Intl.DateTimeFormat("id-ID")` directly | Date label generation now uses shared `formatDateTime()` |

## Remaining Limitations

- Full browser interaction across every route, modal, chart selection, map popup, polygon draft, and realtime listener was not executed because this environment has no browser automation runtime and no active DB fixture.
- Destructive or external side-effect actions were not executed: reset system, delete records, email/SMS/push, paid AI calls, and deployment.
- AI history/backfill and PWA localized manifest remain blocked by missing product/storage/runtime support.
- Route fallback `meta.title`/`subtitle` still contain legacy fallback strings for developer compatibility, but active display uses `titleKey`/`subtitleKey`; `npm run i18n:check` verifies those keys exist.

