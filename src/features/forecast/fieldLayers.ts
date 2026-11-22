/** Builds a raster image from an ICON OWX field – the compact map's 2D weather layers. */
import { owxValue, type OwxField } from '../../data/owx';

export type FieldMode = 'temp' | 'wind' | 'precip';

export interface RampStop { at: number; color: string }

export const TEMPERATURE_RAMP: RampStop[] = [
  { at: -25, color: '#3b4cc0' }, { at: -10, color: '#5b8fd0' }, { at: 0, color: '#7cc4ff' },
  { at: 5, color: '#9bd6c4' }, { at: 12, color: '#ffd27a' }, { at: 22, color: '#ff8a5e' },
  { at: 35, color: '#d94a4a' },
];
export const WIND_RAMP: RampStop[] = [
  { at: 0, color: '#ffffff00' }, { at: 5, color: '#6fd19a' }, { at: 20, color: '#f2b45a' },
  { at: 40, color: '#ff6b5e' }, { at: 70, color: '#a04ad9' },
];
export const PRECIP_RAMP: RampStop[] = [
  { at: 0, color: '#ffffff00' }, { at: 0.1, color: '#7cc4ff' }, { at: 1, color: '#4aa8ff' },
  { at: 5, color: '#2f6dff' }, { at: 20, color: '#aa00aa' },
];

export const MODE_RAMP: Record<FieldMode, RampStop[]> = {
  temp: TEMPERATURE_RAMP, wind: WIND_RAMP, precip: PRECIP_RAMP,
};

function rgb(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  ];
}

/** Linear interpolation between the surrounding stops (RGBA). */
export function rampColor(stops: RampStop[], value: number): [number, number, number, number] {
  if (value <= stops[0]!.at) return rgb(stops[0]!.color);
  const last = stops[stops.length - 1]!;
  if (value >= last.at) return rgb(last.color);
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1]!;
    const b = stops[i]!;
    if (value > b.at) continue;
    const f = (value - a.at) / (b.at - a.at);
    const ca = rgb(a.color);
    const cb = rgb(b.color);
    return [0, 1, 2, 3].map((k) => ca[k]! + (cb[k]! - ca[k]!) * f) as [number, number, number, number];
  }
  return rgb(last.color);
}

export interface FieldImage {
  width: number;
  height: number;
  /** RGBA pixels, row 0 = north. */
  pixels: Uint8ClampedArray;
  /** MapLibre image-source corners: NW, NE, SE, SW. */
  bounds: [[number, number], [number, number], [number, number], [number, number]];
}

/** Renders one time step of the given fields into a raster image for MapLibre. */
export function buildFieldImage(
  fields: Partial<Record<'temperature_2m' | 'u' | 'v' | 'precipitation', OwxField>>,
  timeIndex: number,
  mode: FieldMode,
): FieldImage | undefined {
  const reference = Object.values(fields).find((field) => field !== undefined);
  if (!reference) return undefined;
  const { nx, ny, lon0, lat0, dx, dy } = reference.header;
  const ramp = MODE_RAMP[mode];
  const pixels = new Uint8ClampedArray(nx * ny * 4);
  const valueAt = (y: number, x: number): number => {
    if (mode === 'temp') return owxValue(fields.temperature_2m!, timeIndex, y, x) ?? NaN;
    if (mode === 'precip') return owxValue(fields.precipitation!, timeIndex, y, x) ?? NaN;
    const u = owxValue(fields.u!, timeIndex, y, x);
    const v = owxValue(fields.v!, timeIndex, y, x);
    return u === undefined || v === undefined ? NaN : Math.hypot(u, v) * 3.6;
  };

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const value = valueAt(y, x);
      const i = (y * nx + x) * 4;
      if (!Number.isFinite(value)) {
        pixels[i + 3] = 0;
        continue;
      }
      const [r, g, b, a] = rampColor(ramp, value);
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = a * 255;
    }
  }
  const east = lon0 + nx * Math.abs(dx);
  const south = lat0 - ny * Math.abs(dy);
  return {
    width: nx,
    height: ny,
    pixels,
    bounds: [[lon0, lat0], [east, lat0], [east, south], [lon0, south]],
  };
}
