/**
 * Positive feedback: toasts, wobble, success glow, and confetti bursts.
 */

const TOAST_MESSAGES = [
  'FANTASTISKT!',
  'MEATBALL POWER!',
  'PERFECT ASSEMBLY!',
  'BRA JOBBAT!',
  'FLAT-PACK LEGEND!',
];

/**
 * Shows a random encouraging toast.
 * @param {string} [message]
 */
export function showToast(message) {
  const el = document.getElementById('ikkeja-toast');
  if (!el) return;
  const text = message || TOAST_MESSAGES[Math.floor(Math.random() * TOAST_MESSAGES.length)];
  el.textContent = text;
  el.hidden = false;
  el.classList.add('ikkeja-toast--visible');
  window.setTimeout(() => {
    el.classList.remove('ikkeja-toast--visible');
    window.setTimeout(() => {
      el.hidden = true;
    }, 300);
  }, 2200);
}

/**
 * Applies a gentle wobble animation to an element.
 * @param {HTMLElement} el
 */
export function wobbleElement(el) {
  el.classList.remove('ikkeja-wobble');
  void el.offsetWidth;
  el.classList.add('ikkeja-wobble');
  window.setTimeout(() => el.classList.remove('ikkeja-wobble'), 600);
}

/**
 * Adds temporary success glow border.
 * @param {HTMLElement} el
 */
export function glowSuccess(el) {
  el.classList.add('ikkeja-success-glow');
  window.setTimeout(() => el.classList.remove('ikkeja-success-glow'), 1500);
}

/** Fires canvas-confetti burst(s) on level complete. */
export function burstConfetti() {
  if (typeof confetti !== 'function') return;
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.65 } });
  window.setTimeout(() => {
    confetti({ particleCount: 50, spread: 100, origin: { x: 0.2, y: 0.7 } });
  }, 250);
  window.setTimeout(() => {
    confetti({ particleCount: 50, spread: 100, origin: { x: 0.8, y: 0.7 } });
  }, 500);
}

/** Extended confetti for victory screen. */
export function victoryConfetti() {
  if (typeof confetti !== 'function') return;
  for (let i = 0; i < 3; i += 1) {
    window.setTimeout(() => burstConfetti(), i * 800);
  }
}
