import { describe, expect, it } from 'vitest';
import { aqiLabel, describe as describeCode, pollenLabel, uvLabel, weatherIcon } from './weather';

describe('WMO codes', () => {
  it('describes known and unknown codes in German', () => {
    expect(describeCode(0)).toBe('Klar');
    expect(describeCode(63)).toBe('Regen');
    expect(describeCode(95)).toBe('Gewitter');
    expect(describeCode(null)).toBe('Unbekannt');
    expect(describeCode(1234)).toBe('Unbekannt');
  });

  it('renders an SVG icon, day and night aware', () => {
    const day = weatherIcon(0, true, 64);
    const night = weatherIcon(0, false, 64);
    expect(day).toContain('<svg');
    expect(day).toContain('width="64"');
    expect(day).toContain('#ffc533');
    expect(night).toContain('#d9def5');
    expect(weatherIcon(95)).toContain('#ffd23f'); // lightning bolt
  });
});

describe('index labels', () => {
  it('labels the European air quality index', () => {
    expect(aqiLabel(10).label).toBe('Gut');
    expect(aqiLabel(70).label).toBe('Schlecht');
    expect(aqiLabel(null).label).toBe('–');
  });

  it('labels UV and pollen', () => {
    expect(uvLabel(2).label).toBe('Niedrig');
    expect(uvLabel(11).label).toBe('Extrem');
    expect(pollenLabel(4)).toBe('gering');
    expect(pollenLabel(100)).toBe('sehr hoch');
  });
});
