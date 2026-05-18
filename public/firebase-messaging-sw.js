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
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js",
);

// ─── Firebase Config (hardcoded — env vars are NOT available in SW) ───────────
// These values mirror your .env — safe to expose (they're public-facing keys)
firebase.initializeApp({
  apiKey: "AIzaSyADgLsiTYqfYbvnlt1BI2cQonBTguxlhDU",
  authDomain: "remindly-579de.firebaseapp.com",
  projectId: "remindly-579de",
  storageBucket: "remindly-579de.firebasestorage.app",
  messagingSenderId: "575184734169",
  appId: "1:575184734169:web:6c8fbd257a6a686e263bc8",
});

const messaging = firebase.messaging();

// ─── Background Message Handler ───────────────────────────────────────────────
// Fires when the app is in the background, minimised, or the tab is closed.
messaging.onBackgroundMessage((payload) => {
  try {
    console.log("[SW] payload received:", payload);

    // Fallback parsing (required)
    const title =
      payload?.notification?.title || payload?.data?.title || "Remindly";

    const body = payload?.notification?.body || payload?.data?.body || "";

    const url = payload?.data?.url || payload?.data?.Url || "/";

    // Required fields
    const tag = payload?.data?.tag || payload?.data?.task_id || "remindly-task";

    // Extra debug extraction log
    console.log("[SW] extracted fields:", {
      title,
      body,
      url,
      tag,
      notification: payload?.notification || null,
      data: payload?.data || null,
    });

    const options = {
      body,
      icon: "/bell.png",
      badge: "/favicon.svg",
      tag: String(tag),
      data: {
        url: String(url),
        tag: String(tag),
      },
      actions: [
        { action: "open", title: "Open Remindly" },
        { action: "dismiss", title: "Dismiss" },
      ],
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
    };

    return self.registration
      .showNotification(title, options)
      .then(() => console.log("[SW] notification displayed"))
      .catch((err) => console.error("[SW] notification display error:", err));
  } catch (err) {
    console.error("[SW] background handler fatal error:", err);
  }
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
      }),
  );
});

// ─── SW Lifecycle Hooks ───────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] registered");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] active");
  event.waitUntil(
    clients.claim().then(() => {
      console.log("[SW] controlling page");
    }),
  );
});
