/**
 * Unit tests for browser cookie helpers.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setCookie, getCookie, deleteCookie } from '../src/persistence/cookies.js';

describe('cookies', () => {
  /** @type {string} */
  let jar;

  beforeEach(() => {
    jar = '';
    global.document = {
      get cookie() {
        return jar;
      },
      set cookie(value) {
        jar = value;
      },
    };
  });

  afterEach(() => {
    // @ts-expect-error cleanup test global
    delete global.document;
  });

  it('sets and reads a cookie value', () => {
    setCookie('score', '42');
    expect(getCookie('score')).toBe('42');
  });

  it('encodes special characters in names and values', () => {
    setCookie('a b', 'x=y');
    expect(getCookie('a b')).toBe('x=y');
  });

  it('returns null for missing cookies', () => {
    expect(getCookie('missing')).toBeNull();
  });

  it('deletes a cookie by expiring it', () => {
    setCookie('temp', '1');
    deleteCookie('temp');
    expect(jar).toContain('expires=Thu, 01 Jan 1970');
    expect(getCookie('temp')).toBeFalsy();
  });

  it('no-ops when document is undefined', () => {
    // @ts-expect-error cleanup test global
    delete global.document;
    expect(() => {
      setCookie('a', 'b');
      getCookie('a');
      deleteCookie('a');
    }).not.toThrow();
    expect(getCookie('a')).toBeNull();
  });
});
