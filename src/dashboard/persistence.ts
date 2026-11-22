import type { LayoutState, Placement } from './types';

const STORAGE_KEY = 'orbis.wetter.layout.v1';

const isPlacement = (value: unknown): value is Placement => {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p.id === 'string'
    && typeof p.widget === 'string'
    && [p.x, p.y, p.w, p.h].every((n) => typeof n === 'number' && Number.isFinite(n));
};

/** Load a saved arrangement. Invalid or missing data falls back to the default layout. */
export function loadLayout(): LayoutState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const state = parsed as Record<string, unknown>;
    if (typeof state.preset !== 'string' || !Array.isArray(state.placements) || !state.placements.every(isPlacement)) {
      return null;
    }
    return { preset: state.preset, placements: state.placements };
  } catch {
    return null;
  }
}

export function saveLayout(state: LayoutState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be disabled or full – editing still works for this session.
  }
}
