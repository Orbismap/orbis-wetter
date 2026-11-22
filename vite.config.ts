import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { precacheUrls } from './src/pwa/precache';

const src = fileURLToPath(new URL('./src', import.meta.url));
const publicDir = fileURLToPath(new URL('./public', import.meta.url));
const swSource = fileURLToPath(new URL('./src/pwa/sw.js', import.meta.url));
const base = '/wetter/';

/** Schreibt Version + App-Shell-URLs für den Service Worker ins Build. */
function pwaPrecache(): Plugin {
  return {
    name: 'orbis-wetter-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const listPublic = (dir: string, prefix = ''): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
          entry.isDirectory()
            ? listPublic(join(dir, entry.name), `${prefix}${entry.name}/`)
            : [`${prefix}${entry.name}`],
        );

      const urls = precacheUrls(base, Object.keys(bundle), listPublic(publicDir));
      const version = createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 12);
      this.emitFile({
        type: 'asset',
        fileName: 'precache.json',
        source: JSON.stringify({ version, urls }),
      });
      // Versions-Kommentar ändert sw.js bei jedem Build – sonst prüft der Browser
      // bei unveränderter Datei nie nach einem neuen Precache.
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `${readFileSync(swSource, 'utf8')}\n/* build ${version} */\n`,
      });
    },
  };
}

export default defineConfig({
  // Same origin as orbis-karten, one path below it: https://maps.maltee.dev/wetter/
  base,
  plugins: [preact(), pwaPrecache()],
  resolve: { alias: { '@': src } },
  // orbis-karten builds /wx-render/v1.js; in dev it lives on the sibling dev server.
  server: {
    proxy: {
      '/wx-render': {
        target: 'http://localhost:5173',
        // Vite appends ?import to module requests; the karten dev server refuses to serve
        // public/ files that way. Strip it so the raw ES module is forwarded.
        rewrite: (path) => path.replace(/\?import$/, ''),
      },
    },
  },
  build: {
    outDir: 'dist/wetter',
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/maplibre-gl')) return 'maplibre-gl';
          return undefined;
        },
      },
    },
  },
  worker: { format: 'es' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
