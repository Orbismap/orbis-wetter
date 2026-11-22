/** Viewport-driven weather layers on the compact map: ICON tiles from R2 (overview when zoomed out), radar from RainViewer. */
import type { Map as MlMap, SourceSpecification } from 'maplibre-gl';
import { loadIconFieldByTile, loadIconFieldOverview, type OwxLatest } from '../../data/icon';
import { cached, fetchJson } from '../../data/http';
import { tileAt } from '../../data/owx';
import type { WxMapMode } from '../handoff/modes';
import { buildFieldImage, type FieldImage, type FieldMode } from './fieldLayers';
import { MODE_TITLE } from './mapLayers';

/** Below this zoom the 0.5° whole-world overview covers the view; above it the 45° tiles are loaded. */
const LOW_ZOOM = 4;

export interface MountedLayer {
  refresh: () => void;
  dispose: () => void;
}

interface MountedPart { source: string; layer: string }

const waitForStyle = (map: MlMap): Promise<void> => {
  if (map.isStyleLoaded()) return Promise.resolve();
  return new Promise((resolve) => map.once('load', () => resolve()));
};

const removePart = (map: MlMap, part: MountedPart): void => {
  if (map.getLayer(part.layer)) map.removeLayer(part.layer);
  if (map.getSource(part.source)) map.removeSource(part.source);
};

const addRaster = (map: MlMap, id: string, source: SourceSpecification, opacity: number): void => {
  if (map.getSource(id)) return;
  map.addSource(id, source);
  map.addLayer({
    id,
    type: 'raster',
    source: id,
    paint: { 'raster-opacity': opacity, 'raster-fade-duration': 200 },
  }, 'places'); // under place labels, over the basemap
};

const imageUrl = (image: FieldImage): string => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kein Canvas-Kontext');
  context.putImageData(new ImageData(new Uint8ClampedArray(image.pixels), image.width, image.height), 0, 0);
  return canvas.toDataURL();
};

const stepOf = (latest: OwxLatest): number => {
  let step = 0;
  while (step < latest.times.length - 1 && latest.times[step + 1]! <= Date.now()) step++;
  return step;
};

/** Unique tiles intersecting the current viewport (sampled across the bounds, capped for safety). */
function visibleTiles(map: MlMap): { c: number; r: number }[] {
  const bounds = map.getBounds();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const north = bounds.getNorth();
  const south = bounds.getSouth();
  const ids = new Map<string, { c: number; r: number }>();
  for (const lng of [west, (west + east) / 2, east]) {
    for (const lat of [north, (north + south) / 2, south]) {
      const tile = tileAt(lng, lat);
      ids.set(`${tile.c}_${tile.r}`, tile);
    }
  }
  return [...ids.values()].slice(0, 16);
}

type FieldLoader = (variable: string) => Promise<{ field: import('../../data/owx').OwxField; latest: OwxLatest }>;

/** ICON overlay that reloads only the parts the current view actually needs. */
async function mountField(
  map: MlMap, mode: FieldMode, signal: AbortSignal, onNote: (note: string) => void,
): Promise<MountedLayer> {
  await waitForStyle(map);
  const variables = mode === 'temp' ? ['temperature_2m']
    : mode === 'wind' ? ['u', 'v']
    : ['precipitation'];
  const opacity = mode === 'precip' ? 0.75 : 0.6;
  const mounted = new Map<string, MountedPart>();
  let generation = 0;
  let disposed = false;

  const render = async (key: string, load: FieldLoader, gen: number): Promise<void> => {
    const loaded = await Promise.all(variables.map(load));
    if (gen !== generation || disposed || signal.aborted || mounted.has(key)) return;
    const latest = loaded[0]!.latest;
    onNote(`${MODE_TITLE[mode]} · ICON ${latest.run.slice(-2)} UTC`);
    const fields = Object.fromEntries(loaded.map((item, i) => [variables[i]!, item.field]));
    const image = buildFieldImage(fields, stepOf(latest), mode);
    if (!image) return;
    const id = `wx-layer-${key.replaceAll(/[^a-z0-9]/gi, '-')}`;
    addRaster(map, id, { type: 'image', url: imageUrl(image), coordinates: image.bounds }, opacity);
    mounted.set(key, { source: id, layer: id });
  };

  const refresh = async (): Promise<void> => {
    if (disposed) return;
    const gen = ++generation;
    if (map.getZoom() < LOW_ZOOM) {
      for (const [key, part] of mounted) {
        if (key !== 'o') { removePart(map, part); mounted.delete(key); }
      }
      if (!mounted.has('o')) {
        await render('o', (variable) => loadIconFieldOverview(variable, { signal }), gen).catch(() => {});
      }
      return;
    }
    const tiles = visibleTiles(map);
    const wanted = new Set(tiles.map((tile) => `t${tile.c}_${tile.r}`));
    for (const [key, part] of mounted) {
      if (!wanted.has(key)) { removePart(map, part); mounted.delete(key); }
    }
    await Promise.all(tiles.map((tile) => {
      const key = `t${tile.c}_${tile.r}`;
      if (mounted.has(key)) return Promise.resolve();
      return render(key, (variable) => loadIconFieldByTile(variable, tile.c, tile.r, { signal }), gen).catch(() => {});
    }));
  };

  void refresh();
  return {
    refresh: () => { void refresh(); },
    dispose: () => {
      disposed = true;
      generation++;
      mounted.forEach((part) => removePart(map, part));
      mounted.clear();
    },
  };
}

interface RainViewer {
  host: string;
  radar: { past: { time: number; path: string }[]; nowcast?: { time: number; path: string }[] };
}

/** RainViewer's keyless radar tiles already follow the viewport by themselves. */
async function mountRadar(map: MlMap, signal: AbortSignal, onNote: (note: string) => void): Promise<MountedLayer> {
  await waitForStyle(map);
  const data = await cached('rainviewer:maps', 5 * 60_000, () => fetchJson<RainViewer>(
    'https://api.rainviewer.com/public/weather-maps.json', { signal, timeout: 15_000 },
  ));
  const frames = [...data.radar.past, ...(data.radar.nowcast ?? [])];
  const frame = frames[frames.length - 1];
  if (!frame) throw new Error('Kein Radar-Frame verfügbar');
  addRaster(map, 'wx-layer-radar', {
    type: 'raster',
    tiles: [`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`],
    tileSize: 256,
    maxzoom: 7,
    attribution: 'Radar: RainViewer',
  }, 0.8);
  onNote('Radar · RainViewer');
  return { refresh: () => {}, dispose: () => removePart(map, { source: 'wx-layer-radar', layer: 'wx-layer-radar' }) };
}

/** Replaces the current overlay. An aborted or failed load leaves the previous layer untouched. */
export async function applyMapLayer(
  map: MlMap, mode: WxMapMode, signal: AbortSignal, onNote: (note: string) => void,
): Promise<MountedLayer> {
  if (signal.aborted) throw new Error('abgebrochen');
  return mode === 'radar'
    ? await mountRadar(map, signal, onNote)
    : await mountField(map, mode, signal, onNote);
}
