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
   * Move a widget into a target cell, swapping with **all** widgets in its way. The displaced widgets
   * are packed into the dragged widget's old footprint. This makes e.g. a 2×1 widget trade places
   * with two 1×1 widgets at once.
   */
  swapRegion = (draggedId: string, x: number, y: number): boolean => {
    const preset = getPreset(this.state.preset);
    const dragged = this.state.placements.find((p) => p.id === draggedId);
    if (!dragged) return false;
    const target = { x, y, w: dragged.w, h: dragged.h };
    if (!fits(preset, target)) return false;

    const occupants = this.state.placements.filter((p) => p.id !== draggedId && overlaps(target, p));
    if (occupants.length === 0) return this.move(draggedId, x, y);

    // Rotation: widgets one step behind the dragged widget were displaced by an earlier move in
    // this gesture. Let them follow into its old cells and move the target occupants into theirs.
    const dx = x - dragged.x;
    const dy = y - dragged.y;
    const ux = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0;
    const uy = ux === 0 ? Math.sign(dy) : 0;
    if (ux !== 0 || uy !== 0) {
      const upstream = { x: dragged.x - ux, y: dragged.y - uy, w: dragged.w, h: dragged.h };
      if (fits(preset, upstream)) {
        const predecessors = this.state.placements.filter((p) => p.id !== draggedId && overlaps(p, upstream));
        const shared = predecessors.some((p) => occupants.some((o) => o.id === p.id));
        if (predecessors.length && !shared) {
          const predecessorSpots = packIntoCells(predecessors, rectCells(dragged), false);
          const occupantSpots = packIntoCells(occupants, rectCells(upstream), false);
          if (predecessorSpots && occupantSpots) {
            const spots = new Map([...predecessorSpots, ...occupantSpots]);
            const next = this.state.placements.map((p) => {
              if (p.id === draggedId) return { ...p, x, y };
              const spot = spots.get(p.id);
              return spot ? { ...p, ...spot } : p;
            });
            if (next.every((p) => fits(preset, p)) && collisions(next).length === 0) {
              this.commit({ ...this.state, placements: next });
              return true;
            }
          }
        }
      }
    }

    // No upstream widget to rotate with – pack the target occupants into the old footprint.
    const packed = packIntoCells(occupants, rectCells(dragged));
    if (!packed) return false;

    const next = this.state.placements.map((p) => {
      if (p.id === draggedId) return { ...p, x, y };
      const spot = packed.get(p.id);
      return spot ? { ...p, ...spot } : p;
    });
    if (next.some((p) => !fits(preset, p))) return false;
    if (collisions(next).length > 0) return false;
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
