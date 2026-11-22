// Builds the handoff URL in orbis-karten's hash format (#/@lat,lng,zoomz?k=...&l=...&g=0&p=...).
// Mirrors src/core/url.ts in the map repo: commas in `p` stay raw, components are encoded individually.
import { MODE_LAYERS, type WxMapMode } from './modes';

export interface KartenHandoff {
  lat: number;
  lng: number;
  zoom: number;
  mode?: WxMapMode;
  place?: { name: string; region?: string };
}

const round = (v: number, d: number): number => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

export function buildKartenUrl(h: KartenHandoff): string {
  const view = `@${round(h.lat, 4)},${round(h.lng, 4)},${round(h.zoom, 2)}z`;
  const q = ['k=wetter'];
  const layers = h.mode ? MODE_LAYERS[h.mode] : undefined;
  if (layers?.length) q.push(`l=${layers.map(encodeURIComponent).join(',')}`);
  q.push('g=0'); // the compact map is Mercator; keep the same projection on the other side
  if (h.place) {
    q.push(`p=${[round(h.lat, 5), round(h.lng, 5), encodeURIComponent(h.place.name), encodeURIComponent(h.place.region ?? '')].join(',')}`);
  }
  return `/#/${view}?${q.join('&')}`;
}
