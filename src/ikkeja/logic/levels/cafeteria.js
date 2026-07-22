/**
 * Level 3: cafeteria receipt math and door code derivation.
 */
import {
  CAFETERIA_MENU,
  CAFETERIA_RECEIPT,
  DAUGHTER_KIDS_MEAL_PRICE,
} from '../puzzleData.js';

/**
 * Looks up menu item price by id or display name.
 * @param {string} itemKey
 * @returns {number|null}
 */
export function getMenuPrice(itemKey) {
  const key = (itemKey || '').trim().toLowerCase();
  const item = CAFETERIA_MENU.find(
    (m) => m.id === key || m.name.toLowerCase() === key,
  );
  return item ? item.price : null;
}

/**
 * Computes receipt total from known prices.
 * @returns {number}
 */
export function computeReceiptTotal() {
  return CAFETERIA_RECEIPT.items.reduce((sum, line) => {
    const price = getMenuPrice(line.name) ?? getMenuPrice(line.name.split(' ')[0]);
    if (price === null) {
      return sum;
    }
    return sum + price * line.qty;
  }, 0);
}

/**
 * Builds the 4-digit door code from item prices in receipt order.
 * Kids Meal, Princess Cake, Köttbullar, Köttbullar → 3, 6, 7, 7 → 3677.
 * @returns {string}
 */
export function deriveDoorCode() {
  const kids = DAUGHTER_KIDS_MEAL_PRICE;
  const princess = getMenuPrice('princess');
  const meatball = getMenuPrice('kottbullar');
  if (princess === null || meatball === null) {
    return '';
  }
  return `${kids}${princess}${meatball}${meatball}`;
}

/** Expected door code for the fixed receipt puzzle. */
export const EXPECTED_DOOR_CODE = '3677';

/**
 * Validates Player 2 door code entry.
 * @param {string} input
 * @returns {boolean}
 */
export function validateDoorCode(input) {
  return (input || '').trim() === EXPECTED_DOOR_CODE;
}

/**
 * Returns rune-to-price map for decoding (used when players combine clues).
 * @returns {Record<string, number>}
 */
export function getRunePriceMap() {
  return Object.fromEntries(CAFETERIA_MENU.map((m) => [m.rune, m.price]));
}
