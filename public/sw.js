// RevieWorld service worker: makes the app installable and shows a friendly
// page when there is no connection. Pages and data always come from the
// network (nothing is cached), so what you see is never out of date.
const OFFLINE = "/offline.html";
const CACHE = "revieworld-offline-v3";
// v2: push notifications.

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/brand/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});

// Push notifications (like, comment, new follower…), shown like a chat
// message. Tapping one opens the page it is about.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "RevieWorld";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/brand/icon-192.png",
        badge: "/icons/badge-72.png",
        tag: data.tag,
        data: { url: data.url || "/it/notifications" },
      }),
      self.navigator.setAppBadge ? self.navigator.setAppBadge().catch(() => {}) : null,
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/it/notifications", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          return c.focus().then((w) => (w && "navigate" in w ? w.navigate(url) : null));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
