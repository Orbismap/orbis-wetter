import { describe, expect, it } from 'vitest';
import { defaultLayout } from './defaultLayout';
import {
  cellMetrics, clampToGrid, collisions, fits, firstFreeSlot, overlaps, placementRect, sizeLabel,
} from './geometry';
import { getPreset } from './presets';

const desktop = getPreset('desktop');

describe('cellMetrics', () => {
  it('fills the fixed canvas width and derives square cells', () => {
    const m = cellMetrics(desktop);
    expect(m.cellW).toBeCloseTo(890 / 6);
    expect(m.cellH).toBeCloseTo(m.cellW);
    expect(m.stepX).toBeCloseTo(m.cellW + desktop.gap);
    expect(m.width).toBeCloseTo(950);
    expect(m.height).toBeCloseTo(5 * (890 / 6) + 4 * desktop.gap);
  });
});

describe('placementRect', () => {
  it('converts cells to pixel offsets', () => {
    const m = cellMetrics(desktop);
    expect(placementRect({ x: 1, y: 1, w: 2, h: 2 }, m)).toEqual({
      left: m.stepX,
      top: m.stepY,
      width: 2 * m.stepX - m.gap,
      height: 2 * m.stepY - m.gap,
    });
  });
});

describe('fits', () => {
  it('accepts in-bounds rectangles and rejects out-of-bounds ones', () => {
    expect(fits(desktop, { x: 5, y: 4, w: 1, h: 1 })).toBe(true);
    expect(fits(desktop, { x: 5, y: 4, w: 2, h: 1 })).toBe(false);
    expect(fits(desktop, { x: -1, y: 0, w: 1, h: 1 })).toBe(false);
    expect(fits(desktop, { x: 0, y: 0, w: 0, h: 1 })).toBe(false);
  });
});

describe('overlaps / collisions', () => {
  it('treats touching edges as non-overlapping', () => {
    expect(overlaps({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 2, h: 2 }, { x: 2, y: 0, w: 2, h: 2 })).toBe(false);
  });

  it('the default desktop layout has no collisions', () => {
    expect(collisions(defaultLayout.placements)).toEqual([]);
  });
});

describe('firstFreeSlot', () => {
  it('returns the first available cell', () => {
    expect(firstFreeSlot(desktop, [], 1, 1)).toEqual({ x: 0, y: 0 });
    expect(firstFreeSlot(desktop, [{ x: 0, y: 0, w: 6, h: 2 }], 1, 1)).toEqual({ x: 0, y: 2 });
  });

  it('returns null when nothing fits', () => {
    expect(firstFreeSlot(desktop, [{ x: 0, y: 0, w: 1, h: 1 }], 6, 5)).toBeNull();
  });
});

describe('clampToGrid', () => {
  it('keeps a rectangle inside the grid', () => {
    expect(clampToGrid(desktop, { x: -2, y: 9, w: 9, h: 9 })).toEqual({ x: 0, y: 0, w: 6, h: 5 });
    expect(clampToGrid(desktop, { x: 5, y: 4, w: 3, h: 3 })).toEqual({ x: 3, y: 2, w: 3, h: 3 });
  });
});

it('formats a size label', () => {
  expect(sizeLabel(3, 2)).toBe('3×2');
});
