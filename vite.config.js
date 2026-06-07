/**
 * Vite config: dev server and Phaser-friendly production build.
 */
import { defineConfig } from 'vite';

export default defineConfig({
  /** Project Pages URL: https://jelleAtEijkelkamp.github.io/stunning-tribble/ */
  base: process.env.BASE_PATH || '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    open: false,
  },
});
