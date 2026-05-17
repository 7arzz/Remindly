/**
 * src/utils/notifications.js
 * Standalone utility functions for notifications.
 * Re-exports the two most-used functions from lib/firebase for convenience.
 */

export {
  sendLocalNotification,
  requestNotificationPermission,
  checkBrowserSupport,
} from "../lib/firebase";

/**
 * Schedules a one-shot local notification at a specific Date.
 * Uses setTimeout — only fires while the tab is open.
 * For background delivery, rely on the FCM server-push flow.
 *
 * @param {string}  title
 * @param {string}  body
 * @param {Date}    fireAt    — exact time to show the notification
 * @param {object}  options   — extra Notification options
 * @returns {number|null}     — setTimeout ID (so you can cancel it)
 */
export const scheduleLocalNotification = (title, body, fireAt, options = {}) => {
  const delay = new Date(fireAt).getTime() - Date.now();
  if (delay <= 0) return null; // already past

  const { sendLocalNotification } = await import("../lib/firebase");

  const id = setTimeout(() => {
    sendLocalNotification(title, body, options);
  }, delay);

  return id;
};

/**
 * Convenience: show a task-deadline notification right now.
 * Used for immediate "tab-open" reminders.
 */
export const notifyDeadline = (taskText, deadlineDate, minutesLeft) => {
  const { sendLocalNotification } = require("../lib/firebase");
  const label =
    minutesLeft >= 60
      ? `${minutesLeft / 60}h`
      : `${minutesLeft}min`;

  sendLocalNotification(`⏰ Deadline in ${label}`, `"${taskText}" is due at ${new Date(deadlineDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
};
