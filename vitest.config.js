/**
 * Vitest config: unit tests for pure game logic (no Phaser canvas).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.js'],
  },
});
