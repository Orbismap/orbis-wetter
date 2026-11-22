import { useEffect, useRef, useState } from 'preact/hooks';
import { Map as MlMap, type StyleSpecification } from 'maplibre-gl';
import { rememberReturnTo } from '../handoff/contract';
import { buildKartenUrl } from '../handoff/url';

// A neutral dark basemap for the preview. Real weather layers arrive with the forecast feature.
const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: 'raster',
      tiles: ['a', 'b', 'c', 'd'].map((s) => `https://${s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`),
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    },
  },
  layers: [{ id: 'base', type: 'raster', source: 'base' }],
};

/** Compact map with the fullscreen handoff to orbis-karten. */
export function WeatherMap() {
  const host = useRef<HTMLDivElement>(null);
  const [href, setHref] = useState('#/');

  useEffect(() => {
    const map = new MlMap({
      container: host.current!,
      style: STYLE,
      center: [10.45, 51.16],
      zoom: 5,
      attributionControl: { compact: true },
    });
    const sync = () => {
      const c = map.getCenter();
      setHref(buildKartenUrl({ lat: c.lat, lng: c.lng, zoom: map.getZoom(), mode: 'radar' }));
    };
    map.on('move', sync);
    sync();
    return () => {
      map.off('move', sync);
      map.remove();
    };
  }, []);

  return (
    <section class="card map-card">
      <div class="card-head">
        <h2>Wetterkarte</h2>
        {/* A real link: cross-document view transitions only fire for user-initiated navigation. */}
        <a class="btn" href={href} onClick={rememberReturnTo} aria-label="Große Karte in orbis-karten öffnen">
          Große Karte ↗
        </a>
      </div>
      <div ref={host} class="wx-map" role="application" aria-label="Wetterkarte" />
      <p class="muted small map-note">Vorschau – Wetterlayer und Zeitachse folgen mit dem Forecast-Feature.</p>
    </section>
  );
}
