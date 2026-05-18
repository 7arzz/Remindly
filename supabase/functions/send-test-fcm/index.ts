/* eslint-disable */
// @ts-nocheck
/**
 * supabase/functions/send-test-fcm/index.ts
 *
 * Temporary manual FCM test sender for debugging reliability.
 * Sends a real FCM push to a target fcm_token (provided in request body).
 *
 * Request body JSON:
 * {
 *   token: string; // required - target current FCM token
 *   title?: string;
 *   body?: string;
 *   url?: string;
 *   tag?: string;
 *   task_id?: string; // optional alias
 * }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function getFcmAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set.");

  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

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

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const unsigned = `${headerB64}.${payloadB64}`;

  const privateKey = sa.private_key as string;
  const keyData = privateKey
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

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsigned}.${signatureB64}`;

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

function redactToken(t: string) {
  const s = t || "";
  if (s.length <= 10) return "****";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

async function sendFcmNotification(
  fcmToken: string,
  title: string,
  body: string,
  url: string,
  tag: string,
  task_id: string | undefined,
  dataExtra: Record<string, string> = {},
): Promise<{ success: boolean; error?: string; status?: number; responseBody?: string }> {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID env var is not set.");

  const accessToken = await getFcmAccessToken();

  const safeTitle = String(title ?? "Remindly");
  const safeBody = String(body ?? "");
  const safeUrl = String(url ?? "/");
  const safeTag = String(tag ?? "remindly-task");
  const safeTaskId = task_id ? String(task_id) : "";

  // Firebase WebPush / Android reliability:
  // - Include notification + data
  // - Provide webpush + android priority high
  // - Keep all data values as strings
  const message: any = {
    message: {
      token: fcmToken,
      notification: {
        title: safeTitle,
        body: safeBody,
      },
      data: {
        // MUST be strings
        title: safeTitle,
        body: safeBody,
        url: safeUrl,
        tag: safeTag,
        task_id: safeTaskId || safeTag,

        // Extra for debugging
        ...Object.fromEntries(
          Object.entries(dataExtra).map(([k, v]) => [k, String(v)]),
        ),
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
      },
      android: {
        priority: "high",
      },
      // Note: do NOT set requireInteraction
    },
  };

  const urlApi = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  console.log("[send-test-fcm] Sending FCM with:");
  console.log("[send-test-fcm] projectId:", projectId);
  console.log("[send-test-fcm] token:", redactToken(fcmToken), "len:", String(fcmToken.length));
  console.log("[send-test-fcm] FCM request URL:", urlApi);
  console.log("[send-test-fcm] FCM payload (message):", JSON.stringify(message));

  const res = await fetch(urlApi, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(message),
  });

  const responseBody = await res.text();

  console.log("[send-test-fcm] Firebase response status:", res.status);
  console.log("[send-test-fcm] Firebase response body:", responseBody);

  if (!res.ok) {
    // token-not-registered can be 404
    if (res.status === 404 || responseBody.includes("UNREGISTERED")) {
      return { success: false, error: "UNREGISTERED", status: res.status, responseBody };
    }
    return { success: false, error: `FCM ${res.status}: ${responseBody}`, status: res.status, responseBody };
  }

  return { success: true, status: res.status, responseBody };
}

Deno.serve(async (req: Request) => {
  const started = new Date().toISOString();

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let bodyJson: any = {};
  try {
    bodyJson = await req.json();
  } catch {
    bodyJson = {};
  }

  const token = bodyJson.token;
  if (!token || typeof token !== "string") {
    return new Response(JSON.stringify({ error: "Missing required body.token (string)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const title = String(bodyJson.title ?? "Remindly Test");
  const bodyText = String(bodyJson.body ?? "FCM test message");
  const urlStr = String(bodyJson.url ?? "/");
  const tag = String(bodyJson.tag ?? "remindly-test");
  const taskId = bodyJson.task_id ? String(bodyJson.task_id) : undefined;

  // Ensure consistent data fields
  const { success, error, status, responseBody } = await sendFcmNotification(
    token,
    title,
    bodyText,
    urlStr,
    tag,
    taskId,
    {
      debug_reason: "manual_test_button",
      test_started: started,
    },
  );

  return new Response(
    JSON.stringify({
      ok: success,
      error: error ?? null,
      firebaseStatus: status ?? null,
      responseBody,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
