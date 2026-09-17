self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        body: event.data.text()
      };
    }
  }

  const title = payload.title || "PAMILO";
  const options = {
    badge: "/pwa.svg",
    body: payload.body || "",
    data: payload.data || {},
    icon: "/pwa.svg",
    tag: payload.tag || "pamilo-alert"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({
      includeUncontrolled: true,
      type: "window"
    });

    for (const client of clientsList) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) {
          await client.navigate(targetUrl);
        }
        return;
      }
    }

    await self.clients.openWindow(targetUrl);
  })());
});
