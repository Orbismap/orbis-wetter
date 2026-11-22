import { useSyncExternalStore } from 'preact/compat';
import { defaultLayout } from './defaultLayout';
import { clampToGrid, firstFreeSlot, fits, overlaps } from './geometry';
import { loadLayout, saveLayout } from './persistence';
import { getPreset } from './presets';
import type { LayoutState, Placement, Rect } from './types';

type Listener = () => void;

let instanceCounter = 0;
const nextId = (widget: string) => `${widget}-${Date.now().toString(36)}-${instanceCounter++}`;

/**
 * Holds the arrangement of widgets. Every mutation validates against the active preset, so the later
 * edit mode only has to wire up drag/resize gestures to `move` and `resize`.
 */
export class LayoutStore {
  private state: LayoutState;
  private listeners = new Set<Listener>();

  constructor(initial: LayoutState) {
    this.state = loadLayout() ?? initial;
  }

  getState = (): LayoutState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private commit(next: LayoutState): void {
    this.state = next;
    saveLayout(next);
    this.listeners.forEach((listener) => listener());
  }

  setLayout = (next: LayoutState): void => {
    this.commit(next);
  };

  setPreset = (id: string): void => {
    this.commit({ ...this.state, preset: id });
  };

  /** Move a widget. Returns false if the target is out of bounds or overlaps another widget. */
  move = (id: string, x: number, y: number): boolean => {
    const preset = getPreset(this.state.preset);
    const placement = this.state.placements.find((p) => p.id === id);
    if (!placement) return false;
    const target: Placement = { ...placement, x, y };
    if (!fits(preset, target)) return false;
    if (this.state.placements.some((other) => other.id !== id && overlaps(target, other))) return false;
    this.commit({ ...this.state, placements: this.state.placements.map((p) => (p.id === id ? target : p)) });
    return true;
  };

  /** Exchange the positions of two widgets (used when dragging onto an occupied cell). */
  swap = (firstId: string, secondId: string): boolean => {
    if (firstId === secondId) return false;
    const first = this.state.placements.find((p) => p.id === firstId);
    const second = this.state.placements.find((p) => p.id === secondId);
    if (!first || !second) return false;
    this.commit({
      ...this.state,
      placements: this.state.placements.map((p) => {
        if (p.id === firstId) return { ...p, x: second.x, y: second.y };
        if (p.id === secondId) return { ...p, x: first.x, y: first.y };
        return p;
      }),
    });
    return true;
  };

  /** Resize a widget (clamped to the grid). Returns false if the result would overlap another widget. */
  resize = (id: string, w: number, h: number): boolean => {
    const preset = getPreset(this.state.preset);
    const placement = this.state.placements.find((p) => p.id === id);
    if (!placement) return false;
    const size = clampToGrid(preset, { ...placement, w, h });
    const target: Placement = { ...placement, ...size };
    if (this.state.placements.some((other) => other.id !== id && overlaps(target, other))) return false;
    this.commit({ ...this.state, placements: this.state.placements.map((p) => (p.id === id ? target : p)) });
    return true;
  };

  /** Add a widget. If no position is given (or it is taken), the first free slot is used. */
  add = (widget: string, w: number, h: number, at?: { x: number; y: number }): Placement | null => {
    const preset = getPreset(this.state.preset);
    const size = clampToGrid(preset, { x: 0, y: 0, w, h });
    const candidate: Rect = { ...size, ...at };
    const spot = at && fits(preset, candidate) && !this.state.placements.some((p) => overlaps(candidate, p))
      ? { x: candidate.x, y: candidate.y }
      : firstFreeSlot(preset, this.state.placements, size.w, size.h);
    if (!spot) return null;
    const placement: Placement = { id: nextId(widget), widget, ...spot, w: size.w, h: size.h };
    this.commit({ ...this.state, placements: [...this.state.placements, placement] });
    return placement;
  };

  remove = (id: string): void => {
    this.commit({ ...this.state, placements: this.state.placements.filter((p) => p.id !== id) });
  };
}

export const layoutStore = new LayoutStore(defaultLayout);

/** Subscribe a component to the arrangement. */
export function useLayout(): LayoutState {
  return useSyncExternalStore(layoutStore.subscribe, layoutStore.getState);
}
