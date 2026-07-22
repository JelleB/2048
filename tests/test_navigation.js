/**
 * Unit tests for cross-page navigation helpers.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appBaseUrl, gamesMenuUrl, navigateToBSharp, navigateToIkkeJa } from '../src/navigation.js';

describe('appBaseUrl', () => {
  it('returns BASE_URL with trailing slash', () => {
    expect(appBaseUrl()).toMatch(/\/$/);
  });
});

describe('gamesMenuUrl', () => {
  it('points at the Phaser menu entry HTML', () => {
    const url = gamesMenuUrl();
    expect(url.endsWith('index.source.html') || url.endsWith('index.html')).toBe(true);
  });
});

describe('navigateToBSharp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('assigns location to the BSharp page', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    navigateToBSharp();
    expect(assign).toHaveBeenCalledOnce();
    const target = assign.mock.calls[0][0];
    expect(target.endsWith('bsharp.source.html') || target.endsWith('bsharp.html')).toBe(true);
  });
});

describe('navigateToIkkeJa', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('assigns location to the IKKE-JA escape room page', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    navigateToIkkeJa();
    expect(assign).toHaveBeenCalledOnce();
    const target = assign.mock.calls[0][0];
    expect(target.endsWith('ikke-ja.source.html') || target.endsWith('ikke-ja.html')).toBe(true);
  });
});
