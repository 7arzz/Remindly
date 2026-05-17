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
  if (!("serviceWorker" in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      {
        scope: "/",
      },
    );
    console.log("[FCM] Service Worker registered:", reg.scope);
    await navigator.serviceWorker.ready; // Ensure it's active
    return reg;
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
  const result = {
    token: null,
    permission: Notification.permission,
    error: null,
  };

  // Step 1 — check browser support
  const { fcm } = checkBrowserSupport();
  if (!fcm) {
    result.error = "Browser does not support push notifications.";
    return result;
  }

  // Step 2 — request permission if not already granted/denied
  if (Notification.permission === "default") {
    try {
      result.permission = await Notification.requestPermission();
    } catch (err) {
      result.error = "Failed to request notification permission.";
      return result;
    }
  }

  if (result.permission !== "granted") {
    result.error = "Notification permission was denied.";
    return result;
  }

  // Step 3 — register SW & get FCM token
  const swReg = await registerServiceWorker();
  if (!swReg) {
    result.error = "Failed to register service worker.";
    return result;
  }

  const messaging = await getMessagingInstance();
  if (!messaging) {
    result.error = "Firebase Messaging is not available.";
    return result;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      console.log("[FCM] Token obtained:", token.slice(0, 20) + "…");
      result.token = token;
    } else {
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
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log("[FCM] Foreground message received:", payload);
    callback(payload);
  });
};

// ─── Local / In-App Notification ─────────────────────────────────────────────

/**
 * Sends a native browser Notification (works only while the tab is open).
 * Falls back silently if permission hasn't been granted.
 */
export const sendLocalNotification = (title, body, options = {}) => {
  if (Notification.permission !== "granted") return;

  try {
    const n = new Notification(title, {
      body,
      icon: options.icon || "/bell.png",
      badge: options.badge || "/favicon.svg",
      tag: options.tag || `remindly-${Date.now()}`,
      ...options,
    });

    // Auto-close after 8 seconds
    setTimeout(() => n.close(), 8000);
    return n;
  } catch (err) {
    console.warn("[FCM] sendLocalNotification failed:", err);
  }
};

// Re-export app for other modules that might need it
export { app };
