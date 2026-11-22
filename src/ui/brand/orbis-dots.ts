/** Orbis brand geometry: a sphere of single dots, one glows amber. ViewBox 120x120, centre (60,60).
 *  Pure and dependency-free: copied from orbis-map until the tokens/brand move to a shared place. */

export type OrbisVariant = 'logo' | 'small' | 'tiny' | 'motion';

export interface OrbisDot {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
  hot: boolean;
}

interface Spec { n: number; R: number; min: number; gain: number; hr: number }

export const ORBIS_SPECS: Record<OrbisVariant, Spec> = {
  logo: { n: 70, R: 38, min: 1.4, gain: 3, hr: 5.5 },
  small: { n: 34, R: 36, min: 2.4, gain: 4, hr: 7.5 },
  tiny: { n: 12, R: 30, min: 5, gain: 6, hr: 11 },
  motion: { n: 260, R: 38, min: 0.7, gain: 1.7, hr: 4 },
};

export const ORBIS_REST_ROT = 0.5;
const TILT = 0.35;
const GA = Math.PI * (3 - Math.sqrt(5));

function fib(n: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = i * GA;
    out.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return out;
}

function project(p: [number, number, number], rot: number) {
  const [px, py, pz] = p;
  const x = px * Math.cos(rot) - pz * Math.sin(rot);
  const z = px * Math.sin(rot) + pz * Math.cos(rot);
  const y2 = py * Math.cos(TILT) - z * Math.sin(TILT);
  const z2 = py * Math.sin(TILT) + z * Math.cos(TILT);
  return { x, z, y2, z2 };
}

const hotCache = new Map<OrbisVariant, number>();
function hotIndex(variant: OrbisVariant, pts: [number, number, number][]): number {
  const known = hotCache.get(variant);
  if (known !== undefined) return known;
  let best = 0;
  let bestScore = Infinity;
  pts.forEach((p, i) => {
    const { x, z } = project(p, ORBIS_REST_ROT);
    const score = Math.abs(x - 0.35) + Math.abs(p[1] - 0.4) + (z < 0.3 ? 5 : 0);
    if (score < bestScore) { bestScore = score; best = i; }
  });
  hotCache.set(variant, best);
  return best;
}

export function orbisDots(variant: OrbisVariant, rot: number = ORBIS_REST_ROT): OrbisDot[] {
  const s = ORBIS_SPECS[variant];
  const pts = fib(s.n);
  const hot = hotIndex(variant, pts);
  const out: (OrbisDot & { z2: number })[] = [];
  pts.forEach((p, i) => {
    const { x, y2, z2 } = project(p, rot);
    if (z2 < 0.05) return;
    const isHot = i === hot;
    out.push({
      cx: 60 + x * s.R,
      cy: 60 - y2 * s.R,
      r: isHot ? s.hr : s.min + z2 * s.gain,
      opacity: isHot ? 1 : 0.35 + z2 * 0.65,
      hot: isHot,
      z2,
    });
  });
  out.sort((a, b) => a.z2 - b.z2);
  return out.map(({ z2: _z, ...d }) => d);
}

export function variantForSize(size: number): Exclude<OrbisVariant, 'motion'> {
  return size <= 16 ? 'tiny' : size <= 32 ? 'small' : 'logo';
}
