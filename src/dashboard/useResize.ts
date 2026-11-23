import { useRef, useState } from 'preact/hooks';
import type { TargetedPointerEvent } from 'preact';
import { fits } from './geometry';
import { getPreset } from './presets';
import { layoutStore } from './store';
import type { CellMetrics, Placement } from './types';

export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export const HANDLES: Handle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

interface Size { w: number; h: number }

interface ResizeStart {
  handle: Handle;
  px: number;
  py: number;
  origin: Placement;
  applied: Size;
}

/**
 * Edge and corner handles. The pointer moves the grabbed edge(s); the result snaps to the nearest size the
 * widget supports, and the opposite edge stays where it is.
 */
export function useResize(placement: Placement, metrics: CellMetrics, sizes: Size[], enabled: boolean) {
  const start = useRef<ResizeStart | null>(null);
  const [active, setActive] = useState<Handle | null>(null);

  const apply = (event: TargetedPointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s) return;
    const { handle, origin } = s;
    const dx = (event.clientX - s.px) / metrics.stepX;
    const dy = (event.clientY - s.py) / metrics.stepY;
    let left = origin.x;
    let right = origin.x + origin.w;
    let top = origin.y;
    let bottom = origin.y + origin.h;
    if (handle.includes('e')) right += dx;
    if (handle.includes('w')) left += dx;
    if (handle.includes('s')) bottom += dy;
    if (handle.includes('n')) top += dy;
    const wantW = right - left;
    const wantH = bottom - top;

    const preset = getPreset(layoutStore.getState().preset);
    let best: { x: number; y: number; w: number; h: number; cost: number } | null = null;
    for (const size of sizes) {
      // The edge opposite to the grabbed one is the anchor.
      const x = handle.includes('w') ? origin.x + origin.w - size.w : origin.x;
      const y = handle.includes('n') ? origin.y + origin.h - size.h : origin.y;
      if (!fits(preset, { x, y, w: size.w, h: size.h })) continue;
      // Axes that are not grabbed keep their size, so a side handle never changes the height.
      const cost = (handle.length === 1 && 'ns'.includes(handle) ? 100 * Math.abs(size.w - origin.w) : Math.abs(size.w - wantW))
        + (handle.length === 1 && 'ew'.includes(handle) ? 100 * Math.abs(size.h - origin.h) : Math.abs(size.h - wantH));
      if (!best || cost < best.cost) best = { x, y, w: size.w, h: size.h, cost };
    }
    if (!best || (best.w === s.applied.w && best.h === s.applied.h)) return;
    layoutStore.hoverResize(placement.id, best.x, best.y, best.w, best.h);
    const placed = layoutStore.getState().placements.find((p) => p.id === placement.id);
    s.applied = placed ? { w: placed.w, h: placed.h } : s.applied;
  };

  const finish = (event: TargetedPointerEvent<HTMLElement>) => {
    if (!start.current) return;
    start.current = null;
    layoutStore.endGesture();
    setActive(null);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* not captured */ }
  };

  const handleProps = (handle: Handle) => (!enabled ? {} : {
    onPointerDown: (event: TargetedPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation(); // the frame must not start a move
      event.preventDefault();
      layoutStore.beginGesture();
      start.current = {
        handle,
        px: event.clientX,
        py: event.clientY,
        origin: { ...placement },
        applied: { w: placement.w, h: placement.h },
      };
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
      setActive(handle);
    },
    onPointerMove: apply,
    onPointerUp: (event: TargetedPointerEvent<HTMLElement>) => { apply(event); finish(event); },
    onPointerCancel: (event: TargetedPointerEvent<HTMLElement>) => {
      if (start.current) layoutStore.restoreOrigin();
      finish(event);
    },
  });

  return { resizing: active, handleProps };
}
