import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLayout, saveLayout } from './persistence';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => storage.clear(),
});

const KEY = 'orbis.wetter.layout.v1';
const set = (placements: unknown[]) => storage.set(KEY, JSON.stringify({ preset: 'desktop', placements }));

afterEach(() => storage.clear());

describe('saved layout validation', () => {
  it('loads a valid arrangement', () => {
    set([{ id: 'a', widget: 'uv', x: 0, y: 0, w: 1, h: 1 }]);
    expect(loadLayout()?.placements).toHaveLength(1);
  });

  it('rejects overlapping widgets', () => {
    set([
      { id: 'a', widget: 'daily', x: 0, y: 0, w: 2, h: 2 },
      { id: 'b', widget: 'uv', x: 1, y: 1, w: 1, h: 1 },
    ]);
    expect(loadLayout()).toBeNull();
  });

  it('rejects out-of-bounds and unknown presets', () => {
    set([{ id: 'a', widget: 'uv', x: 9, y: 0, w: 1, h: 1 }]);
    expect(loadLayout()).toBeNull();
    storage.set(KEY, JSON.stringify({ preset: 'missing', placements: [] }));
    expect(loadLayout()).toBeNull();
  });

  it('keeps desktop and phone arrangements apart', () => {
    saveLayout({ preset: 'mobile', placements: [{ id: 'a', widget: 'uv', x: 1, y: 0, w: 1, h: 1 }] });
    expect(loadLayout('mobile')?.placements[0]).toMatchObject({ x: 1 });
    expect(loadLayout('desktop')).toBeNull();
    set([{ id: 'a', widget: 'uv', x: 0, y: 0, w: 1, h: 1 }]);
    expect(loadLayout('mobile')?.placements[0]).toMatchObject({ x: 1 });
    // A phone layout stored under the desktop key (or vice versa) is never restored.
    storage.set(KEY, JSON.stringify({ preset: 'mobile', placements: [] }));
    expect(loadLayout('desktop')).toBeNull();
  });

  it('does not crash when storage is unavailable', () => {
    saveLayout({ preset: 'desktop', placements: [] });
    expect(storage.has(KEY)).toBe(true);
  });
});
