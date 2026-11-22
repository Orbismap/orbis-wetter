/** Core domain types for the widget-grid system. Coordinates and sizes are in grid cells. */

export interface GridPreset {
  id: string;
  label: string;
  /** Number of columns. */
  cols: number;
  /** Number of rows. */
  rows: number;
  /** Fixed canvas width in px (the canvas never resizes with the window). */
  width: number;
  /** Gap between cells in px. */
  gap: number;
  /** Cell width / cell height. 1 means square cells. */
  aspect: number;
}

/** A widget instance placed on the grid. The same widget type may appear more than once. */
export interface Placement {
  /** Unique instance id. */
  id: string;
  /** Id of the widget definition (see widgets/registry.ts). */
  widget: string;
  /** 0-based column. */
  x: number;
  /** 0-based row. */
  y: number;
  /** Width in cells. */
  w: number;
  /** Height in cells. */
  h: number;
}

export interface LayoutState {
  /** Id of the active grid preset. */
  preset: string;
  placements: Placement[];
}

/** Derived pixel metrics for a preset. */
export interface CellMetrics {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  stepX: number;
  stepY: number;
  gap: number;
  width: number;
  height: number;
}

/** A rectangle in cell coordinates. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
