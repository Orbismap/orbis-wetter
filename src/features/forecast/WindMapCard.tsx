import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Map as MlMap, Marker } from 'maplibre-gl';
import { loadCityConditions, type CityCondition } from '../../data/openMeteo';
import { buildKartenUrl } from '../handoff/url';
import type { WxMapMode } from '../handoff/modes';
import { applyMapLayer, type MountedLayer } from './applyMapLayer';
import { MapLayerPicker } from './MapLayerPicker';
import { MODE_TITLE, markerColor, markerValue } from './mapLayers';
import { wxStyle } from './map-style';

const CITIES: [string, number, number][] = [
  ['Odense', 10.39, 55.40],
  ['Kiel', 10.13, 54.32],
  ['Hamburg', 9.99, 53.55],
  ['Bremen', 8.80, 53.08],
  ['Stettin', 14.55, 53.43],
  ['Hannover', 9.73, 52.37],
  ['Magdeburg', 11.64, 52.13],
  ['Berlin', 13.40, 52.52],
];

const FALLBACK: [number, number] = [11.47, 53.75]; // Bad Kleinen
const ORIGIN_ZOOM = 6;
const IDLE_MS = 5_000;

interface MarkerRefs {
  cities: HTMLElement[];
  hereMarker: Marker;
  hereValue: HTMLElement;
  hereLabel: HTMLElement;
}

/** Compact weather map: live values at city markers, switchable layers and fullscreen handoff. */
export function WindMapCard({
  windSpeed, placeName, lat, lng,
}: {
  windSpeed: number;
  placeName: string;
  lat?: number;
  lng?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef<MarkerRefs | null>(null);
  const [mode, setMode] = useState<WxMapMode>('wind');
  const [layerNote, setLayerNote] = useState('');
  const [conditions, setConditions] = useState<CityCondition[]>([]);
  const [view, setView] = useState({ lat: 53.7, lng: 11.4, zoom: ORIGIN_ZOOM });
  const here = useMemo(() => ({ lat: lat ?? FALLBACK[1], lng: lng ?? FALLBACK[0] }), [lat, lng]);
  const hereRef = useRef(here);
  hereRef.current = here;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** After a few seconds without map interaction, fly back to the searched place. */
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

    const cityMarkers = CITIES.map(([name, cityLng, cityLat]) => {
      const el = document.createElement('div');
      el.className = 'city-marker';
      el.textContent = name;
      return new Marker({ element: el, anchor: 'left' }).setLngLat([cityLng, cityLat]).addTo(map);
    });

    const hereEl = document.createElement('div');
    hereEl.className = 'here-marker';
    const hereValue = document.createElement('span');
    hereValue.className = 'here-value';
    const hereLabel = document.createElement('span');
    hereLabel.className = 'here-label';
    hereLabel.textContent = placeName;
    hereEl.append(hereValue, hereLabel);
    const hereMarker = new Marker({ element: hereEl, anchor: 'center' }).setLngLat([here.lng, here.lat]).addTo(map);
    markers.current = {
      cities: cityMarkers.map((marker) => marker.getElement() as HTMLElement),
      hereMarker, hereValue, hereLabel,
    };

    const sync = () => {
      const c = map.getCenter();
      setView({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    };
    map.on('move', sync);
    sync();
    // The card is laid out by the grid after mount; MapLibre needs a nudge once it has a real size.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(host.current!);

    // Any real input on the map restarts the idle countdown. Programmatic flyTo doesn't touch these listeners,
    // so the return animation cannot keep itself alive.
    const surface = host.current!;
    const onInteract = () => scheduleReturn();
    const events = ['pointerdown', 'wheel', 'touchstart', 'keydown'];
    events.forEach((type) => surface.addEventListener(type, onInteract));
    scheduleReturn();

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      events.forEach((type) => surface.removeEventListener(type, onInteract));
      ro.disconnect();
      map.off('move', sync);
      cityMarkers.forEach((marker) => marker.remove());
      hereMarker.remove();
      map.remove();
      mapRef.current = null;
      markers.current = null;
    };
    // Map lifecycle is independent of the selected layer; marker text is updated below.
  }, [scheduleReturn]);

  useEffect(() => {
    markers.current?.hereMarker.setLngLat([here.lng, here.lat]);
    const map = mapRef.current;
    if (map) {
      map.flyTo({ center: [here.lng, here.lat], zoom: ORIGIN_ZOOM, duration: 900 });
      scheduleReturn();
    }
    const controller = new AbortController();
    const points = [...CITIES.map(([, lng, lat]) => ({ lat, lng })), here];
    loadCityConditions(points, { signal: controller.signal })
      .then(setConditions)
      .catch(() => { /* markers keep their labels without live values */ });
    return () => controller.abort();
  }, [here, scheduleReturn]);

  useEffect(() => {
    const controller = new AbortController();
    let mounted: MountedLayer | undefined;
    const map = mapRef.current;
    if (map) {
      applyMapLayer(map, mode, here.lat, here.lng, controller.signal)
        .then((layer) => {
          if (controller.signal.aborted) { layer.dispose(); return; }
          mounted = layer;
          setLayerNote(layer.note);
        })
        .catch(() => {
          if (!controller.signal.aborted) setLayerNote('Kein Layer verfügbar');
        });
    }
    return () => {
      controller.abort();
      mounted?.dispose();
    };
  }, [mode, here]);

  useEffect(() => {
    const refs = markers.current;
    if (!refs) return;
    refs.cities.forEach((el, i) => {
      const condition = conditions[i];
      if (!condition) return;
      el.textContent = `${CITIES[i]![0]} ${markerValue(mode, condition)}`;
      el.style.setProperty('--marker-color', markerColor(mode, condition));
    });
    const current = conditions[conditions.length - 1];
    refs.hereLabel.textContent = placeName;
    refs.hereValue.textContent = current
      ? markerValue(mode, current)
      : mode === 'wind' ? String(Math.round(windSpeed)) : '–';
    refs.hereValue.style.setProperty('--marker-color', current ? markerColor(mode, current) : '#72c8f0');
  }, [mode, conditions, placeName, windSpeed]);

  return (
    <section class="windmap" aria-label={`${MODE_TITLE[mode]}karte`}>
      <div class="card-title">
        <span class="title-icon">⌁</span> {MODE_TITLE[mode]}
        <div class="layer-controls">
          {layerNote && <span class="layer-note">{layerNote}</span>}
          <MapLayerPicker mode={mode} onChange={setMode} href={href} />
        </div>
      </div>
      <div ref={host} class="wx-map" role="application" aria-label="Wetterkarte" />
    </section>
  );
}
