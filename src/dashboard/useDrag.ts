import { useRef, useState } from 'preact/hooks';
import type { TargetedPointerEvent } from 'preact';
import { dragPreview } from './dragPreview';
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
  /** Whether a swap preview is currently applied in the store. */
  swapApplied: boolean;
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
    const targetX = clamp(Math.round(visualX / metrics.stepX), metrics.cols - placement.w);
    const targetY = clamp(Math.round(visualY / metrics.stepY), metrics.rows - placement.h);

    // Highlight the origin cell (where a swapped group lands) and the hovered destination.
    const previewTarget = outside ? null : { x: targetX, y: targetY, w: placement.w, h: placement.h };
    const currentTarget = dragPreview.getState().target;
    if (outside ? currentTarget !== null : !currentTarget
      || currentTarget.x !== targetX || currentTarget.y !== targetY) {
      dragPreview.set({
        origin: { x: origin.cellX, y: origin.cellY, w: placement.w, h: placement.h },
        target: previewTarget,
      });
    }

    if (!outside && (targetX !== origin.appliedX || targetY !== origin.appliedY)) {
      const applied = layoutStore.hoverSwap(placement.id, targetX, targetY);
      if (!applied && origin.swapApplied) {
        // A rejected hover must also drop the previous preview – store and DOM stay in sync.
        layoutStore.restoreOrigin();
      }
      origin.swapApplied = applied;

      // The store is the single source of truth for the DOM base position.
      const current = layoutStore.getState().placements.find((p) => p.id === placement.id);
      if (current) {
        origin.appliedX = current.x;
        origin.appliedY = current.y;
        origin.element.style.left = `${current.x * metrics.stepX}px`;
        origin.element.style.top = `${current.y * metrics.stepY}px`;
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
    const startCell = { x: placement.x, y: placement.y, w: placement.w, h: placement.h };
    dragPreview.set({ origin: startCell, target: startCell });
    start.current = {
      px: event.clientX,
      py: event.clientY,
      cellX: placement.x,
      cellY: placement.y,
      appliedX: placement.x,
      appliedY: placement.y,
      element,
      swapApplied: false,
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
    dragPreview.clear();

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
    dragPreview.clear();

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
