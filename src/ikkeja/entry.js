/**
 * Vite entry for Lost in IKKE-JA.
 * Wires home navigation and boots the vanilla JS app.
 */
import { initIkkeJaApp, setupHeaderNavigation } from './ui/app.js';
import './styles/ikkeja.css';

const base = import.meta.env.BASE_URL || '/';
document.documentElement.style.setProperty(
  '--sprite-url',
  `url(${base}ikkeja/spritesheet.png)`,
);

setupHeaderNavigation();
initIkkeJaApp();
