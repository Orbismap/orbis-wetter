import type { GridPreset } from './types';

const presets = new Map<string, GridPreset>();

export function registerPreset(preset: GridPreset): void {
  presets.set(preset.id, preset);
}

export function getPreset(id: string): GridPreset {
  const preset = presets.get(id);
  if (!preset) throw new Error(`Unknown grid preset: ${id}`);
  return preset;
}

export function listPresets(): GridPreset[] {
  return [...presets.values()];
}

/** Desktop: 6 × 5 square cells on a fixed 950 px canvas. */
registerPreset({ id: 'desktop', label: 'Desktop · 6 × 5', cols: 6, rows: 5, maxRows: 14, width: 950, gap: 12, aspect: 1 });

/** Optional larger grid: same cell size, more columns. */
registerPreset({ id: 'wide', label: 'Wide · 8 × 5', cols: 8, rows: 5, maxRows: 14, width: 1264, gap: 12, aspect: 1 });

/** Phone: 2 columns. The canvas width follows the viewport (see viewport.ts); 358 px is only the default. */
registerPreset({ id: 'mobile', label: 'Mobil · 2 × 14', cols: 2, rows: 14, maxRows: 40, width: 358, gap: 10, aspect: 1 });
