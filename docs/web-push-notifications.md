# PAMILO Web Push Notifications

Web push lets PAMILO send browser/phone notifications even when the app tab is closed, as long as:

- The app is served over HTTPS, except local `localhost` development.
- The browser supports Web Push.
- The user grants notification permission.
- The API has VAPID keys configured.
- The tenant has `Web Alerts` and the relevant notification type enabled.

## Setup

Generate VAPID keys in `apps/api`:

```powershell
node -e "const webpush=require('web-push'); console.log(webpush.generateVAPIDKeys())"
```

Set the generated values in the API environment:

```env
WEB_PUSH_CONTACT=mailto:admin@pamilo.local
WEB_PUSH_PUBLIC_KEY=...
WEB_PUSH_PRIVATE_KEY=...
```

Run the additive migration:

```powershell
cd apps/api
npm run migrate
```

Then build/restart API and web.

## User Flow

1. Open PAMILO on the phone/browser.
2. Go to `Pengaturan` -> `Notifikasi`.
3. Keep `Web Alerts` enabled.
4. Tap `Aktifkan Notifikasi HP`.
5. Allow notification permission in the browser.
6. Use `Kirim Tes` to verify delivery.

## Current Triggers

- Threshold breach push is sent when new telemetry is ingested and a known metric crosses the active crop threshold for the device plot.
- The implementation stores browser subscriptions per tenant and user.
- Expired push subscriptions are removed automatically when the push service returns `404` or `410`.

Device-offline and weather-warning preferences are stored, but background push triggers for scheduled offline checks or external weather warning jobs require a scheduler/event source before they can send automatically.
