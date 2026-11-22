import { OrbisMark } from '../ui/brand/OrbisMark';
import { WeatherMap } from '../features/weather-map/WeatherMap';
import './app.css';

/** Grundgerüst: the real forecast content replaces these placeholders feature by feature. */
export function App() {
  return (
    <div class="app">
      <header class="topbar">
        <div class="brand">
          <OrbisMark size={28} />
          <strong>Orbis Wetter</strong>
          <span>Grundgerüst</span>
        </div>
        <div class="spacer" />
        <a class="btn" href="/">Karte ↗</a>
      </header>

      <main>
        <div class="search-placeholder" aria-disabled="true">Ortsuche folgt mit dem Forecast-Feature</div>

        <section class="card hero">
          <h1>Wetter</h1>
          <p class="muted small">Die Vorhersage für deinen Ort erscheint hier, sobald die Open-Meteo-Daten angebunden sind.</p>
        </section>

        <div class="tiles" aria-hidden="true">
          {['Temperatur', 'Wind', 'Niederschlag', 'Luftqualität'].map((label) => (
            <div class="card tile"><span>{label}</span><b>–</b><small>Wird ergänzt</small></div>
          ))}
        </div>

        <WeatherMap />
      </main>
    </div>
  );
}
