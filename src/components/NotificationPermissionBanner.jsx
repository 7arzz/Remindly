/**
 * src/components/NotificationPermissionBanner.jsx
 * Shows a dismissible banner prompting the user to enable push notifications.
 * Displays:
 *  - When permission is "default" (not yet asked)
 *  - A "blocked" fallback when permission is "denied"
 *  - Nothing when already "granted"
 */

import { useState } from "react";
import { Bell, BellOff, X, Loader2 } from "lucide-react";

/**
 * @param {string}    permission      — "default" | "granted" | "denied"
 * @param {boolean}   tokenLoading    — true while requesting
 * @param {string}    tokenError      — error message or null
 * @param {boolean}   supported       — false if browser can't do FCM
 * @param {Function}  onEnable        — called when user clicks "Enable"
 */
export default function NotificationPermissionBanner({
  permission,
  tokenLoading,
  tokenError,
  supported,
  onEnable,
}) {
  const [dismissed, setDismissed] = useState(false);

  // Don't render if:
  // - user already granted / irreversibly denied and banner dismissed
  // - browser doesn't support notifications at all
  // - already dismissed by user
  if (dismissed) return null;
  if (!supported) return null;
  if (permission === "granted") return null;

  // ─── Denied state ─────────────────────────────────────────────────────────
  if (permission === "denied") {
    return (
      <div className="notification-banner notification-banner--denied">
        <div className="notification-banner__icon">
          <BellOff size={18} />
        </div>
        <div className="notification-banner__body">
          <strong>Notifications blocked</strong>
          <p>
            To receive deadline reminders, enable notifications in your browser
            settings (🔒 lock icon in the address bar → Notifications → Allow).
          </p>
        </div>
        <button
          className="notification-banner__close"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // ─── Default state — prompt to enable ────────────────────────────────────
  return (
    <div className="notification-banner notification-banner--prompt">
      <div className="notification-banner__icon">
        <Bell size={18} />
      </div>
      <div className="notification-banner__body">
        <strong>Stay on top of your deadlines</strong>
        <p>Enable push notifications to get reminders 2 hours, 30 minutes, and 5 minutes before each deadline.</p>
        {tokenError && (
          <p className="notification-banner__error">{tokenError}</p>
        )}
      </div>
      <div className="notification-banner__actions">
        <button
          className="notification-banner__btn notification-banner__btn--primary"
          onClick={onEnable}
          disabled={tokenLoading}
          aria-label="Enable notifications"
        >
          {tokenLoading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Bell size={15} />
          )}
          {tokenLoading ? "Enabling…" : "Enable"}
        </button>
        <button
          className="notification-banner__btn notification-banner__btn--ghost"
          onClick={() => setDismissed(true)}
          aria-label="Maybe later"
        >
          Later
        </button>
      </div>
      <button
        className="notification-banner__close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
