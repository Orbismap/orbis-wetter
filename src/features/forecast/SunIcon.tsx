/** Sunrise / sunset pictogram: half sun with rays on the horizon and an arrow below it (up = rise, down = set). */
export function SunIcon({ kind, size = 30 }: { kind: 'sunrise' | 'sunset'; size?: number }) {
  const rise = kind === 'sunrise';
  const rays = [-90, -45, -135, -15, -165].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const near = Math.abs(deg + 90) > 60; // low rays are shorter
    const r1 = 9.5;
    const r2 = near ? 12.2 : 13.4;
    return (
      <line
        key={deg}
        x1={16 + Math.cos(a) * r1} y1={20 + Math.sin(a) * r1}
        x2={16 + Math.cos(a) * r2} y2={20 + Math.sin(a) * r2}
      />
    );
  });
  return (
    <svg class="sun-icon" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="wx-sun-icon-disc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffe9a8" />
          <stop offset="1" stop-color="#f2a93b" />
        </linearGradient>
      </defs>
      <g class="sun-icon-rays">{rays}</g>
      <path d="M8.5 20a7.5 7.5 0 0 1 15 0Z" fill="url(#wx-sun-icon-disc)" />
      <line x1="3.5" y1="20.8" x2="28.5" y2="20.8" class="sun-icon-horizon" />
      <path
        d={rise ? 'M16 30v-5.5m-2.6 2.4L16 24.2l2.6 2.7' : 'M16 24.2v5.6m-2.6-2.5L16 29.9l2.6-2.6'}
        class="sun-icon-arrow"
      />
    </svg>
  );
}
