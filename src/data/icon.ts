/** Primary source: ICON fields from the orbis-wetter R2 bucket. One 45° tile per variable is enough for a point. */
import { r2Url } from './endpoints';
import { cached, fetchArrayBuffer, fetchJson, type FetchOptions } from './http';
import { decodeOwx, sampleGrid, tileAt, type OwxField } from './owx';
import type { PointSeries } from './types';

export interface OwxVarInfo { scale: number; offset: number; unit: string }

export interface OwxLatest {
  v: number;
  model: string;
  run: string;
  issued: number;
  generated: number;
  times: number[];
  attribution: string;
  vars: Record<string, OwxVarInfo>;
}

const VARS = {
  temp: 'temperature_2m',
  dewPoint: 'dew_point_2m',
  u: 'u',
  v: 'v',
  gust: 'wind_gusts_10m',
  precip: 'precipitation',
  cloud: 'cloud_cover',
  pressure: 'pressure_msl',
} as const;

export function loadLatest(options: FetchOptions = {}): Promise<OwxLatest> {
  return cached('icon:latest', 15 * 60_000, async () => {
    const data = await fetchJson<OwxLatest>(r2Url('wetter', 'v1/latest.json'), { ...options, timeout: 15_000 });
    if (data.v !== 1 || !Array.isArray(data.times) || !data.run) throw new Error('Unbekanntes ICON-Datenformat');
    return data;
  });
}

/** Tile for the point; if a variable has no tile, its coarser global overview is used. */
async function loadField(latest: OwxLatest, variable: string, lng: number, lat: number, options: FetchOptions): Promise<OwxField> {
  const { c, r } = tileAt(lng, lat);
  const tile = r2Url('wetter', `v1/${latest.run}/${variable}/t${c}_${r}.owx`);
  const overview = r2Url('wetter', `v1/${latest.run}/${variable}/o.owx`);
  try {
    return await decodeOwx(await fetchArrayBuffer(tile, { ...options, timeout: 30_000 }));
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return await decodeOwx(await fetchArrayBuffer(overview, { ...options, timeout: 60_000 }));
  }
}

export async function loadIconSeries(lat: number, lng: number, options: FetchOptions = {}): Promise<PointSeries> {
  const latest = await loadLatest(options);
  const entries = await Promise.all(Object.entries(VARS).map(async ([key, variable]) => [
    key, await loadField(latest, variable, lng, lat, options),
  ] as const));
  const fields = Object.fromEntries(entries) as Record<keyof typeof VARS, OwxField>;
  const steps = latest.times.length;
  const br = (i: number) => ({ i0: i, i1: i, f: 0 });

  const series: PointSeries = {
    label: 'ICON · R2 (Fallback)',
    detail: `Lauf ${latest.run.slice(-2)} UTC`,
    issued: latest.issued,
    offsetSeconds: Math.round(lng / 15) * 3600,
    times: [...latest.times],
    temp: [], dewPoint: [], wind: [], gust: [], dir: [], precip: [], cloud: [], pressure: [],
  };
  for (let i = 0; i < steps; i++) {
    const at = br(i);
    const t = sampleGrid(fields.temp, at, lng, lat);
    const td = sampleGrid(fields.dewPoint, at, lng, lat);
    const u = sampleGrid(fields.u, at, lng, lat) ?? 0;
    const v = sampleGrid(fields.v, at, lng, lat) ?? 0;
    series.temp.push(t);
    series.dewPoint.push(td);
    series.wind.push(Math.hypot(u, v) * 3.6);
    series.gust.push(sampleGrid(fields.gust, at, lng, lat));
    series.dir.push((Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360);
    series.precip.push(sampleGrid(fields.precip, at, lng, lat));
    series.cloud.push(sampleGrid(fields.cloud, at, lng, lat));
    series.pressure.push(sampleGrid(fields.pressure, at, lng, lat));
  }
  return series;
}
