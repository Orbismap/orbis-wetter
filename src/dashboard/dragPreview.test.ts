import { describe, expect, it, vi } from 'vitest';
import { dragPreview } from './dragPreview';

describe('dragPreview', () => {
  it('tracks the origin/target cells during a drag and clears them afterwards', () => {
    const listener = vi.fn();
    const unsubscribe = dragPreview.subscribe(listener);
    const cell = { x: 2, y: 1, w: 1, h: 2 };

    dragPreview.set({ origin: cell, target: cell });
    expect(dragPreview.getState()).toEqual({ origin: cell, target: cell });

    dragPreview.clear();
    expect(dragPreview.getState()).toEqual({ origin: null, target: null });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
