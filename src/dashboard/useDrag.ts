import { useRef, useState } from 'preact/hooks';
import type { TargetedPointerEvent } from 'preact';
import { cancelFlip, captureFlip, playFlip } from './flip';
import { layoutStore } from './store';
import type { CellMetrics, Placement } from './types';

type PointerHandler = (event: TargetedPointerEvent<HTMLElement>) => void;

interface DragStart {
  px: number;
  py: number;
  /** Cell where the drag began – the fixed anchor for the pointer delta. */
  cellX: number;
  cellY: number;
  /** Cell currently applied as the hover preview (equals the origin cell initially). */
  appliedX: number;
  appliedY: number;
  element: HTMLElement;
  /** Canvas bounds at drag start – leaving them cancels the whole gesture. */
  bounds: DOMRect | null;
  outside: boolean;
}

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));

/**
 * Pointer-driven snapping with live, direct swaps. Every preview is derived from the gesture origin,
 * so only the widget under the current cell is displaced – the previously hovered one goes home.
 */
export function useDrag(placement: Placement, metrics: CellMetrics, enabled: boolean) {
  const start = useRef<DragStart | null>(null);
  const [dragging, setDragging] = useState(false);

  const update = (event: TargetedPointerEvent<HTMLElement>) => {
    const origin = start.current;
    if (!origin) return;

    const bounds = origin.bounds;
    const outside = !!bounds && (
      event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom
    );
    origin.outside = outside;
    origin.element.classList.toggle('outside', outside);

    // Top-left of the widget relative to the grid canvas, anchored at the drag start.
    const visualX = origin.cellX * metrics.stepX + (event.clientX - origin.px);
    const visualY = origin.cellY * metrics.stepY + (event.clientY - origin.py);

    if (!outside) {
      const targetX = clamp(Math.round(visualX / metrics.stepX), metrics.cols - placement.w);
      const targetY = clamp(Math.round(visualY / metrics.stepY), metrics.rows - placement.h);
      if (targetX !== origin.appliedX || targetY !== origin.appliedY) {
        const applied = layoutStore.hoverSwap(placement.id, targetX, targetY);
        origin.appliedX = applied ? targetX : origin.cellX;
        origin.appliedY = applied ? targetY : origin.cellY;
        origin.element.style.left = `${origin.appliedX * metrics.stepX}px`;
        origin.element.style.top = `${origin.appliedY * metrics.stepY}px`;
      }
    }

    // Transform is relative to the currently applied base cell.
    const dx = visualX - origin.appliedX * metrics.stepX;
    const dy = visualY - origin.appliedY * metrics.stepY;
    origin.element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };

  const onPointerDown: PointerHandler = (event) => {
    if (!enabled || event.button !== 0) return;
    const element = event.currentTarget;
    cancelFlip(element); // a running layout animation must not override the drag transform
    layoutStore.beginGesture();
    start.current = {
      px: event.clientX,
      py: event.clientY,
      cellX: placement.x,
      cellY: placement.y,
      appliedX: placement.x,
      appliedY: placement.y,
      element,
      bounds: document.querySelector<HTMLElement>('.dashboard')?.getBoundingClientRect() ?? null,
      outside: false,
    };
    // Pointer capture is unavailable for synthetic events and some embedded browsers.
    try { element.setPointerCapture(event.pointerId); } catch { /* optional enhancement */ }
    event.preventDefault();
    setDragging(true);
  };

  const onPointerMove: PointerHandler = (event) => update(event);

  const onPointerUp: PointerHandler = (event) => {
    const origin = start.current;
    if (!origin) return;
    update(event); // apply the final cell too

    // Capture the visual position (still including the drag transform), then settle.
    captureFlip();
    origin.element.style.transform = '';
    origin.element.classList.remove('outside');

    if (origin.outside) {
      layoutStore.restoreOrigin();
    } else {
      playFlip();
    }
    layoutStore.endGesture();

    start.current = null;
    setDragging(false);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch { /* capture was never acquired */ }
  };

  const onPointerCancel: PointerHandler = (event) => {
    const origin = start.current;
    if (!origin) return;
    captureFlip();
    origin.element.style.transform = '';
    origin.element.classList.remove('outside');
    layoutStore.restoreOrigin();
    layoutStore.endGesture();

    start.current = null;
    setDragging(false);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch { /* capture was never acquired */ }
  };

  const dragProps = enabled
    ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
    : {};

  return { dragging, dragProps };
}
