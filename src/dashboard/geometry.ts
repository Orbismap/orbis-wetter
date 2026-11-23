import type { CellMetrics, GridPreset, Rect } from './types';

/** Rows the grid may grow to. */
export const rowLimit = (preset: GridPreset): number => preset.maxRows ?? preset.rows;

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
  return p.w > 0 && p.h > 0 && p.x >= 0 && p.y >= 0 && p.x + p.w <= preset.cols && p.y + p.h <= rowLimit(preset);
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
  for (let y = 0; y <= rowLimit(preset) - h; y++) {
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
  const h = clamp(Math.round(p.h), 1, rowLimit(preset));
  return {
    w,
    h,
    x: clamp(Math.round(p.x), 0, preset.cols - w),
    y: clamp(Math.round(p.y), 0, rowLimit(preset) - h),
  };
}

/** All grid cells covered by a rectangle. */
export function rectCells(rect: Rect): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) cells.push({ x, y });
  }
  return cells;
}

/**
 * Pack widgets into a set of cells (exact cover). A large widget swaps with a group of smaller ones
 * only when their combined footprints fill its old area exactly.
 */
export function packIntoCells<T extends Rect & { id: string }>(
  rectangles: T[], cells: Array<{ x: number; y: number }>,
): Map<string, { x: number; y: number }> | null {
  const remaining = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
  const result = new Map<string, { x: number; y: number }>();
  const ordered = [...rectangles].sort((a, b) => b.w * b.h - a.w * a.h);

  const place = (index: number): boolean => {
    if (index === ordered.length) return remaining.size === 0;
    const rect = ordered[index]!;
    for (const cell of cells) {
      const keys: string[] = [];
      let fitsHere = true;
      for (let dy = 0; dy < rect.h && fitsHere; dy++) {
        for (let dx = 0; dx < rect.w; dx++) {
          const key = `${cell.x + dx},${cell.y + dy}`;
          if (!remaining.has(key)) { fitsHere = false; break; }
          keys.push(key);
        }
      }
      if (!fitsHere) continue;
      keys.forEach((key) => remaining.delete(key));
      result.set(rect.id, { x: cell.x, y: cell.y });
      if (place(index + 1)) return true;
      keys.forEach((key) => remaining.add(key));
      result.delete(rect.id);
    }
    return false;
  };

  return place(0) ? result : null;
}

/** Human-readable size label used in the placeholder widgets and later in the editor. */
export function sizeLabel(w: number, h: number): string {
  return `${w}×${h}`;
}

/** Number of grid rows covered by a layout (bottom edge of the lowest widget). */
export function usedRows(placements: Rect[]): number {
  return placements.reduce((max, p) => Math.max(max, p.y + p.h), 0);
}

/** The free slot closest to `from` (Manhattan distance), so displaced widgets stay near where they were. */
export function nearestFreeSlot(
  preset: GridPreset, occupied: Rect[], w: number, h: number, from: { x: number; y: number },
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestDistance = Infinity;
  for (let y = 0; y <= rowLimit(preset) - h; y++) {
    for (let x = 0; x <= preset.cols - w; x++) {
      const distance = Math.abs(x - from.x) + Math.abs(y - from.y);
      if (distance >= bestDistance) continue;
      const candidate = { x, y, w, h };
      if (occupied.some((p) => overlaps(candidate, p))) continue;
      best = { x, y };
      bestDistance = distance;
    }
  }
  return best;
}
