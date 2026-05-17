/**
 * public/firebase-messaging-sw.js
 * Firebase Cloud Messaging Service Worker
 *
 * IMPORTANT: This file runs in its own SW scope — no access to Vite/ESM.
 * We must use importScripts (compat SDK) and hardcoded config values here.
 *
 * Background message handling:
 *  - Shows a rich notification when the app tab is closed/hidden
 *  - Handles notification click to focus/open the app
 */

// ─── Firebase compat SDK (required inside SW) ─────────────────────────────────
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// ─── Firebase Config (hardcoded — env vars are NOT available in SW) ───────────
// These values mirror your .env — safe to expose (they're public-facing keys)
firebase.initializeApp({
  apiKey:            "AIzaSyADgLsiTYqfYbvnlt1BI2cQonBTguxlhDU",
  authDomain:        "remindly-579de.firebaseapp.com",
  projectId:         "remindly-579de",
  storageBucket:     "remindly-579de.firebasestorage.app",
  messagingSenderId: "575184734169",
  appId:             "1:575184734169:web:6c8fbd257a6a686e263bc8",
});

const messaging = firebase.messaging();

// ─── Background Message Handler ───────────────────────────────────────────────
// Fires when the app is in the background, minimised, or the tab is closed.
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);

  const title = payload?.notification?.title ?? "Remindly";
  const body  = payload?.notification?.body  ?? "";
  const icon  = payload?.notification?.icon  ?? "/bell.png";
  const badge = payload?.notification?.badge ?? "/favicon.svg";
  const tag   = payload?.data?.tag           ?? "remindly-notification";
  const url   = payload?.data?.url           ?? "/";

  const options = {
    body,
    icon,
    badge,
    tag,
    // Rich notification data for click handler
    data: { url, ...payload?.data },
    // Action buttons
    actions: [
      { action: "open",    title: "Open Remindly" },
      { action: "dismiss", title: "Dismiss" },
    ],
    // Vibration pattern (mobile)
    vibrate: [200, 100, 200],
    // Require interaction on desktop (notification stays until user acts)
    requireInteraction: true,
  };

  self.registration.showNotification(title, options);
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  const { notification, action } = event;
  notification.close();

  if (action === "dismiss") return;

  const targetUrl = notification?.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ─── SW Lifecycle Hooks ───────────────────────────────────────────────────────
self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
