/**
 * Runtime link to orbis-karten's weather render kit. Both apps are served from maps.maltee.dev,
 * so `/wx-render/v1.js` is a same-origin ES module. In local dev Vite proxies that path to the
 * karten dev server (see vite.config.ts).
 *
 * This is intentionally a dynamic import with @vite-ignore: the module is built and deployed by
 * the orbis repo, not by wetter. The `v1` path is the version pin – orbis must keep it compatible.
 */
import type { Map as MlMap } from 'maplibre-gl';

export type WeatherMode = 'wind' | 'precip' | 'temp' | 'radar';

export interface WeatherMountOptions {
  mode: WeatherMode;
  beforeId?: string;
  opacity?: number;
  particles?: boolean;
  onStatus?: (status: { state: 'loading' | 'ready' | 'empty' | 'error'; note?: string }) => void;
}

export interface WeatherLayerHandle {
  destroy(): void;
}

export interface WxRenderModule {
  WX_RENDER_VERSION: number;
  mountWeatherLayer(map: MlMap, options: WeatherMountOptions): WeatherLayerHandle;
}

export const WX_RENDER_URL = '/wx-render/v1.js';
export const WX_RENDER_EXPECTED_VERSION = 1;

let pending: Promise<WxRenderModule> | undefined;

/** Loaded once and cached for the lifetime of the page. */
export function loadWxRender(): Promise<WxRenderModule> {
  pending ??= (() => {
    const url = WX_RENDER_URL;
    return import(/* @vite-ignore */ url).then((mod) => {
      const api = mod as WxRenderModule;
      if (api.WX_RENDER_VERSION !== WX_RENDER_EXPECTED_VERSION) {
        throw new Error(`wx-render version mismatch: ${api.WX_RENDER_VERSION}`);
      }
      if (typeof api.mountWeatherLayer !== 'function') throw new Error('wx-render API missing');
      return api;
    });
  })().catch((error) => {
    pending = undefined; // allow a retry after a transient network failure
    throw error;
  });
  return pending;
}
