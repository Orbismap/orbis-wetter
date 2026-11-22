/** Moon phase without an API: synodic cycle from a known new moon, mapped to the 28 supplied images. */

const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

export interface MoonInfo {
  /** German phase name. */
  phase: string;
  /** Illuminated fraction in percent. */
  illumination: number;
  /** Approximate local moonrise time ("HH:MM"). */
  rise: string;
  /** Next full moon as a relative label. */
  full: string;
  /** Next new moon as a relative label. */
  newMoon: string;
  /** Whichever of the two comes first. */
  next: { name: 'Vollmond' | 'Neumond'; when: string };
  /** Index of public/moon/moonPhase<N>.webp (0 = new, 14 = full). */
  image: number;
}

const pad = (value: number) => String(value).padStart(2, '0');
const inDays = (days: number): string =>
  days < 0.5 ? 'heute' : days < 1.5 ? 'morgen' : `in ${Math.round(days)} Tagen`;

const PHASE_NAMES: Array<[number, string]> = [
  [0, 'Neumond'],
  [7, 'Erstes Viertel'],
  [14, 'Vollmond'],
  [21, 'Letztes Viertel'],
];

function phaseName(index: number): string {
  const exact = PHASE_NAMES.find(([at]) => at === index);
  if (exact) return exact[1];
  if (index < 7) return 'Zunehmende Sichel';
  if (index < 14) return 'Zunehmender Dreiviertelmond';
  if (index < 21) return 'Abnehmender Dreiviertelmond';
  return 'Abnehmende Sichel';
}

export function moonInfo(at: number = Date.now()): MoonInfo {
  const fraction = (((at - KNOWN_NEW_MOON) / 86_400_000 / SYNODIC_DAYS) % 1 + 1) % 1;
  const image = Math.floor(fraction * 28 + 0.5) % 28;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * fraction)) / 2 * 100);
  // New moon rises around sunrise, full moon around sunset – good enough for a compact card.
  const riseMinutes = Math.round(6 * 60 + fraction * 12 * 60) % 1440;
  const toFull = ((0.5 - fraction + 1) % 1) * SYNODIC_DAYS;
  const toNew = ((1 - fraction) % 1) * SYNODIC_DAYS;
  return {
    phase: phaseName(image),
    illumination,
    rise: `${pad(Math.floor(riseMinutes / 60))}:${pad(riseMinutes % 60)}`,
    full: inDays(toFull),
    newMoon: inDays(toNew),
    next: toFull <= toNew
      ? { name: 'Vollmond', when: inDays(toFull) }
      : { name: 'Neumond', when: inDays(toNew) },
    image,
  };
}

/** Public asset path; Vite's base keeps it correct under /wetter/. */
export const moonImageUrl = (index: number): string =>
  `${import.meta.env.BASE_URL}moon/moonPhase${Math.max(0, Math.min(27, index))}.webp`;
