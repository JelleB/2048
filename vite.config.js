/**
 * Vite config: dev server and Phaser-friendly production build.
 * Multi-page: Phaser collection (index) + BSharp + IKEA escape room.
 */
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

/**
 * BSharp fork-awesome.css uses `url(static/fonts/...)` relative to the HTML root.
 * Bundled CSS lives under `/assets/`, so rewrite to `../static/fonts/` (→ `/2048/static/fonts/`).
 */
function bsharpFontPathFix() {
  const rewrite = (code) =>
    code.replace(/url\((['"]?)static\/fonts\//g, 'url($1../static/fonts/');

  return {
    name: 'bsharp-font-path-fix',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('fork-awesome')) return null;
      return rewrite(code);
    },
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && typeof file.source === 'string' && file.fileName.endsWith('.css')) {
          if (file.source.includes('static/fonts/forkawesome')) {
            file.source = rewrite(file.source);
          }
        }
      }
    },
  };
}

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
        ikea: 'ikea.source.html',
      },
    },
  },
  server: {
    port: 5173,
    open: '/index.source.html',
  },
  plugins: [
    bsharpFontPathFix(),
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
