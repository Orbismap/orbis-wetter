import { useSyncExternalStore } from 'preact/compat';
import { defaultLayout } from './defaultLayout';
import { clampToGrid, collisions, firstFreeSlot, fits, overlaps, packIntoCells, rectCells } from './geometry';
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
  /** Position of every widget when the current drag gesture started. */
  private gestureOrigin: Map<string, Placement> | null = null;

  constructor(initial: LayoutState) {
    this.state = loadLayout() ?? initial;
  }

  getState = (): LayoutState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private commit(next: LayoutState): void {
    // Hard invariant: no arrangement with overlaps or out-of-bounds widgets can ever be stored.
    const preset = getPreset(next.preset);
    if (next.placements.some((p) => !fits(preset, p)) || collisions(next.placements).length > 0) return;
    this.state = next;
    saveLayout(next);
    this.listeners.forEach((listener) => listener());
  }

  /** Remember where every widget was at the start of a drag gesture. */
  beginGesture = (): void => {
    this.gestureOrigin = new Map(this.state.placements.map((p) => [p.id, { ...p }]));
  };

  /** Put every widget back to its gesture origin – used when a drag ends outside the grid. */
  restoreOrigin = (): void => {
    if (!this.gestureOrigin) return;
    const origin = this.gestureOrigin;
    this.commit({
      ...this.state,
      placements: this.state.placements.map((p) => {
        const original = origin.get(p.id);
        return original ? { ...p, x: original.x, y: original.y, w: original.w, h: original.h } : p;
      }),
    });
  };

  endGesture = (): void => {
    this.gestureOrigin = null;
  };

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
    const preset = getPreset(this.state.preset);
    const next = this.state.placements.map((p) => {
      if (p.id === firstId) return { ...p, x: second.x, y: second.y };
      if (p.id === secondId) return { ...p, x: first.x, y: first.y };
      return p;
    });
    // Bounds alone are not enough: the exchanged cells must not collide with a third widget.
    if (next.some((p) => !fits(preset, p))) return false;
    if (collisions(next).length > 0) return false;
    this.commit({ ...this.state, placements: next });
    return true;
  };

  /**
   * Dynamic fallback when the target group cannot fill the dragged widget's old footprint: every
   * widget in the corridor between origin and target moves one widget-size step against the drag
   * direction. Works identically for horizontal and vertical drags.
   */
  private shiftCorridor(
    placements: Placement[], dragged: Placement, x: number, y: number,
  ): Placement[] | null {
    const dx = x - dragged.x;
    const dy = y - dragged.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const size = horizontal ? dragged.w : dragged.h;
    const step = horizontal ? Math.sign(dx) : Math.sign(dy);
    if (step === 0) return null;
    const shift = -step * size;
    const originStart = horizontal ? dragged.x : dragged.y;
    const targetStart = horizontal ? x : y;
    const lo = Math.min(originStart, targetStart);
    const hi = Math.max(originStart + size, targetStart + size) - 1;

    return placements.map((p) => {
      if (p.id === dragged.id) return { ...p, x, y };
      const crossOverlap = horizontal
        ? p.y < dragged.y + dragged.h && p.y + p.h > dragged.y
        : p.x < dragged.x + dragged.w && p.x + p.w > dragged.x;
      const start = horizontal ? p.x : p.y;
      const span = horizontal ? p.w : p.h;
      if (!crossOverlap || start + span - 1 < lo || start > hi) return p;
      return horizontal ? { ...p, x: p.x + shift } : { ...p, y: p.y + shift };
    });
  }

  /**
   * Preview the dragged widget at a target cell, always derived from the gesture origin. A group that
   * exactly fills the old footprint is packed into it; otherwise the corridor is shifted dynamically.
   * Hovering a new target reverts the previous preview, so only one swap is active at a time.
   */
  hoverSwap = (draggedId: string, x: number, y: number): boolean => {
    const origin = this.gestureOrigin;
    if (!origin) return false;
    const dragged = origin.get(draggedId);
    if (!dragged) return false;
    const preset = getPreset(this.state.preset);
    const target = { x, y, w: dragged.w, h: dragged.h };
    if (!fits(preset, target)) return false;

    const placements = [...origin.values()];
    const group = placements.filter((p) => p.id !== draggedId && overlaps(target, p));
    let next: Placement[] | null;
    const spots = group.length > 0 ? packIntoCells(group, rectCells(dragged)) : null;
    if (spots) {
      next = placements.map((p) => {
        if (p.id === draggedId) return { ...p, x, y };
        const spot = spots.get(p.id);
        return spot ? { ...p, ...spot } : p;
      });
    } else if (group.length === 0) {
      next = placements.map((p) => (p.id === draggedId ? { ...p, x, y } : p));
    } else {
      next = this.shiftCorridor(placements, dragged, x, y);
    }
    if (!next) return false;
    if (next.some((p) => !fits(preset, p)) || collisions(next).length > 0) return false;
    this.commit({ ...this.state, placements: next });
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
