export const calculateProgress = (steps) => {
  if (!steps || steps.length === 0) return 0;
  const completedSteps = steps.filter((step) => step.done).length;
  return Math.round((completedSteps / steps.length) * 100);
};

/**
 * Format a stored datetime string (ISO/timestamptz) into LOCAL datetime-local format.
 * Output MUST be: YYYY-MM-DDTHH:mm
 *
 * Example: if stored time is UTC for 10:30 WIB, browser in WIB will display 10:30.
 */
export const formatForDateTimeLocal = (dateString) => {
  if (!dateString) return "";

  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");

  return (
    `${d.getFullYear()}-` +
    `${pad(d.getMonth() + 1)}-` +
    `${pad(d.getDate())}T` +
    `${pad(d.getHours())}:` +
    `${pad(d.getMinutes())}`
  );
};
