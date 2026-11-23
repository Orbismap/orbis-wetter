import { collisions, fits } from './geometry';
import { getPreset } from './presets';
import type { LayoutState, Placement } from './types';

/** Phones keep their own arrangement – the 2-column grid cannot reuse the desktop positions. */
const STORAGE_KEYS = { desktop: 'orbis.wetter.layout.v1', mobile: 'orbis.wetter.layout.mobile.v1' } as const;

export type LayoutFamily = keyof typeof STORAGE_KEYS;
export const familyOf = (presetId: string): LayoutFamily => (presetId === 'mobile' ? 'mobile' : 'desktop');

const isPlacement = (value: unknown): value is Placement => {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p.id === 'string'
    && typeof p.widget === 'string'
    && [p.x, p.y, p.w, p.h].every((n) => typeof n === 'number' && Number.isFinite(n));
};

/** Load a saved arrangement. Invalid or missing data falls back to the default layout. */
export function loadLayout(family: LayoutFamily = 'desktop'): LayoutState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[family]);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const state = parsed as Record<string, unknown>;
    if (typeof state.preset !== 'string' || !Array.isArray(state.placements) || !state.placements.every(isPlacement)) {
      return null;
    }
    if (familyOf(state.preset) !== family) return null;
    // Never restore an invalid (overlapping or out-of-bounds) arrangement from an older session.
    let preset;
    try { preset = getPreset(state.preset); } catch { return null; }
    const placements = state.placements;
    if (placements.some((p) => !fits(preset, p))) return null;
    if (collisions(placements).length > 0) return null;
    return { preset: state.preset, placements };
  } catch {
    return null;
  }
}

export function saveLayout(state: LayoutState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS[familyOf(state.preset)], JSON.stringify(state));
  } catch {
    // Storage can be disabled or full – editing still works for this session.
  }
}
