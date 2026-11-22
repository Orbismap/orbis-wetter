/** Live APIs: Open-Meteo point forecast (same ICON model as the R2 mirror), air quality and DWD warnings. */
import { API } from './endpoints';
import { cached, fetchJson, type FetchOptions } from './http';
import type { DailyInfo, PointSeries, SunInfo, WarningInfo, WeatherSupplements } from './types';

interface ForecastResponse {
  utc_offset_seconds: number;
  hourly: Record<string, (string | number | null)[]>;
  daily: Record<string, (string | number | null)[]>;
}

const forecastFields = {
  hourly: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,is_day,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl',
  daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum',
};

const num = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const arr = (response: ForecastResponse, key: string): (number | null)[] =>
  (response.hourly[key] ?? response.daily[key] ?? []) as (number | null)[];

/** Local time string from Open-Meteo -> UTC ms (the API returns local wall time plus an offset in seconds). */
function toUtc(local: string | number | null, offsetSeconds: number): number | undefined {
  if (typeof local !== 'string') return undefined;
  const ms = Date.parse(`${local.length === 16 ? `${local}:00` : local}Z`);
  return Number.isFinite(ms) ? ms - offsetSeconds * 1000 : undefined;
}

export function loadForecast(lat: number, lng: number, options: FetchOptions = {}): Promise<ForecastResponse> {
  const url = new URL(API.forecast);
  url.search = new URLSearchParams({
    latitude: String(lat), longitude: String(lng), timezone: 'auto', forecast_days: '10', models: 'icon_global',
    ...forecastFields,
  }).toString();
  return cached(`om:forecast:${lat.toFixed(3)}:${lng.toFixed(3)}`, 10 * 60_000,
    () => fetchJson<ForecastResponse>(url.toString(), { ...options, timeout: 20_000 }));
}

export async function loadOpenMeteoSeries(lat: number, lng: number, options: FetchOptions = {}): Promise<PointSeries> {
  const response = await loadForecast(lat, lng, options);
  const offset = response.utc_offset_seconds || 0;
  const times = (response.hourly.time ?? []).map((t) => toUtc(t, offset)).filter((t): t is number => t !== undefined);
  const values = (key: string) => arr(response, key).map(num);
  const series: PointSeries = {
    label: 'Open-Meteo',
    detail: 'ICON · Live',
    issued: Date.now(),
    offsetSeconds: offset,
    times,
    temp: values('temperature_2m'),
    dewPoint: [], // Open-Meteo has no dew point in this request; humidity is used directly
    wind: values('wind_speed_10m'),
    gust: values('wind_gusts_10m'),
    dir: values('wind_direction_10m'),
    precip: values('precipitation'),
    cloud: [],
    pressure: values('pressure_msl'),
    humidity: values('relative_humidity_2m'),
    weatherCode: values('weather_code'),
    isDay: values('is_day'),
  };
  // Open-Meteo wind is already km/h; no dew point in the request, humidity is used directly.
  return series;
}

/** Fast supplements (cached forecast + air quality). Warnings load separately – DWD's WFS takes several seconds. */
export function loadSupplements(lat: number, lng: number, options: FetchOptions = {}): Promise<WeatherSupplements> {
  return (async () => {
    const response = await loadForecast(lat, lng, options);
    const offset = response.utc_offset_seconds || 0;
    const dates = response.daily.time ?? [];
    const daily: DailyInfo[] = dates.map((date, i) => ({
      date: toUtc(`${date}T12:00`, offset) ?? Date.parse(`${date}T12:00Z`),
      min: num(arr(response, 'temperature_2m_min')[i]) ?? 0,
      max: num(arr(response, 'temperature_2m_max')[i]) ?? 0,
      code: num(arr(response, 'weather_code')[i]),
      precipitation: num(arr(response, 'precipitation_sum')[i]),
    }));
    const sun: SunInfo[] = dates.map((_, i) => ({
      sunrise: String(arr(response, 'sunrise')[i] ?? '').slice(-5),
      sunset: String(arr(response, 'sunset')[i] ?? '').slice(-5),
      uv: num(arr(response, 'uv_index_max')[i]) ?? 0,
    }));
    const visibility = arr(response, 'visibility').map(num);
    const aqi = await loadAirQuality(lat, lng, options).catch(() => undefined);
    return { daily, sun, visibility, aqi };
  })();
}

interface AirResponse { current?: Record<string, number | null> }

export function loadAirQuality(lat: number, lng: number, options: FetchOptions = {}): Promise<number | undefined> {
  const url = new URL(API.airQuality);
  url.search = new URLSearchParams({
    latitude: String(lat), longitude: String(lng), current: 'european_aqi', timezone: 'auto',
  }).toString();
  return cached(`om:air:${lat.toFixed(3)}:${lng.toFixed(3)}`, 30 * 60_000, async () => {
    const data = await fetchJson<AirResponse>(url.toString(), { ...options, timeout: 15_000 });
    return num(data.current?.european_aqi ?? null);
  });
}

// ---- conditions at the map's city markers ----------------------------------------------------

export interface CityCondition {
  temp: number;
  precip: number;
  wind: number;
  code: number;
}

/** One multi-location request for all map markers (Open-Meteo accepts comma-separated coordinates). */
export function loadCityConditions(
  points: ReadonlyArray<{ lat: number; lng: number }>,
  options: FetchOptions = {},
): Promise<CityCondition[]> {
  if (!points.length) return Promise.resolve([]);
  const url = new URL(API.forecast);
  url.search = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(','),
    longitude: points.map((p) => p.lng).join(','),
    current: 'temperature_2m,precipitation,wind_speed_10m,weather_code',
    timezone: 'auto',
  }).toString();
  const key = `om:cities:${points.map((p) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`).join(';')}`;
  return cached(key, 10 * 60_000, async () => {
    const raw = await fetchJson<{ current?: Record<string, unknown> } | { current?: Record<string, unknown> }[]>(
      url.toString(), { ...options, timeout: 20_000 },
    );
    const list = Array.isArray(raw) ? raw : [raw];
    return list.map((item) => ({
      temp: num(item.current?.temperature_2m) ?? 0,
      precip: num(item.current?.precipitation) ?? 0,
      wind: num(item.current?.wind_speed_10m) ?? 0,
      code: num(item.current?.weather_code) ?? 0,
    }));
  });
}

// ---- DWD warnings -----------------------------------------------------------------------------

interface DwdFeature {
  geometry?: { type: string; coordinates: unknown } | null;
  properties?: Record<string, string | number | null>;
}

function inRing(point: [number, number], ring: unknown): boolean {
  if (!Array.isArray(ring)) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as [number, number];
    const b = ring[j] as [number, number];
    if (!Array.isArray(a) || !Array.isArray(b)) continue;
    if ((a[1] > point[1]) !== (b[1] > point[1])
      && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function contains(feature: DwdFeature, lng: number, lat: number): boolean {
  const geometry = feature.geometry;
  if (!geometry) return false;
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as unknown[][];
    return Array.isArray(rings) && inRing([lng, lat], rings[0]) && !rings.slice(1).some((hole) => inRing([lng, lat], hole));
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as unknown[][][]).some((polygon) => Array.isArray(polygon)
      && inRing([lng, lat], polygon[0]) && !polygon.slice(1).some((hole) => inRing([lng, lat], hole)));
  }
  return false;
}

const SEVERITY: Record<string, { level: number; badge: string }> = {
  minor: { level: 1, badge: 'Warnstufe Gelb' },
  moderate: { level: 2, badge: 'Warnstufe Orange' },
  severe: { level: 3, badge: 'Warnstufe Rot' },
  extreme: { level: 4, badge: 'Warnstufe Violett' },
};

export function loadWarning(lat: number, lng: number, options: FetchOptions = {}): Promise<WarningInfo | undefined> {
  const url = new URL(API.warnings);
  url.searchParams.set('bbox', `${lng - 0.8},${lat - 0.6},${lng + 0.8},${lat + 0.6}`);
  return cached(`dwd:warning:${lat.toFixed(2)}:${lng.toFixed(2)}`, 5 * 60_000, async () => {
    const data = await fetchJson<{ features?: DwdFeature[] }>(url.toString(), { ...options, timeout: 20_000 });
    const now = Date.now();
    const candidates = (data.features ?? []).filter((feature) => {
      const p = feature.properties;
      if (!p || !contains(feature, lng, lat)) return false;
      const expires = typeof p.EXPIRES === 'string' ? Date.parse(p.EXPIRES) : NaN;
      const onset = typeof p.ONSET === 'string' ? Date.parse(p.ONSET) : 0;
      return (!Number.isFinite(expires) || expires > now) && onset <= now + 60 * 60_000;
    });
    if (!candidates.length) return undefined;
    candidates.sort((a, b) => (SEVERITY[String(b.properties?.SEVERITY ?? '').toLowerCase()]?.level ?? 0)
      - (SEVERITY[String(a.properties?.SEVERITY ?? '').toLowerCase()]?.level ?? 0));
    const p = candidates[0]!.properties!;
    const severity = SEVERITY[String(p.SEVERITY ?? '').toLowerCase()] ?? SEVERITY.minor!;
    return {
      badge: severity.badge,
      headline: String(p.HEADLINE || p.EVENT || 'Wetterwarnung'),
      text: String(p.DESCRIPTION ?? '').replace(/\s+/g, ' ').trim().slice(0, 240),
      source: 'Deutscher Wetterdienst',
    };
  });
}
