import { orbisDots, variantForSize, type OrbisVariant } from './orbis-dots';

export type OrbisMarkVariant = 'auto' | 'logo' | 'small' | 'tiny';

const cache = new Map<string, ReturnType<typeof orbisDots>>();
function dots(v: Exclude<OrbisVariant, 'motion'>) {
  let d = cache.get(v);
  if (!d) cache.set(v, (d = orbisDots(v)));
  return d;
}

/** Orbis mark, static: a sphere of dots, one glowing amber. Minimum size 12 px. */
export function OrbisMark({ size = 22, variant = 'auto', mono = false }: { size?: number; variant?: OrbisMarkVariant; mono?: boolean }) {
  const v = variant === 'auto' ? variantForSize(size) : variant;
  return (
    <svg class="orbis-mark" width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      {dots(v).map((d, i) => (
        <circle
          key={i}
          cx={d.cx.toFixed(2)}
          cy={d.cy.toFixed(2)}
          r={(mono && d.hot ? d.r * 1.25 : d.r).toFixed(2)}
          fill={mono ? 'currentColor' : d.hot ? 'var(--now, #ffb547)' : 'var(--limb, #4f8dff)'}
          fill-opacity={mono && d.hot ? 1 : d.opacity.toFixed(2)}
        />
      ))}
    </svg>
  );
}
