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
registerPreset({ id: 'desktop', label: 'Desktop · 6 × 5', cols: 6, rows: 5, width: 950, gap: 12, aspect: 1 });

/** Optional larger grid: same cell size, more columns. */
registerPreset({ id: 'wide', label: 'Wide · 8 × 5', cols: 8, rows: 5, width: 1264, gap: 12, aspect: 1 });
