import { describe, expect, it, vi } from 'vitest';
import { registerPreset } from './presets';
import { LayoutStore } from './store';
import type { LayoutState, Placement } from './types';

registerPreset({ id: 'testgrid', label: 'Test', cols: 3, rows: 3, width: 300, gap: 0, aspect: 1 });
registerPreset({ id: 'testgrid4', label: 'Test 4', cols: 4, rows: 3, width: 400, gap: 0, aspect: 1 });
registerPreset({ id: 'testgrid44', label: 'Test 4x4', cols: 4, rows: 4, width: 400, gap: 0, aspect: 1 });

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

  it('restores every widget to its gesture origin when a drag is cancelled', () => {
    const s = store([placement('a', 0, 0), placement('b', 1, 0)]);
    s.beginGesture();
    expect(s.move('a', 0, 1)).toBe(true);
    expect(s.getState().placements[0]).toMatchObject({ x: 0, y: 1 });
    s.restoreOrigin();
    expect(s.getState().placements).toEqual([placement('a', 0, 0), placement('b', 1, 0)]);
    s.endGesture();
    s.move('a', 0, 1);
    s.restoreOrigin();
    expect(s.getState().placements[0]).toMatchObject({ x: 0, y: 1 }); // no gesture snapshot left
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

  it('previews only a direct swap and sends the previously hovered widget home', () => {
    const s = new LayoutStore({
      preset: 'testgrid4',
      placements: [placement('drag', 0, 0), placement('a', 1, 0), placement('b', 2, 0)],
    });
    const cells = () => Object.fromEntries(s.getState().placements.map((p) => [p.id, [p.x, p.y]]));
    s.beginGesture();

    expect(s.hoverSwap('drag', 1, 0)).toBe(true);
    expect(cells()).toEqual({ drag: [1, 0], a: [0, 0], b: [2, 0] });

    // Hovering b reverts the swap with a – only one widget is ever displaced.
    expect(s.hoverSwap('drag', 2, 0)).toBe(true);
    expect(cells()).toEqual({ drag: [2, 0], a: [1, 0], b: [0, 0] });

    s.restoreOrigin();
    expect(cells()).toEqual({ drag: [0, 0], a: [1, 0], b: [2, 0] });
  });

  it('swaps a tall widget with two stacked 1x1 widgets', () => {
    const s = new LayoutStore({
      preset: 'testgrid4',
      placements: [placement('tall', 0, 0, 1, 2), placement('a', 1, 0), placement('b', 1, 1)],
    });
    s.beginGesture();
    expect(s.hoverSwap('tall', 1, 0)).toBe(true);
    const cells = Object.fromEntries(s.getState().placements.map((p) => [p.id, [p.x, p.y]]));
    expect(cells).toEqual({ tall: [1, 0], a: [0, 0], b: [0, 1] });
  });

  it('swaps a 2x3 widget with a group of five smaller widgets', () => {
    const s = new LayoutStore({
      preset: 'testgrid44',
      placements: [
        placement('big', 0, 0, 2, 3),
        placement('wide', 2, 0, 2, 1),
        placement('a', 2, 1), placement('b', 3, 1),
        placement('c', 2, 2), placement('d', 3, 2),
      ],
    });
    s.beginGesture();
    expect(s.hoverSwap('big', 2, 0)).toBe(true);
    expect(s.getState().placements.find((p) => p.id === 'big')).toMatchObject({ x: 2, y: 0 });
    const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const all = s.getState().placements;
    expect(all.every((p, i) => all.slice(i + 1).every((q) => !overlap(p, q)))).toBe(true);
  });

  it('does not swap when the group cannot fill the old footprint', () => {
    const s = new LayoutStore({
      preset: 'testgrid4',
      placements: [placement('wide', 0, 0, 2, 1), placement('big', 1, 1, 2, 2)],
    });
    s.beginGesture();
    expect(s.hoverSwap('wide', 1, 1)).toBe(false);
    expect(s.getState().placements[0]).toMatchObject({ x: 0, y: 0 });
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
