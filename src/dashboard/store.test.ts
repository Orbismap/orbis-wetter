import { describe, expect, it, vi } from 'vitest';
import { registerPreset } from './presets';
import { LayoutStore } from './store';
import type { LayoutState, Placement } from './types';

registerPreset({ id: 'testgrid', label: 'Test', cols: 3, rows: 3, width: 300, gap: 0, aspect: 1 });
registerPreset({ id: 'testgrid4', label: 'Test 4', cols: 4, rows: 3, width: 400, gap: 0, aspect: 1 });

const placement = (id: string, x: number, y: number, w = 1, h = 1): Placement => ({ id, widget: 'w', x, y, w, h });
const state = (placements: Placement[]): LayoutState => ({ preset: 'testgrid', placements });
const store = (placements: Placement[]) => new LayoutStore(state(placements));

describe('LayoutStore', () => {
  it('moves a widget and rejects invalid targets', () => {
    const s = store([placement('a', 0, 0)]);
    expect(s.move('a', 1, 1)).toBe(true);
    expect(s.getState().placements[0]).toMatchObject({ x: 1, y: 1 });
    expect(s.move('a', 3, 0)).toBe(false);
    expect(s.move('missing', 0, 0)).toBe(false);
    expect(s.getState().placements[0]).toMatchObject({ x: 1, y: 1 });
  });

  it('rejects moves that overlap another widget', () => {
    const s = store([placement('a', 0, 0), placement('b', 1, 1)]);
    expect(s.move('a', 1, 1)).toBe(false);
    expect(s.getState().placements[0]).toMatchObject({ x: 0, y: 0 });
  });

  it('swaps two widget positions', () => {
    const s = store([placement('a', 0, 0), placement('b', 1, 1)]);
    expect(s.swap('a', 'b')).toBe(true);
    expect(s.getState().placements[0]).toMatchObject({ x: 1, y: 1 });
    expect(s.getState().placements[1]).toMatchObject({ x: 0, y: 0 });
    expect(s.swap('a', 'missing')).toBe(false);

    const invalid = store([placement('wide', 0, 0, 3, 1), placement('small', 2, 2)]);
    expect(invalid.swap('wide', 'small')).toBe(false); // the wide widget would leave the grid

    // In bounds, but the wide widget would land on top of a third widget.
    const third = new LayoutStore({
      preset: 'testgrid4',
      placements: [placement('a', 0, 0, 2, 1), placement('b', 2, 2), placement('c', 3, 2)],
    });
    expect(third.swap('a', 'b')).toBe(false);
  });

  it('swaps a wide widget with all widgets in the target region at once', () => {
    // Layout:  wide wide  /  a b
    const s = new LayoutStore({
      preset: 'testgrid4',
      placements: [placement('wide', 0, 0, 2, 1), placement('a', 0, 1), placement('b', 1, 1)],
    });
    expect(s.swapRegion('wide', 0, 1)).toBe(true);
    expect(s.getState().placements).toEqual([
      { id: 'wide', widget: 'w', x: 0, y: 1, w: 2, h: 1 },
      { id: 'a', widget: 'w', x: 0, y: 0, w: 1, h: 1 },
      { id: 'b', widget: 'w', x: 1, y: 0, w: 1, h: 1 },
    ]);
  });

  it('rotates the upstream widget along with a continuing drag', () => {
    const s = new LayoutStore({
      preset: 'testgrid4',
      placements: [
        placement('one', 0, 0, 2, 1),
        placement('two', 0, 1, 2, 1),
        placement('three', 0, 2),
        placement('four', 1, 2),
      ],
    });
    const cells = () => Object.fromEntries(
      s.getState().placements.map((p) => [p.id, [p.x, p.y]]),
    );

    expect(s.swapRegion('one', 0, 1)).toBe(true);
    expect(cells()).toEqual({ one: [0, 1], two: [0, 0], three: [0, 2], four: [1, 2] });

    // Dragging on into 3/4 pulls `two` down one step instead of leaving it stranded at the top.
    expect(s.swapRegion('one', 0, 2)).toBe(true);
    expect(cells()).toEqual({ one: [0, 2], two: [0, 1], three: [0, 0], four: [1, 0] });
  });

  it('refuses a region swap when the displaced widgets do not fit the old footprint', () => {
    const s = new LayoutStore({
      preset: 'testgrid4',
      placements: [placement('one', 0, 0), placement('big', 1, 1, 2, 2)],
    });
    expect(s.swapRegion('one', 1, 1)).toBe(false);
  });

  it('resizes a widget with clamping and collision checks', () => {
    const s = store([placement('a', 2, 2)]);
    expect(s.resize('a', 5, 5)).toBe(true);
    expect(s.getState().placements[0]).toMatchObject({ x: 0, y: 0, w: 3, h: 3 });

    const blocked = store([placement('a', 0, 0), placement('b', 1, 0)]);
    expect(blocked.resize('a', 2, 1)).toBe(false);
  });

  it('adds at a requested spot, falls back to a free slot, and removes', () => {
    const s = store([]);
    expect(s.add('w', 1, 1, { x: 2, y: 2 })).toMatchObject({ x: 2, y: 2, w: 1, h: 1 });
    expect(s.add('w', 1, 1)).toMatchObject({ x: 0, y: 0 });
    expect(s.getState().placements).toHaveLength(2);

    const full = store([placement('a', 0, 0)]);
    expect(full.add('w', 3, 3)).toBeNull();

    s.remove(s.getState().placements[0]!.id);
    expect(s.getState().placements).toHaveLength(1);
  });

  it('switches presets and layouts and notifies subscribers', () => {
    const s = store([]);
    const listener = vi.fn();
    const unsubscribe = s.subscribe(listener);
    s.setPreset('desktop');
    expect(s.getState().preset).toBe('desktop');
    s.setLayout(state([]));
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    s.setPreset('testgrid');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
