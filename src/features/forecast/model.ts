/** View model for the desktop forecast. Cards read this, not the raw API – so the sample data can later be
 *  replaced by Open-Meteo without touching a single card. */

export interface Hour {
  /** "Jetzt", "15 Uhr", … */
  label: string;
  time: string;
  code: number;
  temp: number;
  isDay: boolean;
  /** Extra timeline entry between two hours (not a replacement for an hourly column). */
  event?: 'sunrise' | 'sunset';
}

export interface Day {
  label: string;
  code: number;
  /** precipitation probability in % */
  chance?: number;
  min: number;
  max: number;
}

export interface WeatherNow {
  place: { name: string; eyebrow: string; lat?: number; lng?: number };
  current: {
    temp: number;
    feelsLike: number;
    high: number;
    low: number;
    summary: string;
    windSpeed: number;
    windGust: number;
    windDirection: number;
    windLabel: string;
    humidity: number;
    dewPoint: number;
    visibility: number;
    visibilityNote: string;
    pressure: number;
    pressureTrend: 'falling' | 'steady' | 'rising';
    uvIndex: number;
    uvLabel: string;
    uvNote: string;
    precipitation: string;
    precipitationPeriod: string;
    precipitationNote: string;
    feelsLikeNote: string;
    sunrise: string;
    sunset: string;
    averages: { delta: number; todayHigh: number; averageHigh: number };
    moon: { phase: string; illumination: number; rise: string; full: string };
    air: { value: number; label: string; note: string };
    warning?: { badge: string; headline: string; text: string; source: string };
  };
  hourly: Hour[];
  daily: Day[];
}
