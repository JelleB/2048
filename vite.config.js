/**
 * Vite config: dev server and Phaser-friendly production build.
 */
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  /**
   * Project Pages: https://jelleAtEijkelkamp.github.io/stunning-tribble/
   * Dev server uses `/`; production build uses `/stunning-tribble/` (see package.json build script).
   */
  base: command === 'serve' ? '/' : process.env.BASE_PATH || '/stunning-tribble/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    /** Source entry; root index.html on main is the production bundle for Pages. */
    rollupOptions: {
      input: {
        index: 'index.source.html',
      },
    },
  },
  server: {
    port: 5173,
    open: '/index.source.html',
  },
}));
