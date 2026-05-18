/**
 * supabase/functions/send-reminders/index.ts
 *
 * Background push dispatcher (Supabase Edge / Deno).
 *
 * Trigger: pg_cron → POST with service-role key
 *
 * Design:
 *  - Distributed lock (function_locks + stale recovery)
 *  - Atomic per-threshold claim (idempotent, concurrency-safe)
 *  - Batched reads, paginated task scan
 *  - FCM HTTP v1 with OAuth2 + exponential backoff retries
 *  - UTC-safe deadline math; display TZ explicit for body text
 */

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

// ─── Config ───────────────────────────────────────────────────────────────────

const LOCK_NAME = "send-reminders";
const LOCK_STALE_MS = 10 * 60 * 1000; // recover crashed workers after 10m

const TASK_PAGE_SIZE = 200;
const MAX_TASK_PAGES = 10; // up to 2_000 candidates per run

/** Only tasks with deadline in [now - LOOKBACK, now + LOOKAHEAD] */
const LOOKBACK_MS = 3 * 60 * 60 * 1000;
const LOOKAHEAD_MS = 2 * 60 * 60 * 1000 + 60_000;

/** Fire window: [fireAt, fireAt + WINDOW] — cron every 1m, 15m tolerance */
const FIRE_WINDOW_MS = 15 * 60 * 1000;

const DISPLAY_TZ = "Asia/Jakarta";

const FCM_MAX_RETRIES = 2; // 2 retries → 3 total attempts
const FCM_BACKOFF_BASE_MS = 500;

const THRESHOLDS = [
  { minutes: 120, label: "2 hours", field: "notified_2h" as const },
  { minutes: 30, label: "30 minutes", field: "notified_30m" as const },
  { minutes: 5, label: "5 minutes", field: "notified_5m" as const },
] as const;

type ThresholdField = (typeof THRESHOLDS)[number]["field"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskRow {
  id: string;
  user_id: string;
  text: string;
  time: string; // timestamptz ISO from DB
  done: boolean;
  notified_2h: boolean;
  notified_30m: boolean;
  notified_5m: boolean;
}

interface NotificationResult {
  task_id: string;
  threshold: ThresholdField;
  user_id: string;
  status:
    | "sent"
    | "skipped"
    | "no_token"
    | "fcm_error"
    | "db_error"
    | "claim_lost"
    | "invalid_deadline";
  detail?: string;
}

interface LogContext {
  request_id: string;
  [key: string]: unknown;
}

// ─── Structured logging ───────────────────────────────────────────────────────

function log(
  level: "info" | "warn" | "error",
  message: string,
  ctx: LogContext,
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...ctx,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// ─── Time helpers (UTC-safe) ──────────────────────────────────────────────────

/**
 * Parse DB timestamptz strictly. Accepts:
 *  - ISO with Z or numeric offset
 *  - Postgres style +00 / +00:00
 * Rejects naive local strings without offset (common bug source).
 */
function parseDeadlineUtc(iso: string): Date | null {
  if (!iso || typeof iso !== "string") return null;

  const trimmed = iso.trim();
  const hasZone =
    /[zZ]$/.test(trimmed) ||
    /[+-]\d{2}:\d{2}$/.test(trimmed) ||
    /[+-]\d{2}$/.test(trimmed);

  if (!hasZone) {
    return null;
  }

  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;

  return new Date(ms);
}

function formatDeadlineForUser(deadlineUtc: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DISPLAY_TZ,
  }).format(deadlineUtc);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── OAuth / FCM (module cache — warm isolate reuse) ─────────────────────────

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getFcmAccessToken(requestId: string): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && now < tokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");

  const sa = JSON.parse(raw);
  const nowSec = Math.floor(now / 1000);

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSec,
    exp: nowSec + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const unsigned = `${encode(header)}.${encode(payload)}`;
  const keyData = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );

  const jwt =
    unsigned +
    "." +
    btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    log("error", "fcm_oauth_failed", {
      request_id: requestId,
      status: res.status,
      error: data.error,
    });
    throw new Error(`OAuth failed: ${data.error ?? res.status}`);
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in ?? 3600) * 1000;
  return cachedAccessToken;
}

async function sendFcmOnce(
  projectId: string,
  accessToken: string,
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ ok: boolean; error?: string; unregistered?: boolean }> {
  const safeTitle = String(title);
  const safeBody = String(body);
  const dataPayload: Record<string, string> = {
    title: safeTitle,
    body: safeBody,
    url: String(data.url ?? "/"),
    tag: String(data.tag ?? ""),
    task_id: String(data.task_id ?? ""),
    ...Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)]),
    ),
  };

  const message = {
    message: {
      token: fcmToken,
      notification: { title: safeTitle, body: safeBody },
      data: dataPayload,
      webpush: { headers: { Urgency: "high" } },
      android: {
        priority: "high",
        notification: { tag: dataPayload.tag },
      },
    },
  };

  const url =
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(message),
  });

  const resBody = await res.text();
  if (!res.ok) {
    const unregistered =
      res.status === 404 ||
      resBody.includes("UNREGISTERED") ||
      resBody.includes("NOT_FOUND");
    return {
      ok: false,
      error: `FCM ${res.status}: ${resBody.slice(0, 500)}`,
      unregistered,
    };
  }
  return { ok: true };
}

/** Exponential backoff: 500ms, 1500ms (max 2 retries) */
async function sendFcmWithRetry(
  requestId: string,
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
  ctx: LogContext,
): Promise<{ ok: boolean; error?: string; unregistered?: boolean }> {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!projectId) {
    return { ok: false, error: "FIREBASE_PROJECT_ID is not set" };
  }

  let accessToken: string;
  try {
    accessToken = await getFcmAccessToken(requestId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  let lastError = "unknown";
  for (let attempt = 0; attempt <= FCM_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = FCM_BACKOFF_BASE_MS * Math.pow(3, attempt - 1);
      log("warn", "fcm_retry", { ...ctx, attempt, delay_ms: delay });
      await sleep(delay);
    }

    const result = await sendFcmOnce(
      projectId,
      accessToken,
      fcmToken,
      title,
      body,
      data,
    );

    if (result.ok) return result;

    lastError = result.error ?? "FCM error";
    if (result.unregistered) return result; // don't retry dead tokens

    const retryable =
      lastError.includes("429") ||
      lastError.includes("500") ||
      lastError.includes("503") ||
      lastError.includes("UNAVAILABLE") ||
      lastError.includes("INTERNAL");

    if (!retryable || attempt === FCM_MAX_RETRIES) {
      return { ok: false, error: lastError, unregistered: result.unregistered };
    }
  }

  return { ok: false, error: lastError };
}

// ─── Distributed lock ─────────────────────────────────────────────────────────

async function acquireLock(
  supabase: SupabaseClient,
  requestId: string,
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS).toISOString();

  // 1) Recover stale lock (crashed worker)
  await supabase
    .from("function_locks")
    .update({ locked: false, updated_at: nowIso })
    .eq("name", LOCK_NAME)
    .eq("locked", true)
    .lt("updated_at", staleBefore);

  // 2) Try atomic acquire: only if currently unlocked
  const { data: acquired, error } = await supabase
    .from("function_locks")
    .update({ locked: true, updated_at: nowIso })
    .eq("name", LOCK_NAME)
    .eq("locked", false)
    .select("name");

  if (error) {
    log("error", "lock_acquire_error", { request_id: requestId, error });
    return false;
  }
  if (acquired && acquired.length > 0) return true;

  // 3) Bootstrap row on first deploy
  const { error: insertErr } = await supabase.from("function_locks").insert({
    name: LOCK_NAME,
    locked: true,
    updated_at: nowIso,
  });

  if (!insertErr) return true;

  // Another instance won the race
  return false;
}

async function releaseLock(
  supabase: SupabaseClient,
  requestId: string,
): Promise<void> {
  const { error } = await supabase
    .from("function_locks")
    .update({ locked: false, updated_at: new Date().toISOString() })
    .eq("name", LOCK_NAME);

  if (error) {
    log("error", "lock_release_error", { request_id: requestId, error });
  }
}

// ─── Idempotent claim (core dedup primitive) ───────────────────────────────────

/**
 * Atomically mark threshold as notified. Returns true iff this worker won the race.
 * Uses UPDATE … WHERE notified_* = false — safe under concurrent cron overlap.
 */
async function claimThreshold(
  supabase: SupabaseClient,
  taskId: string,
  field: ThresholdField,
  requestId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ [field]: true })
    .eq("id", taskId)
    .eq(field, false)
    .select("id");

  if (error) {
    log("error", "claim_failed", {
      request_id: requestId,
      task_id: taskId,
      threshold: field,
      error,
    });
    return false;
  }
  return !!(data && data.length > 0);
}

/** Release claim after hard FCM failure so a later run can retry */
async function releaseThreshold(
  supabase: SupabaseClient,
  taskId: string,
  field: ThresholdField,
): Promise<void> {
  await supabase
    .from("tasks")
    .update({ [field]: false })
    .eq("id", taskId)
    .eq(field, true);
}

// ─── Batched reads ──────────────────────────────────────────────────────────────

async function fetchCandidateTasks(
  supabase: SupabaseClient,
  nowMs: number,
  requestId: string,
): Promise<TaskRow[]> {
  const fromIso = new Date(nowMs - LOOKBACK_MS).toISOString();
  const toIso = new Date(nowMs + LOOKAHEAD_MS).toISOString();

  const all: TaskRow[] = [];

  for (let page = 0; page < MAX_TASK_PAGES; page++) {
    const from = page * TASK_PAGE_SIZE;
    const to = from + TASK_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, user_id, text, time, done, notified_2h, notified_30m, notified_5m",
      )
      .eq("done", false)
      .not("time", "is", null)
      .gte("time", fromIso)
      .lte("time", toIso)
      .or("notified_2h.eq.false,notified_30m.eq.false,notified_5m.eq.false")
      .order("time", { ascending: true })
      .range(from, to);

    if (error) {
      log("error", "tasks_fetch_failed", { request_id: requestId, error, page });
      throw error;
    }

    const batch = (data ?? []) as TaskRow[];
    all.push(...batch);

    if (batch.length < TASK_PAGE_SIZE) break;
  }

  return all;
}

/**
 * Load tokens once per run. If multiple rows per user, keep the last seen
 * (caller should ensure one row per device in app; this is defensive).
 */
async function buildTokenMap(
  supabase: SupabaseClient,
  userIds: string[],
  requestId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  // PostgREST IN has limits; chunk at 500
  const CHUNK = 500;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("user_notification_tokens")
      .select("user_id, fcm_token")
      .in("user_id", chunk);

    if (error) {
      log("warn", "tokens_fetch_partial", {
        request_id: requestId,
        error,
        chunk: i / CHUNK,
      });
      continue;
    }

    for (const row of data ?? []) {
      if (row.fcm_token) map.set(row.user_id, row.fcm_token);
    }
  }

  return map;
}

// ─── Reminder evaluation ───────────────────────────────────────────────────────

function isInFireWindow(
  nowMs: number,
  deadlineMs: number,
  thresholdMinutes: number,
): boolean {
  const fireAtMs = deadlineMs - thresholdMinutes * 60_000;
  const windowEnd = fireAtMs + FIRE_WINDOW_MS;
  return nowMs >= fireAtMs && nowMs <= windowEnd;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const request_id = crypto.randomUUID();
  const baseCtx: LogContext = { request_id };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const locked = await acquireLock(supabase, request_id);
  if (!locked) {
    log("info", "lock_busy", baseCtx);
    return new Response(
      JSON.stringify({ message: "Another instance running", request_id }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const started = Date.now();
  const nowMs = Date.now();
  const results: NotificationResult[] = [];

  try {
    log("info", "run_started", { ...baseCtx, now: new Date(nowMs).toISOString() });

    const tasks = await fetchCandidateTasks(supabase, nowMs, request_id);
    log("info", "tasks_loaded", { ...baseCtx, count: tasks.length });

    if (tasks.length === 0) {
      return new Response(
        JSON.stringify({
          request_id,
          message: "No tasks need reminders",
          results: [],
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const userIds = [...new Set(tasks.map((t) => t.user_id))];
    const tokenMap = await buildTokenMap(supabase, userIds, request_id);
    log("info", "tokens_loaded", {
      ...baseCtx,
      users: userIds.length,
      tokens: tokenMap.size,
    });

    for (const task of tasks) {
      const taskCtx: LogContext = {
        ...baseCtx,
        task_id: task.id,
        user_id: task.user_id,
      };

      const deadline = parseDeadlineUtc(task.time);
      if (!deadline) {
        log("warn", "invalid_deadline", {
          ...taskCtx,
          raw_time: task.time,
        });
        results.push({
          task_id: task.id,
          threshold: "notified_5m",
          user_id: task.user_id,
          status: "invalid_deadline",
          detail: "Missing or naive timezone in tasks.time",
        });
        continue;
      }

      const deadlineMs = deadline.getTime();

      for (const th of THRESHOLDS) {
        const thresholdCtx: LogContext = {
          ...taskCtx,
          threshold: th.field,
        };

        if (task[th.field]) continue;

        if (!isInFireWindow(nowMs, deadlineMs, th.minutes)) continue;

        // ── Idempotent claim BEFORE send (prevents duplicate under concurrency)
        const claimed = await claimThreshold(
          supabase,
          task.id,
          th.field,
          request_id,
        );
        if (!claimed) {
          results.push({
            task_id: task.id,
            threshold: th.field,
            user_id: task.user_id,
            status: "claim_lost",
          });
          continue;
        }

        const fcmToken = tokenMap.get(task.user_id);
        if (!fcmToken) {
          await releaseThreshold(supabase, task.id, th.field);
          results.push({
            task_id: task.id,
            threshold: th.field,
            user_id: task.user_id,
            status: "no_token",
          });
          continue;
        }

        const title = `⏰ Deadline in ${th.label}!`;
        const body =
          `"${task.text}" is due at ${formatDeadlineForUser(deadline)}`;

        // Stable tag → FCM collapse / SW dedup if provider redelivers
        const tag = `${task.id}:${th.field}`;

        const fcmResult = await sendFcmWithRetry(
          request_id,
          fcmToken,
          title,
          body,
          {
            title,
            body,
            url: "/",
            tag,
            task_id: task.id,
            threshold: th.field,
            deadline: deadline.toISOString(),
            request_id,
          },
          thresholdCtx,
        );

        if (!fcmResult.ok) {
          if (fcmResult.unregistered) {
            await supabase
              .from("user_notification_tokens")
              .delete()
              .eq("user_id", task.user_id)
              .eq("fcm_token", fcmToken);
            tokenMap.delete(task.user_id);
          }

          // Allow retry on next cron
          await releaseThreshold(supabase, task.id, th.field);

          log("error", "fcm_failed", {
            ...thresholdCtx,
            error: fcmResult.error,
          });

          results.push({
            task_id: task.id,
            threshold: th.field,
            user_id: task.user_id,
            status: "fcm_error",
            detail: fcmResult.error,
          });
          continue;
        }

        log("info", "notification_sent", thresholdCtx);
        results.push({
          task_id: task.id,
          threshold: th.field,
          user_id: task.user_id,
          status: "sent",
        });

        // Reflect in-memory so same run doesn't reconsider
        task[th.field] = true;
      }
    }

    const elapsed_ms = Date.now() - started;
    const summary = {
      request_id,
      message: "Reminder check completed",
      elapsed_ms,
      total: results.length,
      sent: results.filter((r) => r.status === "sent").length,
      errors: results.filter((r) =>
        ["fcm_error", "db_error"].includes(r.status)
      ).length,
      results,
    };

    log("info", "run_completed", { ...baseCtx, ...summary });
    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    log("error", "run_crashed", {
      ...baseCtx,
      error: (e as Error).message,
    });
    return new Response(
      JSON.stringify({ request_id, error: (e as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  } finally {
    await releaseLock(supabase, request_id);
  }
});