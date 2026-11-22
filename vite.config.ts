import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  // Same origin as orbis-karten, one path below it: https://maps.maltee.dev/wetter/
  base: '/wetter/',
  plugins: [preact()],
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
