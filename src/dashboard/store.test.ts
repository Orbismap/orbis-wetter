import { describe, expect, it, vi } from 'vitest';
import { registerPreset } from './presets';
import { LayoutStore } from './store';
import type { LayoutState, Placement } from './types';

registerPreset({ id: 'testgrid', label: 'Test', cols: 3, rows: 3, width: 300, gap: 0, aspect: 1 });

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
