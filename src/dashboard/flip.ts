/**
 * FLIP layout animation (First, Last, Invert, Play).
 *
 * Positions are measured before a layout change (`capture`) and again after the DOM update (`play`).
 * Every moved widget is inverted with a transform and animated back to zero via the Web Animations API,
 * so the browser only composites transforms – no layout or paint per frame.
 */

const ANIMATION_ID = 'wx-flip';
const DURATION = 260;
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const FRAME_SELECTOR = '[data-placement-id]';

type Rects = Map<string, DOMRect>;

let previous: Rects = new Map();
let previousWidth = 0;

const hostElement = () => document.querySelector<HTMLElement>('.dashboard');

function measure(host: HTMLElement): Rects {
  const rects: Rects = new Map();
  const origin = host.getBoundingClientRect();
  host.querySelectorAll<HTMLElement>(FRAME_SELECTOR).forEach((element) => {
    const id = element.dataset.placementId;
    if (!id) return;
    const r = element.getBoundingClientRect();
    // Relative to the canvas: scrolling or re-centering on window resize is not a layout change.
    rects.set(id, new DOMRect(r.left - origin.left, r.top - origin.top, r.width, r.height));
  });
  return rects;
}

/** Cancel a running layout animation – needed before a new drag takes over the transform. */
export function cancelFlip(element: Element): void {
  element.getAnimations().forEach((animation) => {
    if (animation.id === ANIMATION_ID) animation.cancel();
  });
}

/** Snapshot the current visual positions (includes an in-flight drag transform). */
export function captureFlip(): void {
  const host = hostElement();
  if (host) previous = measure(host);
}

/** Called after a layout change has been rendered. Animates every widget from its old position. */
export function playFlip(): void {
  const host = hostElement();
  if (!host) return;
  const first = previous;
  const last = measure(host);
  previous = last;
  // The canvas itself was resized (phone grid follows the window): re-snap instead of animating every widget.
  const width = host.offsetWidth;
  const resized = previousWidth !== 0 && width !== previousWidth;
  previousWidth = width;
  if (resized) return;

  if (first.size === 0 || typeof Element.prototype.animate !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  host.querySelectorAll<HTMLElement>(FRAME_SELECTOR).forEach((element) => {
    // The dragged widget's transform is driven by the pointer – never animate it here.
    if (element.style.transform) return;
    const id = element.dataset.placementId;
    const before = id ? first.get(id) : undefined;
    const after = id ? last.get(id) : undefined;
    if (!before || !after) return;

    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    cancelFlip(element);
    const animation = element.animate(
      [
        { transform: `translate3d(${dx}px, ${dy}px, 0)` },
        { transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: DURATION, easing: EASING },
    );
    animation.id = ANIMATION_ID;
  });
}
