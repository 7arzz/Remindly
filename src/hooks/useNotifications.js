/**
 * src/hooks/useNotifications.js
 *
 * Reusable hook for FCM notification lifecycle:
 * - Permission request & token retrieval → saved to Supabase
 * - Foreground message handler (shows toast + native notification)
 * - Client-side deadline reminder scheduler (2h / 30m / 5m)
 *   → Fires while the tab is open (backup for the Edge Function)
 *   → Edge Function handles background delivery
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  requestNotificationPermission,
  onForegroundMessage,
  sendLocalNotification,
  checkBrowserSupport,
} from "../lib/firebase";
import { supabase } from "../supabase";

// ─── Reminder thresholds ──────────────────────────────────────────────────────
// Must match Edge Function THRESHOLDS (minutes → field)
const REMINDER_THRESHOLDS = [
  { minutes: 120, label: "2 hours",    field: "notified_2h"  },
  { minutes: 30,  label: "30 minutes", field: "notified_30m" },
  { minutes: 5,   label: "5 minutes",  field: "notified_5m"  },
];

/** Human-readable threshold label */
const thresholdLabel = (minutes) => {
  if (minutes >= 60) return `${minutes / 60} hour${minutes / 60 > 1 ? "s" : ""}`;
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
};

/**
 * useNotifications
 * @param {object|null} user   — Supabase user object
 * @param {Array}       tasks  — Current task list (from Supabase real-time)
 */
export const useNotifications = (user, tasks = []) => {
  const [permission,    setPermission]   = useState(Notification?.permission ?? "default");
  const [tokenLoading,  setTokenLoading] = useState(false);
  const [tokenError,    setTokenError]   = useState(null);
  const [fcmToken,      setFcmToken]     = useState(null);
  const support                          = checkBrowserSupport();

  // Track which (taskId:threshold) pairs have already fired THIS session
  // This prevents duplicate client-side toasts on re-render
  const notifiedRef = useRef(new Set());

  // ─── Save FCM token to Supabase ──────────────────────────────────────────
  const saveToken = useCallback(
    async (token) => {
      if (!user || !token) return;
      try {
        const { error } = await supabase
          .from("user_notification_tokens")
          .upsert(
            { user_id: user.id, fcm_token: token },
            { onConflict: "user_id" }
          );
        if (error) throw error;
        console.log("[Notifications] ✅ FCM token saved to Supabase.");
      } catch (err) {
        console.error("[Notifications] ❌ Failed to save FCM token:", err);
      }
    },
    [user]
  );

  // ─── Request permission + get token ──────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!support.fcm) {
      setTokenError("Your browser does not support push notifications.");
      return;
    }

    setTokenLoading(true);
    setTokenError(null);

    const result = await requestNotificationPermission();
    setPermission(result.permission);

    if (result.token) {
      setFcmToken(result.token);
      await saveToken(result.token);
    }

    if (result.error) {
      setTokenError(result.error);
      if (result.permission !== "denied") {
        toast.error("Notification setup failed", { description: result.error });
      }
    }

    setTokenLoading(false);
    return result;
  }, [support.fcm, saveToken]);

  // ─── Auto-request permission once user is signed in ──────────────────────
  useEffect(() => {
    if (!user?.id || !support.fcm) return;
    if (Notification.permission === "granted") {
      // Already granted — silently refresh the token
      requestPermission();
    }
    // If "default", the NotificationPermissionBanner UI will prompt the user
  }, [user?.id, support.fcm, requestPermission]);

  // ─── Foreground message handler ───────────────────────────────────────────
  // Fires when a push arrives while the tab IS open (SW skips in this case)
  useEffect(() => {
    let unsubscribe = () => {};

    const setup = async () => {
      unsubscribe = await onForegroundMessage((payload) => {
        const title = payload?.notification?.title ?? "Remindly";
        const body  = payload?.notification?.body  ?? "";

        // Rich in-app toast
        toast(title, {
          description: body,
          duration:    6000,
          icon:        "🔔",
        });

        // Also fire a native notification (some browsers suppress SW ones when tab is open)
        sendLocalNotification(title, body);
      });
    };

    setup();
    return () => unsubscribe();
  }, []);

  // ─── Client-side deadline reminder scheduler ──────────────────────────────
  // This runs while the tab is OPEN as a secondary safety net.
  // The Edge Function handles background delivery.
  // It mirrors the same threshold logic so the user gets notified either way.
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    const checkDeadlines = () => {
      const now = Date.now();

      tasksRef.current.forEach((task) => {
        if (task.done || !task.time) return;

        const deadlineMs = new Date(task.time).getTime();

        REMINDER_THRESHOLDS.forEach(({ minutes, label, field }) => {
          const key        = `${task.id}:${field}`;
          const fireAtMs   = deadlineMs - minutes * 60 * 1000;
          const toleranceMs = 35_000; // ±35 s (interval is 30 s)

          // Only fire if we're in the window AND haven't fired this session
          if (
            now >= fireAtMs - toleranceMs &&
            now <= fireAtMs + toleranceMs &&
            !notifiedRef.current.has(key)
          ) {
            // Skip if Edge Function already marked it notified in DB
            // (avoid double-notif when tab was open during the cron window)
            if (task[field] === true) {
              notifiedRef.current.add(key); // suppress future in-session fires
              return;
            }

            notifiedRef.current.add(key);
            const humanLabel = thresholdLabel(minutes);

            sendLocalNotification(
              `⏰ Deadline in ${humanLabel}!`,
              `"${task.text}" is due at ${new Date(task.time).toLocaleTimeString([], {
                hour:   "2-digit",
                minute: "2-digit",
              })}`,
              { tag: key }
            );

            toast.warning(`⏰ Reminder: "${task.text}"`, {
              description: `Deadline in ${humanLabel}!`,
              duration:    8000,
            });
          }
        });
      });
    };

    const interval = setInterval(checkDeadlines, 30_000);
    checkDeadlines(); // run immediately on mount / task change

    return () => clearInterval(interval);
  }, []);

  return {
    permission,
    fcmToken,
    tokenLoading,
    tokenError,
    support,
    requestPermission,
  };
};
