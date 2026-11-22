import { render } from 'preact';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { App } from './app/App';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/tokens.css';
import './styles/base.css';

// Bundlers move the library, so tell MapLibre explicitly where its worker lives (same as orbis-map).
setWorkerUrl(workerUrl);

render(<App />, document.getElementById('app')!);
