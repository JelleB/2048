/**
 * Vitest config: unit tests for pure game logic (no Phaser canvas).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.js'],
    coverage: {
      provider: 'v8',
      include: [
        'src/logic/**/*.js',
        'src/persistence/**/*.js',
        'src/scenes/gamePersistence.js',
        'src/ui/layout.js',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
