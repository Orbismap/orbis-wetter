import { describe, expect, it } from 'vitest';
import { buildKartenUrl } from './url';

describe('buildKartenUrl', () => {
  it('builds the map hash with the wetter Karte and Mercator projection', () => {
    expect(buildKartenUrl({ lat: 51.165691, lng: 10.451526, zoom: 5.37, mode: 'radar' })).toBe(
      '/#/@51.1657,10.4515,5.37z?k=wetter&l=radar&g=0',
    );
  });

  it('uses the layer of the selected map mode', () => {
    expect(buildKartenUrl({ lat: 0, lng: 0, zoom: 3, mode: 'wind' })).toBe('/#/@0,0,3z?k=wetter&l=wind&g=0');
    expect(buildKartenUrl({ lat: 0, lng: 0, zoom: 3, mode: 'temp' })).toBe('/#/@0,0,3z?k=wetter&l=temperatur&g=0');
  });

  it('keeps raw commas in p and encodes the place parts', () => {
    expect(buildKartenUrl({ lat: 48.13743, lng: 11.57549, zoom: 9, place: { name: 'München', region: 'Bayern, DE' } })).toBe(
      '/#/@48.1374,11.5755,9z?k=wetter&g=0&p=48.13743,11.57549,M%C3%BCnchen,Bayern%2C%20DE',
    );
  });
});
