import { useRef, useState } from 'preact/hooks';
import type { TargetedPointerEvent } from 'preact';
import { cancelFlip, captureFlip } from './flip';
import { overlaps } from './geometry';
import { layoutStore } from './store';
import type { CellMetrics, Placement } from './types';

type PointerHandler = (event: TargetedPointerEvent<HTMLElement>) => void;

interface DragStart {
  px: number;
  py: number;
  x: number;
  y: number;
  element: HTMLElement;
}

/** Pointer-driven snapping to grid cells. Resizing is deliberately not part of this hook yet. */
export function useDrag(placement: Placement, metrics: CellMetrics, enabled: boolean) {
  const start = useRef<DragStart | null>(null);
  const [dragging, setDragging] = useState(false);

  const targetCell = (event: TargetedPointerEvent<HTMLElement>) => {
    const origin = start.current!;
    return {
      x: origin.x + Math.round((event.clientX - origin.px) / metrics.stepX),
      y: origin.y + Math.round((event.clientY - origin.py) / metrics.stepY),
    };
  };

  const onPointerDown: PointerHandler = (event) => {
    if (!enabled || event.button !== 0) return;
    const element = event.currentTarget;
    cancelFlip(element); // a running layout animation must not override the drag transform
    start.current = { px: event.clientX, py: event.clientY, x: placement.x, y: placement.y, element };
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
    setDragging(true);
  };

  const onPointerMove: PointerHandler = (event) => {
    const origin = start.current;
    if (!origin) return;
    // Write straight to the DOM: no VDOM commit, no layout change, just one composited transform.
    const dx = event.clientX - origin.px;
    const dy = event.clientY - origin.py;
    origin.element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };

  const onPointerUp: PointerHandler = (event) => {
    const origin = start.current;
    if (!origin) return;
    const cell = targetCell(event);

    // Capture before clearing the transform: FLIP then animates from the widget's current
    // position under the pointer to its final grid cell. All other moved widgets animate too.
    captureFlip();
    origin.element.style.transform = '';

    if (!layoutStore.move(placement.id, cell.x, cell.y)) {
      const occupant = layoutStore.getState().placements.find((other) =>
        other.id !== placement.id
        && overlaps({ ...cell, w: placement.w, h: placement.h }, other));
      if (occupant) layoutStore.swap(placement.id, occupant.id);
    }

    start.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onPointerCancel: PointerHandler = (event) => {
    const origin = start.current;
    if (!origin) return;
    origin.element.style.transform = '';
    start.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const dragProps = enabled
    ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
    : {};

  return { dragging, dragProps };
}
