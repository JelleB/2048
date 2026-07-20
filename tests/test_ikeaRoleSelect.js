/**
 * Unit tests for IKEA role-select panel visibility.
 */
import { describe, expect, it } from 'vitest';
import { rolePanelVisibility } from '../src/ikea/ui/roleSelect.js';

describe('rolePanelVisibility', () => {
  it('shows only Monique panel for p1', () => {
    expect(rolePanelVisibility('p1')).toEqual({ showP1: true, showJoin: false });
  });

  it('shows only join panel for Jelle', () => {
    expect(rolePanelVisibility('p2')).toEqual({ showP1: false, showJoin: true });
  });

  it('shows only join panel for Meike', () => {
    expect(rolePanelVisibility('daughter')).toEqual({ showP1: false, showJoin: true });
  });
});
