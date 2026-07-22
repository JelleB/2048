/**
 * Unit tests for IKKE-JA role-select panel visibility.
 */
import { describe, expect, it } from 'vitest';
import { rolePanelVisibility } from '../src/ikkeja/ui/roleSelect.js';

describe('rolePanelVisibility', () => {
  it('shows only Player 1 panel for p1', () => {
    expect(rolePanelVisibility('p1')).toEqual({ showP1: true, showJoin: false });
  });

  it('shows only join panel for Player 2', () => {
    expect(rolePanelVisibility('p2')).toEqual({ showP1: false, showJoin: true });
  });

  it('shows only join panel for Player 3', () => {
    expect(rolePanelVisibility('daughter')).toEqual({ showP1: false, showJoin: true });
  });
});
