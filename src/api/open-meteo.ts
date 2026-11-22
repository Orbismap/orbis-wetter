/** Minimal Open-Meteo groundwork: endpoint and response shapes the forecast view will use.
 *  No fetching or caching yet – those arrive with the actual forecast feature. */

export const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
export const FORECAST_ATTRIBUTION = 'Wetterdaten: Open-Meteo.com (CC BY 4.0)';

/** Fields needed for the first forecast screen (current conditions + hourly + daily). */
export const FORECAST_FIELDS = {
  current: 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
  hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,is_day,wind_speed_10m',
  daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max',
} as const;

export interface ForecastResponse {
  utc_offset_seconds: number;
  elevation: number;
  current: { time: string; temperature_2m: number; weather_code: number; is_day: number; apparent_temperature: number };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; is_day: number[]; precipitation_probability: number[] };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

export function forecastUrl(lat: number, lng: number): string {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    timezone: 'auto',
    forecast_days: '14',
    ...FORECAST_FIELDS,
  });
  return `${FORECAST_ENDPOINT}?${q}`;
}
