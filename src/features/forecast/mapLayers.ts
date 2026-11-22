/** Pure helpers for the compact map's layer switcher. */
import type { WxMapMode } from '../handoff/modes';

export interface MarkerCondition {
  temp: number;
  precip: number;
  wind: number;
  code: number;
}

export const MAP_MODES: WxMapMode[] = ['radar', 'precip', 'temp', 'wind'];
export const MODE_TITLE: Record<WxMapMode, string> = {
  radar: 'Radar',
  precip: 'Niederschlag',
  temp: 'Temperatur',
  wind: 'Wind',
};
const SYMBOLS: [number, string][] = [
  [95, '⚡'], [80, '☂'], [71, '❄'], [61, '☂'], [51, '☂'], [45, '≋'], [2, '☁'], [0, '☀'],
];

export function conditionSymbol(code: number): string {
  return SYMBOLS.find(([limit]) => code >= limit!)?.[1] ?? '·';
}

/** Short value shown on a city marker for the active layer. */
export function markerValue(mode: WxMapMode, condition: MarkerCondition): string {
  switch (mode) {
    case 'temp': return `${Math.round(condition.temp)}°`;
    case 'precip': return condition.precip >= 0.1 ? condition.precip.toFixed(1) : '–';
    case 'radar': return conditionSymbol(condition.code);
    case 'wind': return String(Math.round(condition.wind));
  }
}

/** Marker colour by layer and value (cool → warm for temperature, dry → wet for precipitation). */
export function markerColor(mode: WxMapMode, condition: MarkerCondition): string {
  switch (mode) {
    case 'temp':
      return condition.temp <= 0 ? '#7cc4ff' : condition.temp <= 8 ? '#9bd6c4' : condition.temp <= 16 ? '#ffd27a' : '#ff8a5e';
    case 'precip':
      return condition.precip >= 5 ? '#2f6dff' : condition.precip >= 1 ? '#4aa8ff' : condition.precip >= 0.1 ? '#7cc4ff' : '#7d8aa0';
    case 'radar':
      return condition.code >= 61 ? '#4aa8ff' : '#c3ccd9';
    case 'wind':
      return condition.wind >= 40 ? '#ff8a5e' : condition.wind >= 20 ? '#f2b45a' : '#6fd19a';
  }
}
