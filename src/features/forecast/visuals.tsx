/** Small, dependency-free SVG visuals shared by the forecast cards. */

/** Shared, padded temperature scale that adapts to the actual forecast instead of fixed sample values. */
export function tempScale(values: Array<{ min: number; max: number }>, pad = 2): { min: number; max: number } {
  if (!values.length) return { min: -10, max: 10 };
  const lows = values.map((v) => v.min);
  const highs = values.map((v) => v.max);
  const lo = Math.floor((Math.min(...lows) - pad) / 5) * 5;
  const hi = Math.ceil((Math.max(...highs) + pad) / 5) * 5;
  return { min: lo, max: hi > lo ? hi : lo + 10 };
}

/** Horizontal temperature band, positioned on a shared scale so the rows are comparable. */
export function TempRange({
  min, max, scaleMin = -8, scaleMax = 6, marker,
}: { min: number; max: number; scaleMin?: number; scaleMax?: number; marker?: number }) {
  const pct = (v: number) => ((v - scaleMin) / (scaleMax - scaleMin)) * 100;
  const left = pct(min);
  const width = Math.max(6, pct(max) - left);
  return (
    <span class="range" aria-hidden="true">
      <span class="range-fill" style={{ left: `${left}%`, width: `${width}%` }} />
      <span class="range-dot" style={{ left: `${pct(marker ?? max)}%` }} />
    </span>
  );
}

/** Gradient bar with a marker, used for air quality and UV. */
export function GradientScale({ value, min, max, colors }: { value: number; min: number; max: number; colors: string[] }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <span class="scale" aria-hidden="true">
      <span class="scale-bar" style={{ background: `linear-gradient(to right, ${colors.join(', ')})` }} />
      <span class="scale-mark" style={{ left: `${pct}%` }} />
    </span>
  );
}

/** Wind compass: graduated dial, cardinal points and a tapered needle speed-tinted from calm to strong. */
export function Compass({ speed, direction }: { speed: number; direction: number }) {
  const accent = speed >= 40 ? '#ff6b5e' : speed >= 20 ? '#f2b45a' : '#6fd19a';
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    const major = i % 6 === 0;
    const medium = i % 3 === 0;
    const inner = major ? 35 : medium ? 39 : 42;
    return (
      <line
        key={i}
        class={`compass-tick${major ? ' major' : medium ? ' medium' : ''}`}
        x1={60 + Math.sin(a) * inner}
        y1={60 - Math.cos(a) * inner}
        x2={60 + Math.sin(a) * 46}
        y2={60 - Math.cos(a) * 46}
      />
    );
  });
  return (
    <svg class="gauge wind-gauge" viewBox="0 0 120 120" role="img" aria-label={`${speed} km/h aus ${direction} Grad`}>
      <defs>
        <linearGradient id="wx-needle-gradient" gradientUnits="userSpaceOnUse" x1="60" y1="12" x2="60" y2="94">
          <stop offset="0" stop-color={accent} />
          <stop offset="0.55" stop-color={accent} stop-opacity="0.92" />
          <stop offset="1" stop-color={accent} stop-opacity="0.35" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="49" class="compass-face" />
      {ticks}
      <g transform={`rotate(${direction} 60 60)`} style={{ filter: `drop-shadow(0 0 3px ${accent}80)` }}>
        <path d="M60 70 L56 88 L60 94 L64 88 Z" class="compass-tail" fill="url(#wx-needle-gradient)" />
        <path d="M60 10 L67 45 L60 54 L53 45 Z" class="compass-needle" fill="url(#wx-needle-gradient)" />
        <path d="M60 10 L60 54 L53 45 Z" class="compass-sheen" />
      </g>
      <circle cx="60" cy="60" r="5" class="compass-hub" />
      <circle cx="60" cy="60" r="1.6" class="compass-hub-dot" />
      <text x="60" y="29" text-anchor="middle" class="cardinal north">N</text>
      <text x="92" y="64" text-anchor="middle" class="cardinal">O</text>
      <text x="60" y="96" text-anchor="middle" class="cardinal">S</text>
      <text x="28" y="64" text-anchor="middle" class="cardinal">W</text>
    </svg>
  );
}

/** Barometer-style semicircle with a needle. */
export function PressureGauge({ value }: { value: number }) {
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI - (i * Math.PI) / 20;
    return <line key={i} x1={60 + Math.cos(a) * 40} y1={70 - Math.sin(a) * 40} x2={60 + Math.cos(a) * 47} y2={70 - Math.sin(a) * 47} opacity={i % 5 === 0 ? 0.9 : 0.35} />;
  });
  const a = Math.PI - (Math.max(980, Math.min(1040, value)) - 980) / 60 * Math.PI;
  return (
    <svg class="gauge pressure-gauge" viewBox="0 0 120 80" aria-label={`${value} Hektopascal`}>
      {ticks}
      <line x1="60" y1="70" x2={60 + Math.cos(a) * 38} y2={70 - Math.sin(a) * 38} class="needle" />
      <circle cx="60" cy="70" r="3" class="needle-pivot" />
    </svg>
  );
}

/** Sun path on a 0–24 h axis: night on both sides, a smooth arc peaking at noon. */
export function SunCurve({ sunrise, sunset, clock }: { sunrise: string; sunset: string; clock: number }) {
  const horizon = 38;
  const amplitude = 17;
  const minutes = (value: string) => {
    const [hours = 0, mins = 0] = value.split(':').map(Number);
    return hours * 60 + mins;
  };
  const rise = minutes(sunrise) / 1440;
  const set = minutes(sunset) / 1440;
  const day = Math.max(1 / 1440, set - rise);
  const night = Math.max(1 / 1440, 1 - day);
  const xAt = (t: number) => 8 + t * 144;
  const yAt = (t: number) => {
    if (t >= rise && t <= set) return horizon - amplitude * Math.sin(Math.PI * (t - rise) / day);
    const q = ((((t - set) % 1) + 1) % 1) / night;
    return horizon + amplitude * Math.sin(Math.PI * q);
  };
  const path = Array.from({ length: 97 }, (_, i) => {
    const t = i / 96;
    return `${i === 0 ? 'M' : 'L'}${xAt(t).toFixed(1)} ${yAt(t).toFixed(1)}`;
  }).join(' ');
  return (
    <svg class="sun-curve" viewBox="0 0 160 64" aria-label={`Sonnenaufgang ${sunrise}, Sonnenuntergang ${sunset}`}>
      <defs>
        <linearGradient id="wx-sun-path" gradientUnits="userSpaceOnUse" x1="0" y1="21" x2="0" y2="55">
          <stop offset="0" stop-color="rgba(255,255,255,0.8)" />
          <stop offset="0.49" stop-color="rgba(255,255,255,0.8)" />
          <stop offset="0.51" stop-color="rgba(255,255,255,0.28)" />
          <stop offset="1" stop-color="rgba(255,255,255,0.28)" />
        </linearGradient>
      </defs>
      <path d={path} class="sun-path" />
      <line x1="4" y1={horizon} x2="156" y2={horizon} class="horizon" />
      <circle cx={xAt(clock)} cy={yAt(clock)} r="4.5" class="sun-dot" />
    </svg>
  );
}
