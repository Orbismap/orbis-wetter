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

/** Wind compass with ticks, cardinal letters and a needle. */
export function Compass({ speed, direction }: { speed: number; direction: number }) {
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const a = (i * 10 * Math.PI) / 180;
    const long = i % 9 === 0;
    const r1 = long ? 40 : 44;
    return <line key={i} x1={60 + Math.sin(a) * r1} y1={60 - Math.cos(a) * r1} x2={60 + Math.sin(a) * 48} y2={60 - Math.cos(a) * 48} opacity={long ? 0.85 : 0.3} />;
  });
  return (
    <svg class="gauge wind-gauge" viewBox="0 0 120 120" aria-label={`${speed} km/h aus ${direction} Grad`}>
      {ticks}
      <text x="60" y="13" text-anchor="middle" class="cardinal">N</text>
      <text x="110" y="64" text-anchor="middle" class="cardinal">O</text>
      <text x="60" y="116" text-anchor="middle" class="cardinal">S</text>
      <text x="10" y="64" text-anchor="middle" class="cardinal">W</text>
      <g transform={`rotate(${direction} 60 60)`}>
        <line x1="60" y1="26" x2="60" y2="52" class="needle" />
        <line x1="60" y1="68" x2="60" y2="94" class="needle tail" />
      </g>
      <text x="60" y="57" text-anchor="middle" class="gauge-value">{speed}</text>
      <text x="60" y="70" text-anchor="middle" class="gauge-unit">km/h</text>
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

/** Sun arc between sunrise and sunset, with the current time marked. */
export function SunCurve({ sunrise, sunset }: { sunrise: string; sunset: string }) {
  return (
    <svg class="sun-curve" viewBox="0 0 160 64" aria-label={`Sonnenaufgang ${sunrise}, Sonnenuntergang ${sunset}`}>
      <line x1="6" y1="50" x2="154" y2="50" class="horizon" />
      <path d="M 8 50 Q 80 -12 152 50" class="arc" />
      <circle cx="80" cy="10" r="5" class="sun-dot" />
      <text x="8" y="62" class="axis">{sunrise}</text>
      <text x="152" y="62" text-anchor="end" class="axis">{sunset}</text>
    </svg>
  );
}
