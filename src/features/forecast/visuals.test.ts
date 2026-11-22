import { describe, expect, it } from 'vitest';
import { tempScale } from './visuals';

describe('temperature scale', () => {
  it('adapts to warm forecasts instead of using fixed sample limits', () => {
    expect(tempScale([{ min: 22, max: 29 }, { min: 19, max: 31 }])).toEqual({ min: 15, max: 35 });
  });

  it('covers cold forecasts and keeps a usable span for flat ones', () => {
    expect(tempScale([{ min: -8, max: 2 }])).toEqual({ min: -10, max: 5 });
    expect(tempScale([{ min: 10, max: 10 }])).toEqual({ min: 5, max: 15 });
  });

  it('has a safe fallback for an empty forecast', () => {
    expect(tempScale([])).toEqual({ min: -10, max: 10 });
  });
});
