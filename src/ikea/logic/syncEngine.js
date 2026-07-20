/**
 * Zero-server time sync: 5-second slots and deterministic 4-character codes from seed + slot.
 */

/** Duration of one sync window in milliseconds. */
export const TIME_SLOT_MS = 5000;

/** Characters used when mapping hash bytes to sync codes. */
export const SYNC_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Current time slot index (changes every 5 seconds).
 * @param {number} [now] - Epoch ms (defaults to Date.now()).
 * @returns {number}
 */
export function getTimeSlot(now = Date.now()) {
  return Math.floor(now / TIME_SLOT_MS);
}

/**
 * Progress within the current slot, 1 = full bar, 0 = empty (for drain animation).
 * @param {number} [now] - Epoch ms.
 * @returns {number} Value in [0, 1].
 */
export function getSlotProgress(now = Date.now()) {
  const elapsed = now % TIME_SLOT_MS;
  return 1 - elapsed / TIME_SLOT_MS;
}

/**
 * Maps hash bytes to a fixed-length alphanumeric code.
 * @param {Uint8Array} bytes
 * @param {number} length
 * @returns {string}
 */
function hashBytesToCode(bytes, length = 4) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += SYNC_ALPHABET[bytes[i] % SYNC_ALPHABET.length];
  }
  return code;
}

/**
 * Generates the 4-character sync code for a seed and time slot.
 * @param {string} seed - Session seed.
 * @param {number} slot - Time slot index.
 * @returns {Promise<string>}
 */
export async function syncCodeForSeed(seed, slot) {
  const data = new TextEncoder().encode(`${seed}:${slot}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  return hashBytesToCode(bytes, 4);
}

/**
 * Validates Player 2's sync input against current slot ±1 (clock skew tolerance).
 * @param {string} seed - Session seed.
 * @param {string} input - User-entered code.
 * @param {number} [now] - Epoch ms.
 * @returns {Promise<boolean>}
 */
export async function validateSyncCode(seed, input, now = Date.now()) {
  const normalized = input.trim().toUpperCase();
  if (normalized.length !== 4) {
    return false;
  }
  const slot = getTimeSlot(now);
  for (const candidate of [slot - 1, slot, slot + 1]) {
    const code = await syncCodeForSeed(seed, candidate);
    if (code === normalized) {
      return true;
    }
  }
  return false;
}
