import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PointSeries, WeatherSupplements } from './types';

vi.mock('./icon', () => ({ loadIconSeries: vi.fn() }));
vi.mock('./openMeteo', () => ({ loadOpenMeteoSeries: vi.fn(), loadSupplements: vi.fn() }));

import { loadIconSeries } from './icon';
import { loadOpenMeteoSeries, loadSupplements } from './openMeteo';
import { buildWeather, compass, loadWeather } from './weather';

const location = { name: 'Bad Kleinen', eyebrow: 'Mecklenburg-Vorpommern', lat: 53.75, lng: 11.47 };

function series(label = 'ICON · R2'): PointSeries {
  const base = Date.now() - 30 * 60_000;
  const times = Array.from({ length: 24 }, (_, i) => base + i * 3_600_000);
  return {
    label, detail: 'Lauf 12 UTC', offsetSeconds: 3600, times,
    temp: times.map(() => 4),
    dewPoint: times.map(() => 1),
    wind: times.map(() => 14),
    gust: times.map(() => 25),
    dir: times.map(() => 355),
    precip: times.map(() => 0),
    cloud: times.map(() => 20),
    pressure: times.map(() => 1012),
    humidity: times.map(() => 79),
    weatherCode: times.map(() => 0),
    isDay: times.map(() => 1),
  };
}

const supplements: WeatherSupplements = {
  daily: Array.from({ length: 10 }, (_, i) => ({
    date: Date.now() + i * 86_400_000, min: i % 2, max: 5 + i, code: 2,
  })),
  sun: Array.from({ length: 10 }, () => ({ sunrise: '07:55', sunset: '16:06', uv: 1 })),
  visibility: Array.from({ length: 24 }, () => 17),
  aqi: 20,
  warning: { badge: 'Warnstufe Gelb', headline: 'Wetterhinweis', text: 'Frost', source: 'Deutscher Wetterdienst' },
};

describe('weather view model', () => {
  it('maps a point series and supplements into the widget model', () => {
    const weather = buildWeather(series(), supplements, location);
    expect(weather.place.name).toBe('Bad Kleinen');
    expect(weather.current.temp).toBe(4);
    expect(weather.current.windSpeed).toBe(14);
    expect(weather.current.windGust).toBe(25);
    expect(weather.current.windLabel).toBe('N');
    expect(weather.current.high).toBe(5);
    expect(weather.current.low).toBe(0);
    expect(weather.current.air).toMatchObject({ value: 20, label: 'Gut' });
    expect(weather.current.warning).toEqual(supplements.warning);
    expect(weather.hourly).toHaveLength(9);
    expect(weather.daily).toHaveLength(10);
    expect(weather.daily[0]!.label).toBe('Heute');
  });

  it('falls back to deriving days from the series when Open-Meteo is unavailable', () => {
    const weather = buildWeather(series(), {}, location);
    expect(weather.daily.length).toBeGreaterThan(0);
    expect(weather.current.sunrise).toBeTruthy();
  });

  it('maps compass directions', () => {
    expect(compass(0)).toBe('N');
    expect(compass(270)).toBe('W');
    expect(compass(90)).toBe('O');
    expect(compass(180)).toBe('S');
  });
});

describe('source chain', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses R2 ICON first', async () => {
    vi.mocked(loadIconSeries).mockResolvedValue(series());
    vi.mocked(loadSupplements).mockResolvedValue(supplements);
    const result = await loadWeather(location);
    expect(result.source.label).toBe('ICON · R2');
    expect(result.weather.current.temp).toBe(4);
  });

  it('falls back to Open-Meteo when R2 fails', async () => {
    vi.mocked(loadIconSeries).mockRejectedValue(new Error('R2 down'));
    vi.mocked(loadOpenMeteoSeries).mockResolvedValue(series('Open-Meteo'));
    vi.mocked(loadSupplements).mockResolvedValue(supplements);
    const result = await loadWeather(location);
    expect(result.source.label).toBe('Open-Meteo');
  });

  it('falls back to sample data when every live source fails', async () => {
    vi.mocked(loadIconSeries).mockRejectedValue(new Error('R2 down'));
    vi.mocked(loadOpenMeteoSeries).mockRejectedValue(new Error('API down'));
    const result = await loadWeather(location);
    expect(result.source.label).toBe('Beispieldaten');
    expect(result.weather.place.name).toBe('Bad Kleinen');
    expect(result.weather.current.temp).toBe(4);
  });
});
