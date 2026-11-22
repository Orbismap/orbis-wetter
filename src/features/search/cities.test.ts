import { describe, expect, it } from 'vitest';
import { CITIES, filterCities, normalize } from './cities';

describe('search cities', () => {
  it('normalizes case, umlauts and whitespace', () => {
    expect(normalize('  MÜNCHEN ')).toBe('munchen');
    expect(normalize('Straße')).toBe('strasse');
  });

  it('finds cities by name, umlaut-insensitively', () => {
    expect(filterCities('munchen')[0]?.name).toBe('München');
    expect(filterCities('koln')[0]?.name).toBe('Köln');
  });

  it('finds cities by region and ranks prefix matches first', () => {
    expect(filterCities('schleswig')[0]?.name).toBe('Kiel');
    expect(filterCities('ber')[0]?.name).toBe('Berlin');
    expect(filterCities('ber').map((city) => city.name)).toContain('Nürnberg');
  });

  it('returns a capped prefix of the list for an empty query and none for no match', () => {
    expect(filterCities('')).toHaveLength(8);
    expect(filterCities('')).toEqual(CITIES.slice(0, 8));
    expect(filterCities('zzzznope')).toEqual([]);
  });
});
