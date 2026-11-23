import { useSyncExternalStore } from 'preact/compat';

/** Below this width the phone layout (2-column grid that fills the screen) is used. */
export const MOBILE_MAX_WIDTH = 719;

/** Horizontal page padding on phones – keep in sync with `.dashboard-wrap` in dashboard.css. */
export const MOBILE_GUTTER = 12;

const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
  : null;

export const isMobileViewport = (): boolean => query?.matches ?? false;

/** Id of the grid preset that fits the current viewport. */
export const viewportPresetId = (): 'mobile' | 'desktop' => (isMobileViewport() ? 'mobile' : 'desktop');

const widthOf = (): number => (typeof window === 'undefined' ? 390 : document.documentElement.clientWidth || window.innerWidth);

/** Canvas width for the phone grid: the viewport minus the side gutters (never below one usable column pair). */
export const mobileCanvasWidth = (): number => Math.max(260, widthOf() - 2 * MOBILE_GUTTER);

let width = mobileCanvasWidth();
const listeners = new Set<() => void>();
const notify = () => {
  const next = mobileCanvasWidth();
  if (next === width) return;
  width = next;
  listeners.forEach((listener) => listener());
};
if (typeof window !== 'undefined') window.addEventListener('resize', notify);

export const subscribeViewport = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** Re-renders on viewport width changes; returns the current phone canvas width. */
export function useMobileCanvasWidth(): number {
  // Desktop canvases are fixed-width: don't re-render the dashboard on every resize event there.
  return useSyncExternalStore(subscribeViewport, () => (isMobileViewport() ? width : 0));
}

/** Calls `listener` when the viewport crosses the phone breakpoint. */
export function onBreakpointChange(listener: () => void): void {
  query?.addEventListener('change', listener);
}
