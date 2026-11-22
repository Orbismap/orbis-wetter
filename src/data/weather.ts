/** Orchestrates the sources and maps them into the view model the widgets already know. */
import { sample } from '../features/forecast/sample';
import type { WeatherNow } from '../features/forecast/model';
import { describe } from '../features/wmo/weather';
import { loadIconSeries } from './icon';
import { loadOpenMeteoSeries, loadSupplements } from './openMeteo';
import type { DailyInfo, PointSeries, SourceInfo, SunInfo, WeatherSupplements } from './types';

export interface WeatherLocation {
  name: string;
  eyebrow: string;
  lat: number;
  lng: number;
}

export interface WeatherResult {
  weather: WeatherNow;
  source: SourceInfo;
}

// ---- pure derivation helpers -----------------------------------------------------------------

export function relativeHumidity(t: number, td: number): number {
  const a = 17.625;
  const b = 243.04;
  return Math.min(100, Math.max(0, 100 * Math.exp((a * td) / (b + td) - (a * t) / (b + t))));
}

export function apparentTemperature(t: number, rh: number, windMs: number): number {
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t));
  return t + 0.33 * e - 0.7 * windMs - 4;
}

/** Simple solar elevation: true while the sun is above the horizon. */
export function isDaylight(lng: number, lat: number, at: number): boolean {
  const d = new Date(at);
  const doy = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86_400_000;
  const decl = -23.44 * Math.cos((2 * Math.PI / 365) * (doy + 10));
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + lng / 15;
  const ha = (hours - 12) * 15;
  const r = Math.PI / 180;
  return Math.sin(lat * r) * Math.sin(decl * r) + Math.cos(lat * r) * Math.cos(decl * r) * Math.cos(ha * r) > -0.0145;
}

const COMPASS = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compass = (degrees: number): string => COMPASS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16]!;

const round = (value: number): number => Math.round(value);
const at = (values: (number | undefined)[] | undefined, index: number): number | undefined => values?.[index];

function codeOf(cloud: number, precip: number, temp: number): number {
  if (precip >= 0.1) return temp <= 0.5 ? 71 : 61;
  if (cloud < 20) return 0;
  if (cloud < 60) return 2;
  return 3;
}

function airOf(aqi: number | undefined): WeatherNow['current']['air'] {
  if (aqi === undefined) return sample.current.air;
  const label = aqi <= 20 ? 'Gut' : aqi <= 40 ? 'Mäßig' : aqi <= 60 ? 'Erhöht' : aqi <= 80 ? 'Hoch' : aqi <= 100 ? 'Sehr hoch' : 'Extrem hoch';
  return { value: round(aqi), label, note: 'Europäischer Luftqualitätsindex (CAMS).' };
}

const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'UTC' });
const localHour = (ms: number, offset: number): number => new Date(ms + offset * 1000).getUTCHours();

interface SunMoment { kind: 'sunrise' | 'sunset'; time: number; clock: string }

const minutesOf = (clock: string): number | undefined => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : undefined;
};

/** Sunrise/sunset moments inside the timeline window, derived from the local-noon dates of the daily block. */
function sunMoments(sun: SunInfo[] | undefined, daily: DailyInfo[], from: number, to: number): SunMoment[] {
  const moments: SunMoment[] = [];
  (sun ?? []).forEach((entry, day) => {
    const date = daily[day]?.date;
    if (date === undefined) return;
    const localMidnight = date - 12 * 3_600_000;
    for (const kind of ['sunrise', 'sunset'] as const) {
      const clock = entry[kind];
      const minutes = minutesOf(clock);
      if (minutes === undefined) continue;
      const time = localMidnight + minutes * 60_000;
      if (time >= from && time <= to) moments.push({ kind, time, clock });
    }
  });
  return moments.sort((a, b) => a.time - b.time);
}

/** Build the complete view model from one point series plus whatever supplements are available. */
export function buildWeather(
  series: PointSeries,
  supplements: WeatherSupplements,
  location: WeatherLocation,
): WeatherNow {
  const size = series.times.length;
  const now = Date.now();
  let index = 0;
  while (index < size - 1 && series.times[index + 1]! <= now + 3_600_000) index++;

  const temp = at(series.temp, index) ?? sample.current.temp;
  const wind = at(series.wind, index) ?? sample.current.windSpeed;
  const gust = at(series.gust, index) ?? wind;
  const direction = at(series.dir, index) ?? 0;
  const dewPoint = at(series.dewPoint, index);
  const humidity = at(series.humidity, index) ?? (dewPoint === undefined ? sample.current.humidity : relativeHumidity(temp, dewPoint));
  const cloud = at(series.cloud, index) ?? 50;
  const precipNow = at(series.precip, index) ?? 0;
  const pressure = at(series.pressure, index) ?? sample.current.pressure;
  const pressureBefore = at(series.pressure, Math.max(0, index - 2)) ?? pressure;
  const code = at(series.weatherCode, index) ?? codeOf(cloud, precipNow, temp);
  const feelsLike = round(apparentTemperature(temp, humidity, wind / 3.6));
  const visibility = at(supplements.visibility, Math.min(index, (supplements.visibility?.length ?? 1) - 1));
  const sun = supplements.sun?.[0];
  const sunrise = sun?.sunrise ?? sample.current.sunrise;
  const sunset = sun?.sunset ?? sample.current.sunset;
  const riseMinutes = minutesOf(sunrise) ?? 0;
  const setMinutes = minutesOf(sunset) ?? 0;
  const localNow = new Date(now + series.offsetSeconds * 1000);
  const nowMinutes = localNow.getUTCHours() * 60 + localNow.getUTCMinutes();
  const daylight = setMinutes - riseMinutes;
  const sunUp = daylight > 0
    ? nowMinutes >= riseMinutes && nowMinutes < setMinutes
    : nowMinutes >= riseMinutes || nowMinutes < setMinutes;
  const sunProgress = daylight > 0 ? (nowMinutes - riseMinutes) / daylight : 0;
  const uv = sun?.uv ?? sample.current.uvIndex;
  const daily = supplements.daily?.length ? supplements.daily : dailyFromSeries(series, location);

  const high = round(daily[0]?.max ?? temp);
  const low = round(daily[0]?.min ?? temp);
  const next = daily.slice(1, 8);
  const averageHigh = next.length ? round(next.reduce((sum, d) => sum + d.max, 0) / next.length) : sample.current.averages.averageHigh;

  const hours = [] as WeatherNow['hourly'];
  // A full day ahead – the strip scrolls horizontally, so it no longer needs to be truncated to nine slots.
  const last = Math.min(size, index + 24);
  const moments = sunMoments(
    supplements.sun, daily, series.times[index]! - 30 * 60_000, series.times[last - 1]! + 30 * 60_000,
  );
  let momentIndex = 0;
  for (let i = index; i < last; i++) {
    const time = series.times[i]!;
    // Sunrise/sunset are additional entries inserted before the next hourly column.
    while (momentIndex < moments.length && moments[momentIndex]!.time <= time) {
      const moment = moments[momentIndex++]!;
      hours.push({
        label: moment.clock, time: moment.clock, code: 0, temp: 0,
        isDay: moment.kind === 'sunrise', event: moment.kind,
      });
    }
    const local = localHour(time, series.offsetSeconds);
    hours.push({
      label: i === index ? 'Jetzt' : `${local} Uhr`,
      time: `${String(local).padStart(2, '0')}:00`,
      code: at(series.weatherCode, i) ?? codeOf(at(series.cloud, i) ?? cloud, at(series.precip, i) ?? 0, at(series.temp, i) ?? temp),
      temp: round(at(series.temp, i) ?? temp),
      isDay: (at(series.isDay, i) ?? (isDaylight(location.lng, location.lat, time) ? 1 : 0)) !== 0,
    });
  }
  while (momentIndex < moments.length) {
    const moment = moments[momentIndex++]!;
    hours.push({
      label: moment.clock, time: moment.clock, code: 0, temp: 0,
      isDay: moment.kind === 'sunrise', event: moment.kind,
    });
  }

  const days = daily.slice(0, 10).map((d, i) => ({
    label: i === 0 ? 'Heute' : weekday.format(new Date(d.date)).replace('.', ''),
    code: d.code ?? codeOf(cloud, d.precipitation ?? 0, d.max),
    ...(d.precipitation !== undefined && d.precipitation >= 0.5 ? { chance: Math.min(100, round(d.precipitation * 20)) } : {}),
    min: round(d.min),
    max: round(d.max),
  }));

  const summary = `${describe(code)}. ${gust > wind + 5 ? `Windböen bis ${round(gust)} km/h.` : `Wind ${round(wind)} km/h aus ${compass(direction)}.`}`;
  const feelsLikeNote = feelsLike < temp - 1 ? 'Durch Wind gefühlt kälter.'
    : feelsLike > temp + 1 ? 'Durch Luftfeuchtigkeit wärmer.' : 'Entspricht der Lufttemperatur.';

  return {
    place: { name: location.name, eyebrow: location.eyebrow, lat: location.lat, lng: location.lng },
    current: {
      temp: round(temp),
      feelsLike,
      high,
      low,
      summary,
      windSpeed: round(wind),
      windGust: round(gust),
      windDirection: round(direction),
      windLabel: compass(direction),
      humidity: round(humidity),
      dewPoint: round(dewPoint ?? temp - (100 - humidity) / 5),
      visibility: visibility ?? sample.current.visibility,
      visibilityNote: visibility === undefined ? sample.current.visibilityNote
        : visibility >= 20 ? 'Absolut klare Sicht' : visibility >= 10 ? 'Gute Sicht' : 'Eingeschränkte Sicht',
      pressure: round(pressure),
      pressureTrend: pressure < pressureBefore - 1 ? 'falling' : pressure > pressureBefore + 1 ? 'rising' : 'steady',
      uvIndex: round(uv),
      uvLabel: uv < 3 ? 'Niedrig' : uv < 6 ? 'Mäßig' : uv < 8 ? 'Hoch' : 'Sehr hoch',
      uvNote: uv < 3 ? 'Niedrig für den Rest des Tages.' : uv < 6 ? 'Mäßige UV-Strahlung.' : 'Sonnenschutz empfohlen.',
      precipitation: daily[0]?.precipitation !== undefined ? `${round(daily[0].precipitation)} mm` : `${round(precipNow)} mm`,
      precipitationPeriod: 'Heute',
      precipitationNote: daily[1]?.precipitation !== undefined ? `Morgen ${round(daily[1].precipitation)} mm.` : '',
      feelsLikeNote,
      sunrise,
      sunset,
      sunUp,
      sunProgress,
      averages: { delta: round(high - averageHigh), todayHigh: high, averageHigh },
      moon: sample.current.moon, // moon phase is global and not part of either data source
      air: airOf(supplements.aqi),
      warning: supplements.warning,
    },
    hourly: hours,
    daily: days,
  };
}

/** Last resort when Open-Meteo's daily block is unavailable: group the point series by local day. */
function dailyFromSeries(series: PointSeries, location: WeatherLocation): DailyInfo[] {
  const offset = series.offsetSeconds || Math.round(location.lng / 15) * 3600;
  const dayOf = (ms: number) => Math.floor((ms + offset * 1000) / 86_400_000);
  const groups = new Map<number, number[]>();
  series.times.forEach((ms, i) => {
    const t = at(series.temp, i);
    if (t === undefined) return;
    const key = dayOf(ms);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  });
  return [...groups.entries()].slice(0, 10).map(([day, temps]) => ({
    date: day * 86_400_000 - offset * 1000,
    min: Math.min(...temps),
    max: Math.max(...temps),
  }));
}

/** ICON mirror in R2 may lag behind – Open-Meteo is the default, R2 only a freshness-checked fallback. */
const MAX_ICON_AGE = 12 * 3_600_000;

export async function loadWeather(location: WeatherLocation, signal?: AbortSignal): Promise<WeatherResult> {
  let series: PointSeries | undefined;
  let source: SourceInfo = { label: 'Beispieldaten', detail: 'Live-Quellen nicht erreichbar' };
  try {
    series = await loadOpenMeteoSeries(location.lat, location.lng, { signal });
    source = { label: series.label, detail: series.detail };
  } catch (error) {
    if (signal?.aborted) throw error;
    try {
      const fallback = await loadIconSeries(location.lat, location.lng, { signal });
      if (Date.now() - fallback.issued > MAX_ICON_AGE) throw new Error('ICON-Lauf veraltet');
      series = fallback;
      source = { label: fallback.label, detail: fallback.detail };
    } catch (fallbackError) {
      if (signal?.aborted) throw fallbackError;
    }
  }

  let supplements: WeatherSupplements = {};
  if (series) {
    try {
      supplements = await loadSupplements(location.lat, location.lng, { signal });
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  const weather = series
    ? buildWeather(series, supplements, location)
    : { ...sample, place: { name: location.name, eyebrow: location.eyebrow } };
  return { weather, source };
}
