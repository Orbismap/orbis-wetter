import { orbisDots, variantForSize } from './orbis-dots';

/** The Orbis mark at any size; the dot count follows the rendered size. */
export function OrbisMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      {orbisDots(variantForSize(size)).map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.hot ? '#ffb547' : '#4f8dff'} opacity={d.opacity} />
      ))}
    </svg>
  );
}
