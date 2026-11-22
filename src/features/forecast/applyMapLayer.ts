/** Mounts the active 2D weather layer on the compact MapLibre map (ICON raster from R2, radar from RainViewer). */
import type { Map as MlMap, SourceSpecification } from 'maplibre-gl';
import { loadIconField } from '../../data/icon';
import { cached, fetchJson } from '../../data/http';
import type { WxMapMode } from '../handoff/modes';
import { buildFieldImage, type FieldMode } from './fieldLayers';

const SOURCE = 'wx-layer-source';
const LAYER = 'wx-layer-raster';

export interface MountedLayer {
  note: string;
  dispose: () => void;
}

const clear = (map: MlMap): void => {
  if (map.getLayer(LAYER)) map.removeLayer(LAYER);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
};

const waitForStyle = (map: MlMap): Promise<void> => {
  if (map.isStyleLoaded()) return Promise.resolve();
  return new Promise((resolve) => map.once('load', () => resolve()));
};

function addRaster(map: MlMap, source: SourceSpecification, opacity: number): void {
  clear(map);
  map.addSource(SOURCE, source);
  map.addLayer({
    id: LAYER,
    type: 'raster',
    source: SOURCE,
    paint: { 'raster-opacity': opacity, 'raster-fade-duration': 200 },
  }, 'places'); // under the place labels, over the basemap
}

/** One ICON tile per variable is decoded into a canvas and added as a georeferenced image overlay. */
async function mountField(map: MlMap, mode: FieldMode, lat: number, lng: number, signal: AbortSignal): Promise<MountedLayer> {
  const variables = mode === 'temp' ? ['temperature_2m']
    : mode === 'wind' ? ['u', 'v']
    : ['precipitation'];
  const loaded = await Promise.all(variables.map((variable) => loadIconField(variable, lat, lng, { signal })));
  const latest = loaded[0]!.latest;
  const fields = Object.fromEntries(loaded.map((item, i) => [variables[i]!, item.field]));
  let step = 0;
  while (step < latest.times.length - 1 && latest.times[step + 1]! <= Date.now()) step++;

  const image = buildFieldImage(fields, step, mode);
  if (!image) throw new Error('Kein ICON-Feld verfügbar');
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kein Canvas-Kontext');
  context.putImageData(new ImageData(new Uint8ClampedArray(image.pixels), image.width, image.height), 0, 0);

  addRaster(map, {
    type: 'image',
    url: canvas.toDataURL(),
    coordinates: image.bounds,
  }, mode === 'precip' ? 0.75 : 0.6);
  return {
    note: `ICON · Lauf ${latest.run.slice(-2)} UTC`,
    dispose: () => clear(map),
  };
}

interface RainViewer {
  host: string;
  radar: { past: { time: number; path: string }[]; nowcast?: { time: number; path: string }[] };
}

/** RainViewer's keyless radar tiles, as used by orbis-karten. */
async function mountRadar(map: MlMap, signal: AbortSignal): Promise<MountedLayer> {
  const data = await cached('rainviewer:maps', 5 * 60_000, () => fetchJson<RainViewer>(
    'https://api.rainviewer.com/public/weather-maps.json', { signal, timeout: 15_000 },
  ));
  const frames = [...data.radar.past, ...(data.radar.nowcast ?? [])];
  const frame = frames[frames.length - 1];
  if (!frame) throw new Error('Kein Radar-Frame verfügbar');
  addRaster(map, {
    type: 'raster',
    tiles: [`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`],
    tileSize: 256,
    maxzoom: 7,
    attribution: 'Radar: RainViewer',
  }, 0.8);
  return { note: 'Radar · RainViewer', dispose: () => clear(map) };
}

/** Replaces the current overlay. An aborted or failed load leaves the previous layer untouched. */
export async function applyMapLayer(
  map: MlMap, mode: WxMapMode, lat: number, lng: number, signal: AbortSignal,
): Promise<MountedLayer> {
  await waitForStyle(map);
  if (signal.aborted) throw new Error('abgebrochen');
  return mode === 'radar'
    ? await mountRadar(map, signal)
    : await mountField(map, mode, lat, lng, signal);
}
