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
/** True between a capture and the render that follows it – only then is there something to animate. */
let pending = false;

const hostElement = () => document.querySelector<HTMLElement>('.dashboard');

function measure(host: HTMLElement): Rects {
  const rects: Rects = new Map();
  const origin = host.getBoundingClientRect();
  host.querySelectorAll<HTMLElement>(FRAME_SELECTOR).forEach((element) => {
    const id = element.dataset.placementId;
    if (!id) return;
    const r = element.getBoundingClientRect();
    // Relative to the canvas: scrolling or re-centering on window resize is not a layout change.
    // The centre is used with the untransformed size, so the edit-mode wiggle (a rotation) never counts as movement.
    const w = element.offsetWidth;
    const h = element.offsetHeight;
    rects.set(id, new DOMRect(r.left + r.width / 2 - w / 2 - origin.left, r.top + r.height / 2 - h / 2 - origin.top, w, h));
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
  if (typeof document === 'undefined') return;
  const host = hostElement();
  if (!host) return;
  previous = measure(host);
  pending = true;
}

/**
 * Called after a layout change has been rendered. Animates every widget from where it visually was at
 * the last `captureFlip`. Running animations are cancelled first, so the new position is measured
 * without a leftover transform – that is what made widgets fly off-screen during fast drags.
 */
export function playFlip(): void {
  const host = hostElement();
  if (!host) return;
  const width = host.offsetWidth;
  const resized = previousWidth !== 0 && width !== previousWidth;
  previousWidth = width;
  if (!pending) return;
  pending = false;
  const first = previous;
  // The canvas itself was resized (phone grid follows the window): re-snap instead of animating every widget.
  if (resized || first.size === 0 || typeof Element.prototype.animate !== 'function') return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const frames = Array.from(host.querySelectorAll<HTMLElement>(FRAME_SELECTOR));
  frames.forEach((element) => { if (!element.style.transform) cancelFlip(element); });
  const last = measure(host);
  previous = last;
  if (reduced) return;

  frames.forEach((element) => {
    // The dragged widget's transform is driven by the pointer – never animate it here.
    if (element.style.transform) return;
    const id = element.dataset.placementId;
    const before = id ? first.get(id) : undefined;
    const after = id ? last.get(id) : undefined;
    if (!before || !after) return;

    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

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
