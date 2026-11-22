import type { CellMetrics, GridPreset, Rect } from './types';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Compute pixel metrics from a preset. Cells fill the canvas width exactly. */
export function cellMetrics(preset: GridPreset): CellMetrics {
  const cellW = (preset.width - (preset.cols - 1) * preset.gap) / preset.cols;
  const cellH = cellW / preset.aspect;
  return {
    cols: preset.cols,
    rows: preset.rows,
    cellW,
    cellH,
    stepX: cellW + preset.gap,
    stepY: cellH + preset.gap,
    gap: preset.gap,
    width: preset.cols * cellW + (preset.cols - 1) * preset.gap,
    height: preset.rows * cellH + (preset.rows - 1) * preset.gap,
  };
}

/** Convert a cell rectangle to absolute pixel offsets inside the canvas. */
export function placementRect(p: Rect, m: CellMetrics) {
  return {
    left: p.x * m.stepX,
    top: p.y * m.stepY,
    width: p.w * m.stepX - m.gap,
    height: p.h * m.stepY - m.gap,
  };
}

/** A placement must have a positive size and stay inside the grid. */
export function fits(preset: GridPreset, p: Rect): boolean {
  return p.w > 0 && p.h > 0 && p.x >= 0 && p.y >= 0 && p.x + p.w <= preset.cols && p.y + p.h <= preset.rows;
}

/** Do two cell rectangles overlap? */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** All overlapping pairs in a layout (by instance id). */
export function collisions(placements: Array<Rect & { id: string }>): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      if (overlaps(placements[i]!, placements[j]!)) result.push([placements[i]!.id, placements[j]!.id]);
    }
  }
  return result;
}

/** First free slot that fits a w × h widget, scanning left-to-right, top-to-bottom. */
export function firstFreeSlot(preset: GridPreset, placements: Rect[], w: number, h: number): { x: number; y: number } | null {
  for (let y = 0; y <= preset.rows - h; y++) {
    for (let x = 0; x <= preset.cols - w; x++) {
      const candidate = { x, y, w, h };
      if (!placements.some((p) => overlaps(candidate, p))) return { x, y };
    }
  }
  return null;
}

/** Keep a rectangle inside the grid, shrinking it if necessary. */
export function clampToGrid(preset: GridPreset, p: Rect): Rect {
  const w = clamp(Math.round(p.w), 1, preset.cols);
  const h = clamp(Math.round(p.h), 1, preset.rows);
  return {
    w,
    h,
    x: clamp(Math.round(p.x), 0, preset.cols - w),
    y: clamp(Math.round(p.y), 0, preset.rows - h),
  };
}

/** Human-readable size label used in the placeholder widgets and later in the editor. */
export function sizeLabel(w: number, h: number): string {
  return `${w}×${h}`;
}
