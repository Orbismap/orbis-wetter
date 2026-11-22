import { describe, expect, it } from 'vitest';
import { conditionSymbol, MAP_MODES, markerColor, markerValue, suggestedMapMode } from './mapLayers';

const sample = { temp: 4, precip: 0, wind: 14, code: 3 };

describe('map layers', () => {
  it('exposes the four switchable layers', () => {
    expect(MAP_MODES).toEqual(['radar', 'precip', 'temp', 'wind']);
  });

  it('formats the marker value per layer', () => {
    expect(markerValue('wind', sample)).toBe('14');
    expect(markerValue('temp', sample)).toBe('4°');
    expect(markerValue('precip', sample)).toBe('–');
    expect(markerValue('precip', { ...sample, precip: 1.25 })).toBe('1.3');
    expect(markerValue('radar', { ...sample, code: 95 })).toBe('⚡');
  });

  it('colours markers by value', () => {
    expect(markerColor('temp', { ...sample, temp: -2 })).toBe('#7cc4ff');
    expect(markerColor('temp', { ...sample, temp: 20 })).toBe('#ff8a5e');
    expect(markerColor('precip', { ...sample, precip: 6 })).toBe('#2f6dff');
    expect(markerColor('wind', { ...sample, wind: 45 })).toBe('#ff8a5e');
  });

  it('maps WMO codes to compact symbols', () => {
    expect(conditionSymbol(0)).toBe('☀');
    expect(conditionSymbol(2)).toBe('☁');
    expect(conditionSymbol(71)).toBe('❄');
    expect(conditionSymbol(95)).toBe('⚡');
  });

  it('suggests the layer that matches the current conditions', () => {
    expect(suggestedMapMode(sample)).toBe('precip');
    expect(suggestedMapMode({ ...sample, code: 61 })).toBe('radar'); // rain
    expect(suggestedMapMode({ ...sample, code: 71 })).toBe('radar'); // snow
    expect(suggestedMapMode({ ...sample, code: 3, precip: 4 })).toBe('precip'); // rain earlier today, dry now
    expect(suggestedMapMode({ ...sample, temp: -3 })).toBe('temp');
    expect(suggestedMapMode({ ...sample, temp: 34 })).toBe('temp');
    expect(suggestedMapMode({ ...sample, wind: 48 })).toBe('wind');
    // Rain takes priority over cold/wind.
    expect(suggestedMapMode({ temp: -4, precip: 1, wind: 50, code: 63 })).toBe('radar');
  });
});
