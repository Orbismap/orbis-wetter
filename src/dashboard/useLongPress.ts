import { useRef } from 'preact/hooks';
import type { TargetedPointerEvent } from 'preact';

const DELAY = 500;
const TOLERANCE = 8;

/**
 * Long press like on a phone home screen. Moving too far (a scroll or a map pan) or lifting the pointer
 * early cancels it. After it fired, the click that follows the release is swallowed.
 */
export function useLongPress(onLongPress: () => void, enabled: boolean) {
  const timer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const swallow = useRef(false);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  if (!enabled) return {};

  return {
    onPointerDown: (event: TargetedPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      swallow.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      cancel();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        swallow.current = true;
        navigator.vibrate?.(12);
        onLongPress();
        // The release belongs to the long press, not to a button inside the card.
        window.setTimeout(() => { swallow.current = false; }, 600);
      }, DELAY);
    },
    onPointerMove: (event: TargetedPointerEvent<HTMLElement>) => {
      if (timer.current === null) return;
      if (Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > TOLERANCE) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture: (event: Event) => {
      if (!swallow.current) return;
      swallow.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    // Touch long presses would otherwise open the context menu / text selection.
    onContextMenu: (event: Event) => { if (timer.current !== null || swallow.current) event.preventDefault(); },
  };
}
