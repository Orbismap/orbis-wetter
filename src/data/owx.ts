/** OWX v1 (DWD ICON fields from orbis-wetter R2): decoder and pure point sampling.
 *  Ported from orbis-karten src/data/owx/decode.ts and src/render/gl/grid.ts. */

export interface OwxHeader {
  var: string;
  nt: number;
  ny: number;
  nx: number;
  lat0: number;
  lon0: number;
  dx: number;
  dy: number;
  wrap: boolean;
  scale: number;
  offset: number;
  nodata: number;
  pred?: string;
}

export interface OwxField {
  header: OwxHeader;
  /** Quantised values [t][y][x]; physical value = q * scale + offset. */
  data: Int16Array;
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function decodeOwx(buf: ArrayBuffer): Promise<OwxField> {
  const bytes = new Uint8Array(buf);
  if (bytes[0] !== 0x4f || bytes[1] !== 0x57 || bytes[2] !== 0x58 || bytes[3] !== 0x31) {
    throw new Error('Kein OWX-Format');
  }
  const headerLength = new DataView(buf).getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + headerLength))) as OwxHeader;
  const { nt, ny, nx } = header;
  const planes = await gunzip(bytes.subarray(8 + headerLength));
  const cells = ny * nx;
  const total = nt * cells;
  if (planes.length !== total * 2) throw new Error('OWX: unerwartete Länge');

  const q = new Int16Array(total);
  const spatial = new Int16Array(cells);
  const running = new Int16Array(cells);
  for (let t = 0; t < nt; t++) {
    const offset = t * cells;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = y * nx + x;
        const z = planes[offset + i]! | (planes[total + offset + i]! << 8);
        const d = (z >>> 1) ^ -(z & 1); // zigzag
        spatial[i] = y === 0
          ? (x === 0 ? d : spatial[i - 1]! + d)
          : x === 0 ? spatial[i - nx]! + d : d + spatial[i - 1]! + spatial[i - nx]! - spatial[i - nx - 1]!;
      }
    }
    for (let i = 0; i < cells; i++) {
      running[i] = t === 0 ? spatial[i]! : running[i]! + spatial[i]!;
      q[offset + i] = running[i]!;
    }
  }
  return { header, data: q };
}

export function owxValue(field: OwxField, t: number, y: number, x: number): number | undefined {
  const h = field.header;
  const q = field.data[t * h.ny * h.nx + y * h.nx + x];
  return q === undefined || q === h.nodata ? undefined : q * h.scale + h.offset;
}

export interface Bracket { i0: number; i1: number; f: number }

/** Bracketing time steps; clamps outside the range. */
export function bracketTime(times: readonly number[], at: number): Bracket {
  const n = times.length;
  if (n <= 1 || !(at > times[0]!)) return { i0: 0, i1: 0, f: 0 };
  if (at >= times[n - 1]!) return { i0: n - 1, i1: n - 1, f: 0 };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid]! <= at) lo = mid;
    else hi = mid;
  }
  return { i0: lo, i1: hi, f: (at - times[lo]!) / (times[hi]! - times[lo]!) };
}

const mod = (a: number, n: number) => ((a % n) + n) % n;
export const TILE_SIZE = 45;

/** 45° tile containing a position (c = 0..7 from west, r = 0..3 from north). */
export function tileAt(lng: number, lat: number): { c: number; r: number } {
  return {
    c: Math.min(7, Math.floor(mod(lng + 180, 360) / TILE_SIZE)),
    r: Math.min(3, Math.max(0, Math.floor((90 - lat) / TILE_SIZE))),
  };
}

/** Bilinear sample in space and time, in physical units. */
export function sampleGrid(field: OwxField, br: Bracket, lng: number, lat: number): number | undefined {
  const h = field.header;
  const dx = Math.abs(h.dx);
  const dy = Math.abs(h.dy);
  let gx = (lng - h.lon0) / dx;
  if (h.wrap) gx = mod(gx, h.nx);
  else {
    gx = mod(lng - h.lon0, 360) / dx;
    if (gx > h.nx - 1 + 1e-9) return undefined;
  }
  const gy = (h.lat0 - lat) / dy;
  if (gy < -1e-9 || gy > h.ny - 1 + 1e-9) return undefined;
  const x0 = Math.min(Math.floor(gx), h.wrap ? h.nx - 1 : h.nx - 2);
  const y0 = Math.min(Math.floor(gy), h.ny - 2);
  const fx = gx - x0;
  const fy = gy - y0;
  const x1 = h.wrap ? (x0 + 1) % h.nx : x0 + 1;
  const y1 = y0 + 1;

  let acc = 0;
  let weight = 0;
  const cell = (t: number, x: number, y: number): number | undefined => {
    const q = field.data[(t * h.ny + y) * h.nx + x];
    return q === undefined || q === h.nodata ? undefined : q;
  };
  const corner = (x: number, y: number, w: number) => {
    const a = cell(br.i0, x, y);
    const b = br.f === 0 ? a : cell(br.i1, x, y);
    if (a === undefined || b === undefined) return;
    acc += w * (a + (b - a) * br.f);
    weight += w;
  };
  corner(x0, y0, (1 - fx) * (1 - fy));
  corner(x1, y0, fx * (1 - fy));
  corner(x0, y1, (1 - fx) * fy);
  corner(x1, y1, fx * fy);
  return weight < 1e-6 ? undefined : (acc / weight) * h.scale + h.offset;
}
