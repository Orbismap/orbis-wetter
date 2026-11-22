import { useSyncExternalStore } from 'preact/compat';
import type { Rect } from './types';

export interface DragPreview {
  /** Starting cell of the dragged widget – where a swapped group will land. */
  origin: Rect | null;
  /** Cell currently hovered as the swap destination. */
  target: Rect | null;
}

type Listener = () => void;

class DragPreviewStore {
  private state: DragPreview = { origin: null, target: null };
  private listeners = new Set<Listener>();

  getState = (): DragPreview => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  set = (next: DragPreview): void => {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  };

  clear = (): void => this.set({ origin: null, target: null });
}

export const dragPreview = new DragPreviewStore();

export function useDragPreview(): DragPreview {
  return useSyncExternalStore(dragPreview.subscribe, dragPreview.getState);
}
