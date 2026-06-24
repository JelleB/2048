/**
 * Vite config: dev server and Phaser-friendly production build.
 * Multi-page: Phaser collection (index) + BSharp subtree (bsharp).
 */
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ command }) => ({
  /**
   * Project Pages: https://jelleb.github.io/2048/
   * Dev server uses `/`; production build uses `/2048/` (see package.json build script).
   */
  base: command === 'serve' ? '/' : process.env.BASE_PATH || '/2048/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        index: 'index.source.html',
        bsharp: 'bsharp.source.html',
      },
    },
  },
  server: {
    port: 5173,
    open: '/index.source.html',
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'vendor/bsharp/static/**/*',
          dest: 'static',
        },
      ],
    }),
  ],
}));
