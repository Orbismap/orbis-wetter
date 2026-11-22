import { describe, expect, it } from 'vitest';
import { decodeOwx, sampleGrid, tileAt, type OwxHeader } from './owx';

/** Minimal OWX v1 encoder (one time step) so the decoder can be tested without a 2 MB fixture. */
async function encode(values: number[], header: OwxHeader): Promise<ArrayBuffer> {
  const n = values.length;
  const q = values.map((v) => Math.round((v - header.offset) / header.scale));
  const low = new Uint8Array(n);
  const high = new Uint8Array(n);
  values.forEach((_, i) => {
    const y = Math.floor(i / header.nx);
    const x = i % header.nx;
    const left = x > 0 ? q[i - 1]! : 0;
    const up = y > 0 ? q[i - header.nx]! : 0;
    const diag = x > 0 && y > 0 ? q[i - header.nx - 1]! : 0;
    const d = q[i]! - left - up + diag;
    const z = (d << 1) ^ (d >> 15); // zigzag
    low[i] = z & 0xff;
    high[i] = (z >> 8) & 0xff;
  });
  const planes = new Uint8Array(2 * n);
  planes.set(low, 0);
  planes.set(high, n);
  const stream = new Blob([planes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
  const gz = new Uint8Array(await new Response(stream).arrayBuffer());

  const json = new TextEncoder().encode(JSON.stringify(header));
  const out = new Uint8Array(8 + json.length + gz.length);
  out.set([0x4f, 0x57, 0x58, 0x31], 0); // OWX1
  new DataView(out.buffer).setUint32(4, json.length, true);
  out.set(json, 8);
  out.set(gz, 8 + json.length);
  return out.buffer;
}

const header: OwxHeader = {
  var: 'temperature_2m', nt: 1, ny: 2, nx: 2,
  lat0: 50, lon0: 10, dx: 1, dy: 1, wrap: false,
  scale: 1, offset: 0, nodata: -32768,
};

describe('OWX fields', () => {
  it('decodes header and quantised values', async () => {
    const field = await decodeOwx(await encode([1, 2, 3, 4], header));
    expect(field.header).toMatchObject({ var: 'temperature_2m', nx: 2, ny: 2 });
    expect(Array.from(field.data)).toEqual([1, 2, 3, 4]);
  });

  it('samples a point bilinearly in physical units', async () => {
    const field = await decodeOwx(await encode([1, 2, 3, 4], header));
    expect(sampleGrid(field, { i0: 0, i1: 0, f: 0 }, 11, 49)).toBeCloseTo(4);
    expect(sampleGrid(field, { i0: 0, i1: 0, f: 0 }, 10.5, 49.5)).toBeCloseTo(2.5);
    expect(sampleGrid(field, { i0: 0, i1: 0, f: 0 }, 12, 49)).toBeUndefined();
  });

  it('selects the 45 degree tile of a position', () => {
    expect(tileAt(11.47, 53.75)).toEqual({ c: 4, r: 0 });
    expect(tileAt(-0.13, 51.51)).toEqual({ c: 3, r: 0 });
  });
});
