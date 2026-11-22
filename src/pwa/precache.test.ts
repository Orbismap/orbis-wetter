import { describe, expect, it } from 'vitest';
import { precacheUrls } from './precache';

describe('precacheUrls', () => {
  it('enthält App-Shell und alle Build- und Public-Dateien unter dem Basis-Pfad', () => {
    const urls = precacheUrls(
      '/wetter/',
      ['assets/index-a1b2.js', 'assets/index-c3d4.css'],
      ['favicon.svg', 'manifest.webmanifest', 'moon/moonPhase0.png'],
    );

    expect(urls).toEqual([
      '/wetter/',
      '/wetter/assets/index-a1b2.js',
      '/wetter/assets/index-c3d4.css',
      '/wetter/favicon.svg',
      '/wetter/index.html',
      '/wetter/manifest.webmanifest',
      '/wetter/moon/moonPhase0.png',
    ]);
  });

  it('normalisiert fehlende Slashes und doppelte Leading-Slashes', () => {
    const urls = precacheUrls('wetter', ['/assets/app.js'], ['/assets/app.js']);
    expect(urls).toContain('wetter/assets/app.js');
    expect(urls.filter((url) => url === 'wetter/assets/app.js')).toHaveLength(1);
  });

  it('lässt den Service Worker und die Precache-Liste selbst weg', () => {
    const urls = precacheUrls('/app/', ['sw.js', 'precache.json', 'app.js'], []);
    expect(urls).not.toContain('/app/sw.js');
    expect(urls).not.toContain('/app/precache.json');
    expect(urls).toContain('/app/app.js');
  });
});
