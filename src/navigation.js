/**
 * Cross-page navigation between the Phaser menu and standalone HTML games (e.g. BSharp).
 */

/**
 * Application base URL with trailing slash (respects Vite `base` / GitHub Pages path).
 * @returns {string}
 */
export function appBaseUrl() {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Navigate to the BSharp perfect-pitch trainer (non-Phaser HTML app).
 */
export function navigateToBSharp() {
  const page = import.meta.env.DEV ? 'bsharp.source.html' : 'bsharp.html';
  window.location.assign(`${appBaseUrl()}${page}`);
}

/**
 * Navigate to the Lost in IKEA co-op escape room (non-Phaser HTML app).
 */
export function navigateToIkea() {
  const page = import.meta.env.DEV ? 'ikea.source.html' : 'ikea.html';
  window.location.assign(`${appBaseUrl()}${page}`);
}

/**
 * URL for returning to the Phaser games menu from a standalone page.
 * @returns {string}
 */
export function gamesMenuUrl() {
  const page = import.meta.env.DEV ? 'index.source.html' : 'index.html';
  return `${appBaseUrl()}${page}`;
}
