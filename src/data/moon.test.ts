import { describe, expect, it } from 'vitest';
import { moonInfo } from './moon';

const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC = 29.530588853;

const atFraction = (fraction: number) => NEW_MOON + fraction * SYNODIC * 86_400_000;

describe('moon phase', () => {
  it('maps the quarter cycle to the right images', () => {
    expect(moonInfo(atFraction(0))).toMatchObject({ image: 0, phase: 'Neumond', illumination: 0 });
    expect(moonInfo(atFraction(0.25)).image).toBe(7);
    expect(moonInfo(atFraction(0.5))).toMatchObject({ image: 14, phase: 'Vollmond', illumination: 100 });
    expect(moonInfo(atFraction(0.75)).image).toBe(21);
  });

  it('keeps illumination and phase labels consistent between quarters', () => {
    const waxing = moonInfo(atFraction(0.4));
    expect(waxing.phase).toBe('Zunehmender Dreiviertelmond');
    expect(waxing.illumination).toBeGreaterThan(80);
    expect(moonInfo(atFraction(0.7)).phase).toBe('Abnehmender Dreiviertelmond');
    const waning = moonInfo(atFraction(0.9));
    expect(waning.phase).toBe('Abnehmende Sichel');
    expect(waning.illumination).toBeLessThan(20);
  });

  it('uses the next full moon as a relative label', () => {
    expect(moonInfo(atFraction(0.5)).full).toBe('heute');
    expect(moonInfo(atFraction(0.4)).full).toBe('in 3 Tagen');
    expect(moonInfo(atFraction(0.5)).newMoon).toBe('in 15 Tagen');
    expect(moonInfo(atFraction(0.8)).next).toEqual({ name: 'Neumond', when: 'in 6 Tagen' });
    expect(moonInfo(atFraction(0.2)).next.name).toBe('Vollmond');
  });
});
