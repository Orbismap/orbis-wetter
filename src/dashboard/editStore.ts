import { useSyncExternalStore } from 'preact/compat';

type Listener = () => void;

class EditStore {
  private editing = false;
  private listeners = new Set<Listener>();

  getState = (): boolean => this.editing;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  setEditing = (editing: boolean): void => {
    if (editing === this.editing) return;
    this.editing = editing;
    this.listeners.forEach((listener) => listener());
  };

  toggle = (): void => this.setEditing(!this.editing);
}

export const editStore = new EditStore();

export function useEditing(): boolean {
  return useSyncExternalStore(editStore.subscribe, editStore.getState);
}
