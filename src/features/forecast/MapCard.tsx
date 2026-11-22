import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Map as MlMap, Marker } from 'maplibre-gl';
import { buildKartenUrl } from '../handoff/url';
import { rememberReturnTo } from '../handoff/contract';
import type { WxMapMode } from '../handoff/modes';
import { applyMapLayer } from './applyMapLayer';
import { loadWxRender, type WeatherLayerHandle } from './sharedRenderer';
import { MapLayerPicker } from './MapLayerPicker';
import { MODE_TITLE, markerColor, markerValue, suggestedMapMode, type MarkerCondition } from './mapLayers';
import { wxStyle } from './map-style';

const FALLBACK: [number, number] = [11.47, 53.75]; // Bad Kleinen
const ORIGIN_ZOOM = 6;
const IDLE_MS = 5_000;

interface MarkerRefs {
  hereMarker: Marker;
  hereValue: HTMLElement;
  hereLabel: HTMLElement;
}

/** The shared renderer handles movement itself; the local fallback needs an explicit refresh. */
interface ActiveLayer extends Partial<WeatherLayerHandle> {
  refresh?: () => void;
  destroy: () => void;
}

/** Compact weather map with viewport-driven layers, one location marker and a fullscreen handoff. */
export function MapCard({
  windSpeed, placeName, lat, lng, temp = 0, precip = 0, code = 0,
}: {
  windSpeed: number;
  placeName: string;
  lat?: number;
  lng?: number;
  temp?: number;
  precip?: number;
  code?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const mountedLayer = useRef<ActiveLayer | null>(null);
  const markers = useRef<MarkerRefs | null>(null);
  const condition = useMemo<MarkerCondition>(
    () => ({ temp, precip, wind: windSpeed, code }),
    [temp, precip, windSpeed, code],
  );
  // Start with the layer that fits the current conditions. A manual choice is kept until the
  // selected place changes – a data refresh for the same place must not override it.
  const [mode, setMode] = useState<WxMapMode>(() => suggestedMapMode(condition));
  const placeKey = `${lat},${lng}`;
  const lastPlace = useRef(placeKey);
  useEffect(() => {
    if (placeKey === lastPlace.current) return;
    lastPlace.current = placeKey;
    setMode(suggestedMapMode(condition));
  }, [placeKey, condition]);

  // The layer is already in the card title – this only carries the data source.
  const [layerNote, setLayerNote] = useState('ICON');
  const [view, setView] = useState({ lat: 53.7, lng: 11.4, zoom: ORIGIN_ZOOM });
  const here = useMemo(() => ({ lat: lat ?? FALLBACK[1], lng: lng ?? FALLBACK[0] }), [lat, lng]);
  const hereRef = useRef(here);
  hereRef.current = here;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expanding = useRef(false);

  /** Grow the map from its exact card rect to the whole viewport. MapLibre is resized every
      frame so the canvas stays sharp instead of being stretched by a CSS transform. */
  const expandMap = useCallback(() => {
    const el = host.current;
    const map = mapRef.current;
    if (!el || !map || expanding.current) return;
    expanding.current = true;

    const from = el.getBoundingClientRect();
    const to = { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };

    // Pin the map where it currently sits – adding position:fixed alone would jump it to 0,0.
    // All geometry is driven inline so the CSS class can stay free of !important overrides.
    el.classList.add('wx-map--fullscreen');
    el.style.transition = 'none';
    el.style.top = `${from.top}px`;
    el.style.left = `${from.left}px`;
    el.style.width = `${from.width}px`;
    el.style.height = `${from.height}px`;
    el.style.margin = '0';
    el.style.borderRadius = '20px';

    const duration = 450;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = ease(t);
      el.style.top = `${from.top + (to.top - from.top) * e}px`;
      el.style.left = `${from.left + (to.left - from.left) * e}px`;
      el.style.width = `${from.width + (to.width - from.width) * e}px`;
      el.style.height = `${from.height + (to.height - from.height) * e}px`;
      el.style.borderRadius = `${20 * (1 - e)}px`;
      map.resize();
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        // Lock to viewport units so a later window resize still fits exactly.
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = '100vw';
        el.style.height = '100vh';
        el.style.borderRadius = '0';
        map.resize();
        // Let the final fullscreen frame paint, then leave the map on screen for a moment
        // before the cross-document transition to orbis-karten starts.
        requestAnimationFrame(() => {
          setTimeout(() => {
            rememberReturnTo();
            window.location.href = hrefRef.current;
          }, 600);
        });
      }
    };
    requestAnimationFrame(tick);
  }, []);

  /** Started only by a real user interaction – not on mount, not on a place change or a programmatic fly. */
  const scheduleReturn = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      const target = hereRef.current;
      map.flyTo({ center: [target.lng, target.lat], zoom: ORIGIN_ZOOM, duration: 900 });
    }, IDLE_MS);
  }, []);

  const href = useMemo(() => buildKartenUrl({
    lat: view.lat, lng: view.lng, zoom: view.zoom, mode,
    place: { name: placeName },
  }), [view, mode, placeName]);
  // Keep the latest URL readable from the stable expand callback without recreating it on every map move.
  const hrefRef = useRef(href);
  hrefRef.current = href;

  useEffect(() => {
    const map = new MlMap({
      container: host.current!,
      style: wxStyle,
      center: [11.4, 53.7],
      zoom: ORIGIN_ZOOM,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;

    const hereEl = document.createElement('div');
    hereEl.className = 'here-marker';
    const hereValue = document.createElement('span');
    hereValue.className = 'here-value';
    const hereLabel = document.createElement('span');
    hereLabel.className = 'here-label';
    hereLabel.textContent = placeName;
    hereEl.append(hereValue, hereLabel);
    const hereMarker = new Marker({ element: hereEl, anchor: 'center' }).setLngLat([here.lng, here.lat]).addTo(map);
    markers.current = { hereMarker, hereValue, hereLabel };

    const sync = () => {
      const c = map.getCenter();
      setView({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    };
    const onMoveEnd = () => mountedLayer.current?.refresh?.();
    map.on('move', sync);
    map.on('moveend', onMoveEnd);
    sync();
    // The card is laid out by the grid after mount; MapLibre needs a nudge once it has a real size.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(host.current!);

    // Only user input on the map surface arms the return timer; our own flyTo doesn't touch these listeners.
    const surface = host.current!;
    const onInteract = () => scheduleReturn();
    const events = ['pointerdown', 'wheel', 'touchstart', 'keydown'];
    events.forEach((type) => surface.addEventListener(type, onInteract));

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((type) => surface.removeEventListener(type, onInteract));
      ro.disconnect();
      map.off('move', sync);
      map.off('moveend', onMoveEnd);
      hereMarker.remove();
      map.remove();
      mapRef.current = null;
      markers.current = null;
    };
  }, [scheduleReturn]);

  useEffect(() => {
    markers.current?.hereMarker.setLngLat([here.lng, here.lat]);
    const map = mapRef.current;
    if (map) map.flyTo({ center: [here.lng, here.lat], zoom: ORIGIN_ZOOM, duration: 900 });
  }, [here]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    let active: ActiveLayer | undefined;
    const local = new AbortController();
    setLayerNote('ICON');

    loadWxRender()
      .then((api) => {
        if (cancelled) return;
        active = api.mountWeatherLayer(map, {
          mode,
          beforeId: 'places',
          onStatus: (status) => {
            if (cancelled) return;
            if (status.state === 'error') setLayerNote(status.note || 'Kein Layer verfügbar');
            else setLayerNote('ICON');
          },
        });
        mountedLayer.current = active;
      })
      .catch(() => {
        if (cancelled) return;
        // Shared bundle unreachable (e.g. karten dev server down): keep the compact map usable.
        applyMapLayer(map, mode, local.signal, () => setLayerNote('ICON'))
          .then((layer) => {
            if (cancelled) { layer.dispose(); return; }
            active = { refresh: layer.refresh, destroy: layer.dispose };
            mountedLayer.current = active;
          })
          .catch(() => {
            if (!cancelled) setLayerNote('Kein Layer verfügbar');
          });
      });

    return () => {
      cancelled = true;
      local.abort();
      active?.destroy();
      mountedLayer.current = null;
    };
  }, [mode, here]);

  useEffect(() => {
    const refs = markers.current;
    if (!refs) return;
    refs.hereLabel.textContent = placeName;
    refs.hereValue.textContent = markerValue(mode, condition);
    refs.hereValue.style.setProperty('--marker-color', markerColor(mode, condition));
  }, [mode, placeName, condition]);

  return (
    <section class="mapcard" aria-label={`${MODE_TITLE[mode]}karte`}>
      <div class="card-title">
        <span class="title-text">{MODE_TITLE[mode]}</span>
        <div class="layer-controls">
          {layerNote && <span class="layer-note">{layerNote}</span>}
          <MapLayerPicker mode={mode} onChange={setMode} onExpand={expandMap} />
        </div>
      </div>
      <div ref={host} class="wx-map" role="application" aria-label="Wetterkarte" />
    </section>
  );
}
