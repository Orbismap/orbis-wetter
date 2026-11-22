/** Data endpoints. R2 mirrors first, live APIs as fallback and for fields the buckets don't carry.
 *  All R2 buckets answer with CORS "*" (same setup as orbis-karten). Overrides via VITE_* in .env. */

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const slash = (value: string | undefined, fallback: string): string => {
  const s = value?.trim() || fallback;
  return s.endsWith('/') ? s : `${s}/`;
};

export const R2 = {
  /** ICON fields (OWX), v1/latest.json + v1/<run>/<var>/<part>.owx */
  wetter: slash(env.VITE_WETTER_BASE, 'https://orbis-wetter.maltee.dev/'),
  live: slash(env.VITE_LIVE_BASE, 'https://orbis-live.maltee.dev/'),
  data: slash(env.VITE_DATA_BASE, 'https://orbis-data.maltee.dev/'),
} as const;

export const API = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  /** DWD warning districts (GeoJSON, CORS enabled) */
  warnings: 'https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd:Warnungen_Landkreise&outputFormat=application/json',
} as const;

export const r2Url = (bucket: keyof typeof R2, key: string): string => R2[bucket] + key.replace(/^\//, '');

export const ATTRIBUTION = {
  icon: 'DWD ICON, CC BY 4.0 – verändert (Orbis-R2)',
  openMeteo: 'Open-Meteo.com (CC BY 4.0), Modell ICON',
  air: 'Open-Meteo / Copernicus CAMS',
  warnings: 'Deutscher Wetterdienst',
} as const;
