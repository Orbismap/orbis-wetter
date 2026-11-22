import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Map as MlMap, Marker } from 'maplibre-gl';
import { buildKartenUrl } from '../handoff/url';
import type { WxMapMode } from '../handoff/modes';
import { applyMapLayer, type MountedLayer } from './applyMapLayer';
import { MapLayerPicker } from './MapLayerPicker';
import { MODE_TITLE, markerColor, markerValue } from './mapLayers';
import { wxStyle } from './map-style';

const FALLBACK: [number, number] = [11.47, 53.75]; // Bad Kleinen
const ORIGIN_ZOOM = 6;
const IDLE_MS = 5_000;

interface MarkerRefs {
  hereMarker: Marker;
  hereValue: HTMLElement;
  hereLabel: HTMLElement;
}

/** Compact weather map with viewport-driven layers, one location marker and a fullscreen handoff. */
export function WindMapCard({
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
  const mountedLayer = useRef<MountedLayer | null>(null);
  const markers = useRef<MarkerRefs | null>(null);
  const [mode, setMode] = useState<WxMapMode>('wind');
  const [layerNote, setLayerNote] = useState('');
  const [view, setView] = useState({ lat: 53.7, lng: 11.4, zoom: ORIGIN_ZOOM });
  const here = useMemo(() => ({ lat: lat ?? FALLBACK[1], lng: lng ?? FALLBACK[0] }), [lat, lng]);
  const hereRef = useRef(here);
  hereRef.current = here;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const onMoveEnd = () => mountedLayer.current?.refresh();
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
    const controller = new AbortController();
    let mounted: MountedLayer | undefined;
    const map = mapRef.current;
    if (map) {
      applyMapLayer(map, mode, controller.signal, setLayerNote)
        .then((layer) => {
          if (controller.signal.aborted) { layer.dispose(); return; }
          mounted = layer;
          mountedLayer.current = layer;
        })
        .catch(() => {
          if (!controller.signal.aborted) setLayerNote('Kein Layer verfügbar');
        });
    }
    return () => {
      controller.abort();
      mounted?.dispose();
      mountedLayer.current = null;
    };
  }, [mode, here]);

  useEffect(() => {
    const refs = markers.current;
    if (!refs) return;
    const condition = { temp, precip, wind: windSpeed, code };
    refs.hereLabel.textContent = placeName;
    refs.hereValue.textContent = markerValue(mode, condition);
    refs.hereValue.style.setProperty('--marker-color', markerColor(mode, condition));
  }, [mode, placeName, windSpeed, temp, precip, code]);

  return (
    <section class="windmap" aria-label={`${MODE_TITLE[mode]}karte`}>
      <div class="card-title">
        <span class="title-text">{MODE_TITLE[mode]}</span>
        <div class="layer-controls">
          {layerNote && <span class="layer-note">{layerNote}</span>}
          <MapLayerPicker mode={mode} onChange={setMode} href={href} />
        </div>
      </div>
      <div ref={host} class="wx-map" role="application" aria-label="Wetterkarte" />
    </section>
  );
}
