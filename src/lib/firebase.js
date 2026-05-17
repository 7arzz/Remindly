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
    // In production, Vite PWA generates 'sw.js' which imports our firebase script.
    // In development, Vite PWA is disabled, so we directly register the firebase script.
    const swUrl = import.meta.env.MODE === "production" ? "/sw.js" : "/firebase-messaging-sw.js";
    
    console.log(`[FCM] Attempting to register Service Worker at: ${swUrl}`);
    const reg = await navigator.serviceWorker.register(swUrl, {
      scope: "/",
    });
    console.log(`[FCM] Service Worker registered (${swUrl}):`, reg.scope);
    
    // Wait for it to become ready
    const readyReg = await navigator.serviceWorker.ready;
    console.log(`[FCM] Service Worker is ready!`, readyReg);
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
    console.warn(`[FCM] Notification permission was not granted (status: ${result.permission})`);
    result.error = "Notification permission was denied.";
    return result;
  }

  // Step 3 — register SW & get FCM token
  console.log("[FCM] Registering Service Worker for token retrieval...");
  const swReg = await registerServiceWorker();
  if (!swReg) {
    console.error("[FCM] Failed to register service worker during token retrieval.");
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
    console.log(`[FCM] Calling getToken with VAPID key: ${vapidKey ? "present" : "MISSING"}`);
    
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      console.log("[FCM] Token obtained successfully:", token.slice(0, 20) + "…");
      result.token = token;
    } else {
      console.error("[FCM] Could not obtain FCM token. Ensure VAPID key is correct.");
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
  return onMessage(messaging, (payload) => {
    console.log("[FCM] Foreground message received:", payload);
    
    // STEP 6: If Firebase foreground payload arrives, show notification manually
    // Since Firebase doesn't automatically show notification in foreground, we force it
    const title = payload?.data?.title ?? payload?.notification?.title ?? "Remindly";
    const body  = payload?.data?.body  ?? payload?.notification?.body  ?? "";
    
    console.log(`[FCM] Forcing local notification for foreground message: ${title}`);
    sendLocalNotification(title, body, payload.data || {});
    
    callback(payload);
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

  const notificationOptions = {
    body,
    icon: options.icon || "/bell.png",
    badge: options.badge || "/favicon.svg",
    tag: options.tag || `remindly-${Date.now()}`,
    ...options,
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        console.log("[FCM] Showing local notification via Service Worker");
        await reg.showNotification(title, notificationOptions);
        return;
      }
    }
  } catch (err) {
    console.warn("[FCM] SW showNotification failed, falling back to window.Notification:", err);
  }

  try {
    console.log("[FCM] Showing local notification via window.Notification");
    const n = new Notification(title, notificationOptions);
    // Auto-close after 8 seconds
    setTimeout(() => n.close(), 8000);
    return n;
  } catch (err) {
    console.warn("[FCM] sendLocalNotification failed:", err);
  }
};

// Re-export app for other modules that might need it
export { app };
