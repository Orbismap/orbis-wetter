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

/** Wind compass: dial with outside cardinals and a two-tone needle whose coloured tip points to where the wind comes from. */
export function Compass({ speed, direction }: { speed: number; direction: number }) {
  const accent = speed >= 40 ? '#ff6b5e' : speed >= 20 ? '#f2b45a' : '#6fd19a';
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const a = (i * 10 * Math.PI) / 180;
    const major = i % 9 === 0;
    const inner = major ? 34 : 37.5;
    return (
      <line
        key={i}
        class={`compass-tick${major ? ' major' : ''}`}
        x1={60 + Math.sin(a) * inner}
        y1={60 - Math.cos(a) * inner}
        x2={60 + Math.sin(a) * 42}
        y2={60 - Math.cos(a) * 42}
      />
    );
  });
  return (
    <svg class="gauge wind-gauge" viewBox="0 0 120 120" role="img" aria-label={`${speed} km/h aus ${direction} Grad`}>
      <circle cx="60" cy="60" r="42" class="compass-face" />
      {ticks}
      <text x="60" y="12" text-anchor="middle" class="cardinal north">N</text>
      <text x="111" y="63.5" text-anchor="middle" class="cardinal">O</text>
      <text x="60" y="114" text-anchor="middle" class="cardinal">S</text>
      <text x="9" y="63.5" text-anchor="middle" class="cardinal">W</text>
      <g transform={`rotate(${direction} 60 60)`}>
        <g class="compass-needle" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
          {/* tail: where the wind blows to */}
          <path d="M54.5 60 L65.5 60 L60 84 Z" class="needle-tail" />
          {/* head: where the wind comes from */}
          <path d="M54.5 60 L65.5 60 L60 16 Z" fill={accent} />
          <path d="M60 16 L60 60 L54.5 60 Z" fill="#fff" opacity="0.28" />
        </g>
      </g>
      <circle cx="60" cy="60" r="5.5" class="compass-hub" />
      <circle cx="60" cy="60" r="1.8" class="compass-hub-dot" />
    </svg>
  );
}

/** Barometer: a 180° dial from 970 to 1050 hPa with the value in the middle. */
export function PressureGauge({ value }: { value: number }) {
  const min = 970;
  const max = 1050;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = Math.PI * (1 - t); // π = left end, 0 = right end
  const cx = 60;
  const cy = 62;
  const r = 48;
  const point = (a: number, radius = r) => `${(cx + Math.cos(a) * radius).toFixed(2)} ${(cy - Math.sin(a) * radius).toFixed(2)}`;
  const marker = point(angle);
  return (
    <svg class="gauge pressure-gauge" viewBox="0 0 120 78" role="img" aria-label={`${value} Hektopascal`}>
      <defs>
        <linearGradient id="wx-pressure-arc" gradientUnits="userSpaceOnUse" x1="12" y1="0" x2="108" y2="0">
          <stop offset="0" stop-color="#63b8ff" />
          <stop offset="0.5" stop-color="#a8e6cf" />
          <stop offset="1" stop-color="#f2c94c" />
        </linearGradient>
      </defs>
      <path d={`M${point(Math.PI)} A${r} ${r} 0 0 1 ${point(0)}`} class="pressure-track" />
      <path d={`M${point(Math.PI)} A${r} ${r} 0 0 1 ${marker}`} class="pressure-fill" stroke="url(#wx-pressure-arc)" />
      <circle cx={marker.split(' ')[0]} cy={marker.split(' ')[1]} r="5.5" class="pressure-knob" />
      <text x="60" y="58" text-anchor="middle" class="pressure-num">{value.toLocaleString('de-DE')}</text>
      <text x="60" y="71" text-anchor="middle" class="pressure-unit">hPa</text>
    </svg>
  );
}

/** Sun path on a 0–24 h axis: one continuous wave across the full width, bright by day, dim by night. */
export function SunCurve({ sunrise, sunset, clock }: { sunrise: string; sunset: string; clock: number }) {
  const horizon = 32;
  const amplitude = 25;
  const minutes = (value: string) => {
    const [hours = 0, mins = 0] = value.split(':').map(Number);
    return hours * 60 + mins;
  };
  const rise = minutes(sunrise) / 1440;
  const set = minutes(sunset) / 1440;
  const polar = set <= rise; // no usable sunrise/sunset pair – draw a flat day
  const day = polar ? 1 : set - rise;
  const night = Math.max(1 / 1440, 1 - day);
  const xAt = (t: number) => t * 160;
  const isDay = (t: number) => !polar && t >= rise && t <= set;
  const yAt = (t: number) => {
    if (polar) return horizon - amplitude * 0.5;
    if (isDay(t)) return horizon - amplitude * Math.sin(Math.PI * (t - rise) / day);
    const q = ((((t - set) % 1) + 1) % 1) / night;
    return horizon + 0.8 * amplitude * Math.sin(Math.PI * q);
  };
  const trace = (from: number, to: number, steps: number) => Array.from({ length: steps + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / steps;
    return `${i === 0 ? 'M' : 'L'}${xAt(t).toFixed(1)} ${yAt(t).toFixed(1)}`;
  }).join(' ');
  const nightPaths = polar ? [] : [trace(0, rise, 16), trace(set, 1, 32)];
  const sunClock = ((clock % 1) + 1) % 1;
  const sx = xAt(sunClock);
  const sy = yAt(sunClock);
  return (
    <div class="sun-curve" role="img" aria-label={`Sonnenaufgang ${sunrise}, Sonnenuntergang ${sunset}`}>
      {/* Stretched to whatever the card allows; the dot is HTML so it stays round. */}
      <svg viewBox="0 0 160 64" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1={horizon} x2="160" y2={horizon} class="horizon" />
        {nightPaths.map((d, i) => <path key={i} d={d} class="sun-night" />)}
        <path d={polar ? trace(0, 1, 2) : trace(rise, set, 64)} class="sun-path" />
      </svg>
      <span class="sun-dot" style={{ left: `${(sx / 160) * 100}%`, top: `${(sy / 64) * 100}%` }} />
    </div>
  );
}

/** Thin horizontal meter (0..max) for humidity, visibility and precipitation. */
export function Meter({ value, max, tone = 'cold' }: { value: number; max: number; tone?: 'cold' | 'warm' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span class={`meter meter-${tone}`} aria-hidden="true">
      <span class="meter-fill" style={{ width: `${pct}%` }} />
    </span>
  );
}
