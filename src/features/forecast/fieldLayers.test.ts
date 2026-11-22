import { describe, expect, it } from 'vitest';
import type { OwxField } from '../../data/owx';
import { buildFieldImage, MERCATOR_LAT, rampColor, TEMPERATURE_RAMP } from './fieldLayers';

function field(name: string, values: number[]): OwxField {
  return {
    header: {
      var: name, nt: 1, ny: 2, nx: 2, lat0: 55, lon0: 10, dx: 1, dy: 1,
      wrap: false, scale: 1, offset: 0, nodata: -32768,
    },
    data: Int16Array.from(values),
  };
}

describe('ICON raster layers', () => {
  it('interpolates colour ramps', () => {
    expect(rampColor(TEMPERATURE_RAMP, -25)).toEqual([59, 76, 192, 1]);
    expect(rampColor(TEMPERATURE_RAMP, 0)).toEqual([124, 196, 255, 1]);
    const mid = rampColor(TEMPERATURE_RAMP, 2.5);
    expect(mid[0]).toBeGreaterThan(124);
    expect(mid[1]).toBeGreaterThan(196);
  });

  it('renders a temperature image with georeferenced bounds', () => {
    const image = buildFieldImage({ temperature_2m: field('T', [0, 5, 10, 15]) }, 0, 'temp')!;
    expect(image.width).toBe(2);
    expect(image.height).toBe(2);
    expect(image.bounds).toEqual([[10, 55], [12, 55], [12, 53], [10, 53]]);
    const first = rampColor(TEMPERATURE_RAMP, 0);
    expect([image.pixels[0], image.pixels[1], image.pixels[2], image.pixels[3]! / 255]).toEqual(first);
  });

  it('clamps polar/antimeridian corners to valid MapLibre image coordinates', () => {
    const global = field('T', [0, 5, 10, 15]);
    global.header = { ...global.header, nx: 2, ny: 4, lat0: 90, lon0: -180, dx: 180, dy: 45 };
    const image = buildFieldImage({ temperature_2m: global }, 0, 'temp')!;
    expect(image.bounds).toEqual([
      [-179.9999, MERCATOR_LAT], [179.9999, MERCATOR_LAT],
      [179.9999, -MERCATOR_LAT], [-179.9999, -MERCATOR_LAT],
    ]);
  });

  it('computes wind magnitude from u/v and keeps nodata transparent', () => {
    const u = field('U', [3, -32768, 0, 0]);
    const v = field('V', [4, 0, 0, 0]);
    const image = buildFieldImage({ u, v }, 0, 'wind')!;
    // hypot(3, 4) * 3.6 = 18 km/h → between the 5 and 20 km/h ramp stops
    expect(image.pixels[3]).toBe(255);
    expect(image.pixels[4 + 3]).toBe(0); // nodata corner
    expect(image.pixels[4 * 3 + 3]).toBe(0); // calm = transparent ramp stop, not nodata
  });
});
