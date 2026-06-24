/**
 * Vite entry for BSharp (vendor subtree). Loads SCSS and the upstream app bootstrap.
 * Keeps vendor/bsharp TypeScript untouched so subtree updates stay mergeable.
 */
import { gamesMenuUrl } from '../navigation.js';
import '../../vendor/bsharp/src/scss/style.scss';
import '../../vendor/bsharp/src/ts/main.ts';

const homeLink = document.getElementById('games-home-link');
if (homeLink instanceof HTMLAnchorElement) {
  homeLink.href = gamesMenuUrl();
}
