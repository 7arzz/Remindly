/**
 * src/lib/firebase.js
 * Firebase Cloud Messaging — modular SDK setup
 * Supports: browser compat check, SW registration, token get/refresh, foreground messages
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";

// ─── Firebase Config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Singleton — avoid re-initialising on HMR
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Lazy messaging instance (null if browser doesn't support it)
let _messaging = null;

/**
 * Returns the Firebase Messaging instance, or null if FCM isn't supported.
 * FCM requires: HTTPS (or localhost), service workers, and Notification API.
 */
export const getMessagingInstance = async () => {
  if (_messaging) return _messaging;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn(
        "[FCM] Firebase Messaging is not supported in this browser.",
      );
      return null;
    }
    _messaging = getMessaging(app);
    return _messaging;
  } catch (err) {
    console.error("[FCM] Failed to initialise messaging:", err);
    return null;
  }
};

// ─── Browser Compatibility Check ─────────────────────────────────────────────

/**
 * Returns an object describing what the current browser supports.
 * Use this to show graceful fallbacks in the UI.
 */
export const checkBrowserSupport = () => {
  const support = {
    notifications: "Notification" in window,
    serviceWorker: "serviceWorker" in navigator,
    pushManager: "PushManager" in window,
    // FCM needs all three
    fcm:
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window,
  };
  return support;
};

// ─── Service Worker Registration ─────────────────────────────────────────────

/**
 * Registers /firebase-messaging-sw.js as the FCM service worker.
 * Returns the SW registration, or null on failure.
 */
export const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    console.warn("[FCM] serviceWorker not in navigator");
    return null;
  }

  try {
    const swUrl = "/firebase-messaging-sw.js";

    console.log("[FCM] Registering Firebase Messaging SW...");
    console.log(`[FCM] Using SW path: ${swUrl}`);

    const reg = await navigator.serviceWorker.register(swUrl, {
      scope: "/",
    });

    console.log("[FCM] SW registration success");
    console.log("[FCM] SW registration scope:", reg?.scope);

    const readyReg = await navigator.serviceWorker.ready;
    console.log("[FCM] SW ready");

    return readyReg;
  } catch (err) {
    console.error("[FCM] Service Worker registration failed:", err);
    return null;
  }
};

// ─── Request Permission + Get Token ──────────────────────────────────────────

/**
 * Asks the user for notification permission and, if granted, returns the FCM token.
 * Returns: { token, permission, error }
 */
export const requestNotificationPermission = async () => {
  console.log("[FCM] Requesting notification permission...");
  const result = {
    token: null,
    permission: Notification.permission,
    error: null,
  };

  console.log(`[FCM] Current permission status: ${result.permission}`);

  // Step 1 — check browser support
  const { fcm } = checkBrowserSupport();
  if (!fcm) {
    console.warn("[FCM] Browser does not support push notifications.");
    result.error = "Browser does not support push notifications.";
    return result;
  }

  // Step 2 — request permission if not already granted/denied
  if (Notification.permission === "default") {
    try {
      console.log("[FCM] Awaiting user permission choice...");
      result.permission = await Notification.requestPermission();
      console.log(`[FCM] User permission choice: ${result.permission}`);
    } catch (err) {
      console.error("[FCM] Failed to request notification permission:", err);
      result.error = "Failed to request notification permission.";
      return result;
    }
  }

  if (result.permission !== "granted") {
    console.warn(
      `[FCM] Notification permission was not granted (status: ${result.permission})`,
    );
    result.error = "Notification permission was denied.";
    return result;
  }

  // Step 3 — register SW & get FCM token
  console.log("[FCM] Registering Service Worker for token retrieval...");
  const swReg = await registerServiceWorker();
  if (!swReg) {
    console.error(
      "[FCM] Failed to register service worker during token retrieval.",
    );
    result.error = "Failed to register service worker.";
    return result;
  }

  console.log("[FCM] Initializing Messaging instance...");
  const messaging = await getMessagingInstance();
  if (!messaging) {
    console.error("[FCM] Firebase Messaging is not available.");
    result.error = "Firebase Messaging is not available.";
    return result;
  }

  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    console.log(
      `[FCM] Calling getToken with VAPID key: ${vapidKey ? "present" : "MISSING"}`,
    );

    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      console.log("[FCM] Token obtained");
      result.token = token;
    } else {
      console.error(
        "[FCM] Could not obtain FCM token. Ensure VAPID key is correct.",
      );
      result.error = "Could not obtain FCM token. Ensure VAPID key is correct.";
    }
  } catch (err) {
    console.error("[FCM] getToken error:", err);
    result.error = err.message || "Unknown error while getting FCM token.";
  }

  return result;
};

// ─── Foreground Message Listener ─────────────────────────────────────────────

/**
 * Subscribes to foreground FCM messages.
 * @param {(payload: object) => void} callback  Called with each incoming message payload
 * @returns {() => void} Unsubscribe function — call on component unmount
 */
export const onForegroundMessage = async (callback) => {
  console.log("[FCM] Initializing foreground message listener...");
  const messaging = await getMessagingInstance();
  if (!messaging) {
    console.warn("[FCM] Cannot attach foreground listener: messaging is null.");
    return () => {};
  }

  console.log("[FCM] Foreground listener attached.");
  return onMessage(messaging, async (payload) => {
    try {
      console.log("[FCM] Foreground message received:", payload);

      // Required fields contract (Task 9/12)
      const title =
        payload?.data?.title ?? payload?.notification?.title ?? "Remindly";

      const body = payload?.data?.body ?? payload?.notification?.body ?? "";

      const url = payload?.data?.url ?? "/";
      const tag =
        payload?.data?.tag ??
        payload?.data?.task_id ??
        `remindly-${Date.now()}`;

      const extracted = { title, body, url, tag };
      console.log("[FCM] Foreground extracted fields:", extracted);

      // Force native notification via Service Worker
      console.log(
        "[FCM] Forcing local notification via reg.showNotification (foreground).",
      );

      await sendLocalNotification(title, body, {
        ...(payload.data || {}),
        url,
        tag,
        // keep tag/url contract explicit for SW options.data
        data: { url },
      });

      console.log(
        "[FCM] Foreground notification displayed (reg.showNotification resolved).",
      );
      callback(payload);
    } catch (err) {
      console.error("[FCM] Foreground handler error:", err);
      callback(payload);
    }
  });
};

// ─── Local / In-App Notification ─────────────────────────────────────────────

/**
 * Sends a native browser Notification.
 * Falls back silently if permission hasn't been granted.
 */
export const sendLocalNotification = async (title, body, options = {}) => {
  if (Notification.permission !== "granted") {
    console.log("[FCM] Permission not granted for local notification");
    return;
  }

  const url = String(options?.url ?? options?.data?.url ?? "/");
  const tag = String(
    options?.tag ??
      options?.task_id ??
      options?.data?.tag ??
      `remindly-${Date.now()}`,
  );

  // Build options without duplicate keys (eslint clean)
  const notificationOptions = {
    body: String(body ?? ""),
    icon: options.icon || "/bell.png",
    badge: options.badge || "/favicon.svg",
    tag,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    data: {
      url,
      tag,
      ...(options.data && typeof options.data === "object" ? options.data : {}),
    },
    ...options,
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        console.log("[FCM] Showing local notification via Service Worker", {
          title,
          tag,
          url,
        });
        await reg.showNotification(
          String(title ?? "Remindly"),
          notificationOptions,
        );
        return;
      }
    }
  } catch (err) {
    console.warn(
      "[FCM] SW showNotification failed, falling back to window.Notification:",
      err,
    );
  }

  try {
    console.log("[FCM] Showing local notification via window.Notification", {
      title,
      tag,
      url,
    });
    const n = new Notification(
      String(title ?? "Remindly"),
      notificationOptions,
    );
    setTimeout(() => n.close(), 8000);
    return n;
  } catch (err) {
    console.warn("[FCM] sendLocalNotification failed:", err);
  }
};

// Re-export app for other modules that might need it
export { app };
