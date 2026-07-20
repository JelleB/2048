/**
 * Vite entry for Lost in IKEA: The Birthday Escape.
 * Wires home navigation and boots the vanilla JS app.
 */
import { initIkeaApp, setupHeaderNavigation } from './ui/app.js';
import './styles/ikea.css';

const base = import.meta.env.BASE_URL || '/';
document.documentElement.style.setProperty(
  '--sprite-url',
  `url(${base}ikea/spritesheet.png)`,
);

setupHeaderNavigation();
initIkeaApp();
