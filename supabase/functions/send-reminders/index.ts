/**
 * supabase/functions/send-reminders/index.ts
 *
 * Supabase Edge Function: Background Push Notification Dispatcher
 *
 * Flow:
 *  1. Fetch tasks that are incomplete, have a deadline, and haven't been fully notified
 *  2. For each threshold (2h / 30m / 5m) check if the reminder window has arrived
 *  3. Fetch the user's FCM token from user_notification_tokens
 *  4. Send push via Firebase FCM HTTP v1 API (using OAuth2 service account)
 *  5. Mark the threshold as notified to prevent duplicates
 *
 * Trigger: Supabase Cron (pg_cron) every minute — see README
 * Auth: Called with service-role key (bypasses RLS), safe for server-side only
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  user_id: string;
  text: string;
  time: string;           // ISO timestamp — the deadline
  done: boolean;
  reminder_offset: number; // legacy single-offset field (kept for compat)
  notified_2h: boolean;
  notified_30m: boolean;
  notified_5m: boolean;
}

interface NotificationToken {
  user_id: string;
  fcm_token: string;
}

interface NotificationResult {
  task_id: string;
  task_text: string;
  threshold: string;
  user_id: string;
  status: "sent" | "skipped" | "no_token" | "fcm_error" | "db_error";
  detail?: string;
}

interface ThresholdConfig {
  minutes: number;
  label: string;
  field: "notified_2h" | "notified_30m" | "notified_5m";
}

// ─── Threshold Definitions ────────────────────────────────────────────────────

const THRESHOLDS: ThresholdConfig[] = [
  { minutes: 120, label: "2 hours",   field: "notified_2h"  },
  { minutes: 30,  label: "30 minutes", field: "notified_30m" },
  { minutes: 5,   label: "5 minutes",  field: "notified_5m"  },
];

// ─── FCM HTTP v1 API Helpers ──────────────────────────────────────────────────

/**
 * Generate a short-lived OAuth2 access token using a Firebase service account.
 * The service account JSON must be stored as FIREBASE_SERVICE_ACCOUNT env var.
 */
async function getFcmAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set.");
  }

  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  // Build JWT header + payload
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const headerB64  = encode(header);
  const payloadB64 = encode(payload);
  const unsigned   = `${headerB64}.${payloadB64}`;

  // Sign with RS256 using the private key from service account
  const privateKey = sa.private_key as string;
  const keyData    = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${unsigned}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    throw new Error(`Failed to get FCM access token: ${err}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token as string;
}

/**
 * Send a push notification to a single FCM token via HTTP v1 API.
 * Returns { success: boolean, error?: string }
 */
async function sendFcmNotification(
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<{ success: boolean; error?: string }> {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID env var is not set.");

  let accessToken: string;
  try {
    accessToken = await getFcmAccessToken();
  } catch (err) {
    return { success: false, error: `Auth error: ${(err as Error).message}` };
  }

  // Enforce required fields as strings for webpush reliability
  const safeTitle = String(title ?? "Remindly");
  const safeBody = String(body ?? "");
  const safeUrl = String(data?.url ?? "/");
  const safeTag = String(data?.tag ?? data?.task_id ?? "remindly-task");
  const safeTaskId = String(data?.task_id ?? "");

  const dataPayload: Record<string, string> = {
    title: safeTitle,
    body: safeBody,
    url: safeUrl,
    tag: safeTag,
    task_id: safeTaskId,
    ...Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [k, String(v)])),
  };

  // FULL payload for WEB PUSH reliability:
  // Include notification + data + webpush + android priority high.
  // Android requires string data fields and vibrate/priority/tag for good behavior.
  const message = {
    message: {
      token: fcmToken,
      notification: {
        title: safeTitle,
        body: safeBody,
      },
      data: dataPayload,
      webpush: {
        headers: {
          Urgency: "high",
        },
      },
      android: {
        priority: "high",
      },
    },
  };

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  console.log("[send-reminders] 📦 FCM request:");
  console.log("[send-reminders] projectId:", projectId);
  console.log(
    "[send-reminders] fcmToken:",
    `${fcmToken.slice(0, 8)}…${fcmToken.slice(-6)} (len=${fcmToken.length})`,
  );
  console.log("[send-reminders] FCM endpoint:", url);
  console.log("[send-reminders] FCM payload (full):", JSON.stringify(message));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(message),
  });

  const resBody = await res.text();

  console.log("[send-reminders] 🔥 Firebase response status:", res.status);
  // Log full body for audit
  console.log("[send-reminders] 🔥 Firebase response body:", resBody);

  if (!res.ok) {
    if (res.status === 404 || resBody.includes("UNREGISTERED")) {
      return { success: false, error: "UNREGISTERED" };
    }
    return { success: false, error: `FCM ${res.status}: ${resBody}` };
  }

  return { success: true };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  // ── Security: only allow POST requests ──────────────────────────────────────
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Supabase admin client (bypasses RLS) ─────────────────────────────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")               ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")  ?? ""
  );

  const now    = new Date();
  const nowMs  = now.getTime();
  const results: NotificationResult[] = [];

  console.log(`[send-reminders] ⏱ Run started at ${now.toISOString()}`);

  // ── 1. Fetch all tasks that might need a notification ───────────────────────
  // Only fetch tasks that: are not done, have a future deadline or recently passed,
  // and have at least one un-notified threshold.
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, user_id, text, time, done, reminder_offset, notified_2h, notified_30m, notified_5m")
    .eq("done", false)
    .not("time", "is", null)
    // Only tasks where deadline is between NOW-3h and NOW+2h (generous window to catch all thresholds)
    .gte("time", new Date(nowMs - 3 * 60 * 60 * 1000).toISOString())
    .lte("time", new Date(nowMs + 2 * 60 * 60 * 1000 + 60_000).toISOString())
    // Only tasks with at least one un-notified threshold (OR condition via PostgREST)
    .or("notified_2h.eq.false,notified_30m.eq.false,notified_5m.eq.false");

  if (tasksError) {
    console.error("[send-reminders] ❌ Failed to fetch tasks:", tasksError);
    return new Response(JSON.stringify({ error: tasksError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const taskList = (tasks ?? []) as Task[];
  console.log(`[send-reminders] 📋 Found ${taskList.length} candidate task(s).`);

  if (taskList.length === 0) {
    return new Response(
      JSON.stringify({ message: "No tasks need reminders right now.", results: [] }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 2. Cache FCM tokens by user_id to avoid repeated DB calls ───────────────
  const uniqueUserIds = [...new Set(taskList.map((t) => t.user_id))];
  const { data: tokenRows, error: tokenError } = await supabase
    .from("user_notification_tokens")
    .select("user_id, fcm_token")
    .in("user_id", uniqueUserIds);

  if (tokenError) {
    console.warn("[send-reminders] ⚠ Could not fetch tokens:", tokenError);
  }

  const tokenMap = new Map<string, string>(
    (tokenRows ?? []).map((r: NotificationToken) => [r.user_id, r.fcm_token])
  );

  // ── 3. Process each task × each threshold ───────────────────────────────────
  for (const task of taskList) {
    // Native timestamptz flow (no manual timezone append / regex hacks)
    // DB "time" is expected to be a timestamptz/ISO string with timezone.
    console.log(`[Time] [Raw DB value] task.time:`, task.time);

    const deadline = new Date(task.time);
    console.log(`[Time] [Parsed Date] deadline:`, deadline.toString());

    const deadlineMs = deadline.getTime();
    console.log(`[Time] [Parsed timestamp] deadlineMs:`, deadlineMs);

    console.log(`[Time] [Current timestamp] nowMs:`, nowMs);
    console.log(`[Time] [Current Date] now:`, now.toISOString());

    if (!Number.isFinite(deadlineMs)) {
      console.error(`[Time] ❌ Invalid deadlineMs for task.id=${task.id} raw="${task.time}"`);
      // Skip this task so reminder timing calculation doesn't break
      continue;
    }

    const diffMs = deadlineMs - nowMs;
    const diffMinutes = Math.round(diffMs / 60000);

    console.log(`[Time] [Diff minutes] diffMs=${diffMs} diffMinutes=${diffMinutes}`);

    for (const threshold of THRESHOLDS) {
      // Skip if already notified for this threshold
      if (task[threshold.field]) {
        console.log(`[DEBUG]     ⏭  Skipping ${threshold.label} (already notified)`);
        continue;
      }

      const fireAtMs = deadlineMs - threshold.minutes * 60 * 1000;
      // Use a wider window (e.g. 15 minutes) instead of ±90s to ensure cron catches it 
      // even if delayed, but caps it so we don't spam old notifications.
      const windowEndMs = fireAtMs + (15 * 60 * 1000); 
      
      const isMatch = nowMs >= fireAtMs && nowMs <= windowEndMs;
      console.log(`[DEBUG]     🎯 Threshold: ${threshold.label} | Fire At: ${new Date(fireAtMs).toISOString()} | Match: ${isMatch}`);

      // Only fire if we're within the notification window
      if (!isMatch) continue;

      const fcmToken = tokenMap.get(task.user_id);
      if (!fcmToken) {
        console.log(`[send-reminders] ⚠ No FCM token for user ${task.user_id} — task: "${task.text}"`);
        results.push({
          task_id:   task.id,
          task_text: task.text,
          threshold: threshold.label,
          user_id:   task.user_id,
          status:    "no_token",
        });
        continue;
      }

      const title = `⏰ Deadline in ${threshold.label}!`;
      const body  = `"${task.text}" is due at ${new Date(task.time).toLocaleTimeString("en-US", {
        hour:   "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      })}`;

      // Send FCM notification
      const { success, error: fcmError } = await sendFcmNotification(
        fcmToken,
        title,
        body,
        {
          // Required by SW + payload contract
          title: title,
          body: body,
          url: "/",
          tag: `${task.id}:${threshold.field}`,
          task_id: task.id,

          // Extra
          threshold: threshold.field,
          deadline: task.time,
        }
      );

      if (!success) {
        console.error(`[send-reminders] ❌ FCM send failed for task "${task.text}": ${fcmError}`);

        // If token is stale/unregistered, remove it from DB
        if (fcmError === "UNREGISTERED") {
          await supabase
            .from("user_notification_tokens")
            .delete()
            .eq("user_id", task.user_id)
            .eq("fcm_token", fcmToken);
          console.log(`[send-reminders] 🗑 Removed stale FCM token for user ${task.user_id}`);
        }

        results.push({
          task_id:   task.id,
          task_text: task.text,
          threshold: threshold.label,
          user_id:   task.user_id,
          status:    "fcm_error",
          detail:    fcmError,
        });
        continue;
      }

      // ── 4. Mark threshold as notified (prevent duplicates) ─────────────────
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ [threshold.field]: true })
        .eq("id", task.id);

      if (updateError) {
        console.error(`[send-reminders] ⚠ DB update failed for task ${task.id}:`, updateError);
        results.push({
          task_id:   task.id,
          task_text: task.text,
          threshold: threshold.label,
          user_id:   task.user_id,
          status:    "db_error",
          detail:    updateError.message,
        });
        continue;
      }

      console.log(`[send-reminders] ✅ Notified: "${task.text}" [${threshold.label}] → user ${task.user_id}`);
      results.push({
        task_id:   task.id,
        task_text: task.text,
        threshold: threshold.label,
        user_id:   task.user_id,
        status:    "sent",
      });
    }
  }

  const elapsed = Date.now() - startTime;
  const summary = {
    message:   "Reminder check completed",
    run_at:    now.toISOString(),
    elapsed_ms: elapsed,
    total:     results.length,
    sent:      results.filter((r) => r.status === "sent").length,
    skipped:   results.filter((r) => r.status === "skipped").length,
    no_token:  results.filter((r) => r.status === "no_token").length,
    errors:    results.filter((r) => ["fcm_error", "db_error"].includes(r.status)).length,
    results,
  };

  console.log(
    `[send-reminders] 🏁 Done in ${elapsed}ms | sent=${summary.sent} errors=${summary.errors}`
  );

  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
