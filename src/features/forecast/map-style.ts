import type { ExpressionSpecification, FilterSpecification, StyleSpecification } from 'maplibre-gl';

/** Compact dark preview style on the same keyless OpenFreeMap tiles orbis-karten uses.
 *  Deliberately a small subset of orbis-map's "orbis-dark" palette so both sides look related. */
const C = {
  land: '#1c2739',
  water: '#0d1a2e',
  urban: '#202c40',
  industrial: '#223046',
  wood: '#1a2a35',
  roadMinor: '#2a374e',
  roadMajor: '#38486a',
  highway: '#465a82',
  border: '#4f6389',
  text: '#a3afc2',
  halo: 'rgba(10, 15, 24, 0.9)',
};

const WIDTH = (base: number): ExpressionSpecification =>
  ['interpolate', ['exponential', 1.5], ['zoom'], 5, base * 0.3, 10, base, 16, base * 6] as ExpressionSpecification;
const CLASSES = (...names: string[]): FilterSpecification =>
  ['in', ['get', 'class'], ['literal', names]] as FilterSpecification;

export const wxStyle: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    ofm: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
      attribution: '© <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': C.land } },
    {
      id: 'landuse', type: 'fill', source: 'ofm', 'source-layer': 'landuse', minzoom: 8,
      paint: { 'fill-color': ['match', ['get', 'class'], 'residential', C.urban, 'industrial', C.industrial, C.land], 'fill-opacity': 0.8 },
    },
    {
      id: 'wood', type: 'fill', source: 'ofm', 'source-layer': 'landcover',
      filter: CLASSES('wood', 'forest'), paint: { 'fill-color': C.wood, 'fill-opacity': 0.8 },
    },
    { id: 'water', type: 'fill', source: 'ofm', 'source-layer': 'water', paint: { 'fill-color': C.water } },
    {
      id: 'border', type: 'line', source: 'ofm', 'source-layer': 'boundary', minzoom: 2,
      filter: ['==', ['get', 'admin_level'], 2],
      paint: { 'line-color': C.border, 'line-opacity': 0.6, 'line-width': 1 },
    },
    {
      id: 'roads-minor', type: 'line', source: 'ofm', 'source-layer': 'transportation', minzoom: 6,
      filter: CLASSES('secondary', 'tertiary', 'minor', 'street'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': C.roadMinor, 'line-width': WIDTH(0.6) },
    },
    {
      id: 'roads-major', type: 'line', source: 'ofm', 'source-layer': 'transportation', minzoom: 5,
      filter: CLASSES('motorway', 'trunk', 'primary'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['match', ['get', 'class'], 'motorway', C.highway, C.roadMajor],
        'line-width': WIDTH(0.9),
      },
    },
    {
      id: 'places', type: 'symbol', source: 'ofm', 'source-layer': 'place', minzoom: 3,
      layout: {
        'text-field': ['coalesce', ['get', 'name:de'], ['get', 'name:latin'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 10, 14],
        'text-max-width': 8,
      },
      paint: { 'text-color': C.text, 'text-halo-color': C.halo, 'text-halo-width': 1.2 },
    },
  ],
};
