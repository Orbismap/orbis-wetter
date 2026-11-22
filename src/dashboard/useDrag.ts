import { useRef, useState } from 'preact/hooks';
import type { TargetedPointerEvent } from 'preact';
import { cancelFlip, captureFlip, playFlip } from './flip';
import { overlaps } from './geometry';
import { layoutStore } from './store';
import type { CellMetrics, Placement } from './types';

type PointerHandler = (event: TargetedPointerEvent<HTMLElement>) => void;

interface DragStart {
  px: number;
  py: number;
  /** Cell where the drag began – the fixed anchor for the pointer delta. */
  cellX: number;
  cellY: number;
  /** Current logical cell; changes as the widget swaps with others during the drag. */
  x: number;
  y: number;
  element: HTMLElement;
}

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));

/**
 * Pointer-driven snapping with live displacement: as soon as the dragged widget reaches an occupied
 * cell, the occupant is swapped away and its FLIP animation starts – still during the drag.
 */
export function useDrag(placement: Placement, metrics: CellMetrics, enabled: boolean) {
  const start = useRef<DragStart | null>(null);
  const [dragging, setDragging] = useState(false);

  const update = (event: TargetedPointerEvent<HTMLElement>) => {
    const origin = start.current;
    if (!origin) return;

    // Top-left of the widget relative to the grid canvas, anchored at the drag start.
    const visualX = origin.cellX * metrics.stepX + (event.clientX - origin.px);
    const visualY = origin.cellY * metrics.stepY + (event.clientY - origin.py);
    const targetX = clamp(Math.round(visualX / metrics.stepX), metrics.cols - placement.w);
    const targetY = clamp(Math.round(visualY / metrics.stepY), metrics.rows - placement.h);

    if (targetX !== origin.x || targetY !== origin.y) {
      const occupant = layoutStore.getState().placements.find((other) =>
        other.id !== placement.id
        && overlaps({ x: targetX, y: targetY, w: placement.w, h: placement.h }, other));

      const applied = occupant
        ? layoutStore.swap(placement.id, occupant.id)
        : layoutStore.move(placement.id, targetX, targetY);

      if (applied) {
        origin.x = targetX;
        origin.y = targetY;
        // Keep the DOM base in sync now; Preact writes the same values on the next render.
        origin.element.style.left = `${targetX * metrics.stepX}px`;
        origin.element.style.top = `${targetY * metrics.stepY}px`;
      }
    }

    // Transform is relative to the *current* base cell, so the widget stays under the pointer
    // even after its cell changed through a live swap.
    const dx = visualX - origin.x * metrics.stepX;
    const dy = visualY - origin.y * metrics.stepY;
    origin.element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };

  const onPointerDown: PointerHandler = (event) => {
    if (!enabled || event.button !== 0) return;
    const element = event.currentTarget;
    cancelFlip(element); // a running layout animation must not override the drag transform
    start.current = {
      px: event.clientX,
      py: event.clientY,
      cellX: placement.x,
      cellY: placement.y,
      x: placement.x,
      y: placement.y,
      element,
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

    // Capture the visual position (still including the drag transform), then settle into the cell.
    captureFlip();
    origin.element.style.transform = '';
    playFlip();

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
    playFlip(); // snap back to the cell it currently occupies
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
