import { useEffect, useRef, useState } from 'preact/hooks';
import { Map as MlMap, Marker } from 'maplibre-gl';
import { rememberReturnTo } from '../handoff/contract';
import { buildKartenUrl } from '../handoff/url';
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

const HERE: [number, number] = [11.47, 53.75]; // Bad Kleinen

/** Compact wind map: static city/location markers for now, with the fullscreen handoff to orbis-karten. */
export function WindMapCard({ windSpeed, placeName }: { windSpeed: number; placeName: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [href, setHref] = useState('#/');

  useEffect(() => {
    const map = new MlMap({
      container: host.current!,
      style: wxStyle,
      center: [11.4, 53.7],
      zoom: 6,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });

    const markers = CITIES.map(([name, lng, lat]) => {
      const el = document.createElement('div');
      el.className = 'city-marker';
      el.textContent = name;
      return new Marker({ element: el, anchor: 'left' }).setLngLat([lng, lat]).addTo(map);
    });

    const here = document.createElement('div');
    here.className = 'here-marker';
    here.innerHTML = `<span class="here-value">${windSpeed}</span><span class="here-label">${placeName}</span>`;
    markers.push(new Marker({ element: here, anchor: 'center' }).setLngLat(HERE).addTo(map));

    const sync = () => {
      const c = map.getCenter();
      setHref(buildKartenUrl({ lat: c.lat, lng: c.lng, zoom: map.getZoom(), mode: 'wind' }));
    };
    map.on('move', sync);
    sync();
    // The card is laid out by flex/grid after mount; MapLibre needs a nudge once it has a real size.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(host.current!);

    return () => {
      ro.disconnect();
      map.off('move', sync);
      markers.forEach((m) => m.remove());
      map.remove();
    };
  }, [windSpeed, placeName]);

  return (
    <section class="windmap" aria-label="Windkarte">
      <div class="card-title">
        <span class="title-icon">⌁</span> Windkarte
        {/* A real link: cross-document view transitions only fire for user-initiated navigation. */}
        <a class="expand" href={href} onClick={rememberReturnTo} aria-label="Große Karte in orbis-karten öffnen" title="Große Karte öffnen">⤢</a>
      </div>
      <div ref={host} class="wx-map" role="application" aria-label="Windkarte" />
    </section>
  );
}
