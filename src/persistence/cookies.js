/**
 * Browser cookie helpers for small client-side game persistence.
 * Uses document.cookie with path=/ so values are available on GitHub Pages subpaths.
 */

const DEFAULT_MAX_AGE_DAYS = 365;

/**
 * Writes a cookie value.
 * @param {string} name
 * @param {string} value
 * @param {number} [maxAgeDays]
 */
export function setCookie(name, value, maxAgeDays = DEFAULT_MAX_AGE_DAYS) {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + maxAgeDays * 24 * 60 * 60 * 1000);
  const encoded = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  document.cookie = `${encoded};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Reads a cookie value by name.
 * @param {string} name
 * @returns {string | null}
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const key = encodeURIComponent(name);
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq);
    if (k === key) return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return null;
}

/**
 * Removes a cookie by expiring it immediately.
 * @param {string} name
 */
export function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  const encoded = `${encodeURIComponent(name)}=`;
  document.cookie = `${encoded};expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
}
