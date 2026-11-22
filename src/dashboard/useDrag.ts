import { useRef, useState } from 'preact/hooks';
import type { TargetedPointerEvent } from 'preact';
import { overlaps } from './geometry';
import { layoutStore } from './store';
import type { CellMetrics, Placement } from './types';

type PointerHandler = (event: TargetedPointerEvent<HTMLElement>) => void;

interface DragStart {
  px: number;
  py: number;
  x: number;
  y: number;
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
    start.current = { px: event.clientX, py: event.clientY, x: placement.x, y: placement.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setDragging(true);
  };

  const onPointerMove: PointerHandler = (event) => {
    if (!start.current) return;
    const cell = targetCell(event);
    layoutStore.move(placement.id, cell.x, cell.y);
  };

  const onPointerUp: PointerHandler = (event) => {
    if (!start.current) return;
    const cell = targetCell(event);
    if (!layoutStore.move(placement.id, cell.x, cell.y)) {
      // The destination is taken – swap the two widgets instead of blocking the move.
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

  const dragProps = enabled
    ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
    : {};

  return { dragging, dragProps };
}
