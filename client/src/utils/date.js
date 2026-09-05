/**
 * Date and Time utilities for handling user's local timezone (e.g. IST).
 */

/**
 * Converts a local date string (YYYY-MM-DD) and time string (HH:mm) into an ISO string in UTC.
 * Ensures that 10:00 in local time (e.g. IST) is saved as the exact UTC equivalent of 10:00 local time.
 */
export function toLocalISOString(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const [year, month, day] = dateStr.split('-').map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes, 0);
  return localDate.toISOString();
}

/**
 * Formats a Date/ISO string to local YYYY-MM-DD.
 */
export function formatLocalDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date/ISO string to local HH:mm for input[type="time"].
 */
export function formatLocalTime(isoString) {
  if (!isoString) return '10:00';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '10:00';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formats a Date/ISO string for human display: e.g. "10:00 AM".
 */
export function formatDisplayTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Returns the browser's local timezone offset formatted as "+HH:mm" or "-HH:mm".
 * E.g. "+05:30" for IST.
 */
export function getTimezoneOffsetString() {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const minutes = String(abs % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
