/** Common shape both sources (R2 ICON fields and Open-Meteo) are normalised into. */
export interface PointSeries {
  label: string;
  /** Short source detail, e.g. the model run. */
  detail: string;
  /** Seconds east of UTC, used to render local hours. */
  offsetSeconds: number;
  /** UTC ms per step. */
  times: number[];
  temp: (number | undefined)[];
  dewPoint: (number | undefined)[];
  /** km/h */
  wind: (number | undefined)[];
  /** km/h */
  gust: (number | undefined)[];
  /** degrees, 0 = north */
  dir: (number | undefined)[];
  /** mm per step */
  precip: (number | undefined)[];
  cloud: (number | undefined)[];
  pressure: (number | undefined)[];
  humidity?: (number | undefined)[];
  weatherCode?: (number | undefined)[];
  isDay?: (number | undefined)[];
}

export interface DailyInfo {
  /** local noon of that day as UTC ms */
  date: number;
  min: number;
  max: number;
  code?: number;
  precipitation?: number;
}

export interface SunInfo {
  sunrise: string;
  sunset: string;
  uv: number;
}

export interface WarningInfo {
  badge: string;
  headline: string;
  text: string;
  source: string;
}

export interface WeatherSupplements {
  daily?: DailyInfo[];
  sun?: SunInfo[];
  visibility?: (number | undefined)[];
  aqi?: number;
  warning?: WarningInfo;
}

export interface SourceInfo {
  label: string;
  detail: string;
}
