import { useEffect, useState } from 'preact/hooks';
import { OrbisMark } from '../ui/brand/OrbisMark';
import { Dashboard } from '../dashboard/Dashboard';
import { loadWarning } from '../data/openMeteo';
import { loadWeather, type WeatherResult } from '../data/weather';
import { WeatherProvider } from '../features/forecast/context';
import { Hero } from '../features/forecast/Hero';
import { sample } from '../features/forecast/sample';
import { DEFAULT_PLACE, type Place } from '../data/geocoding';
import { PlaceList } from '../features/search/PlaceList';
import './app.css';
import './hud.css';
const INITIAL: WeatherResult = {
  weather: sample,
  source: { label: 'Beispieldaten', detail: 'lädt …' },
};

export function App() {
  const [city, setCity] = useState<Place>(DEFAULT_PLACE);
  const [data, setData] = useState<WeatherResult>(INITIAL);
  const [listOpen, setListOpen] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const location = { name: city.name, eyebrow: city.region || city.country, lat: city.lat, lng: city.lng };
    loadWeather(location, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        // DWD needs several seconds – don't hold up the rest of the forecast for it.
        loadWarning(location.lat, location.lng, { signal: controller.signal })
          .then((warning) => {
            if (controller.signal.aborted) return;
            setData((current) => ({
              ...current,
              weather: { ...current.weather, current: { ...current.weather.current, warning } },
            }));
          })
          .catch(() => { /* no warning is a valid result */ });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setData({
          weather: { ...sample, place: { name: city.name, eyebrow: city.region || city.country, lat: city.lat, lng: city.lng } },
          source: { label: 'Beispieldaten', detail: error instanceof Error ? error.message : 'Fehler' },
        });
      });
    return () => controller.abort();
  }, [city]);

  return (
    <WeatherProvider value={data.weather}>
      <div class="app">
        <div class="wx-hud" data-main={listOpen ? 'open' : 'closed'}>
          <div class="wx-hud-main" {...(listOpen ? {} : ({ inert: '' } as object))}>
            <aside class="wx-hudm" aria-label="Orbis Wetter">
              <header class="wx-hudm-head">
                <h1>
                  <OrbisMark size={32} variant="small" />
                  Orbis Wetter
                </h1>
                <button type="button" class="wx-hud-rbtn" aria-label="Menü ausblenden" onClick={() => setListOpen(false)}>
                  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
                    <path d="M4.5 3.5h11A1.5 1.5 0 0 1 17 5v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15V5a1.5 1.5 0 0 1 1.5-1.5zM8 3.5v13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
                  </svg>
                </button>
              </header>
              <PlaceList onSelect={setCity} />
            </aside>
          </div>
          <div class="wx-hud-mini" aria-label="Orbis Wetter">
            <h1>
              <OrbisMark size={28} variant="small" />
              Orbis Wetter
            </h1>
            <button type="button" class="wx-hud-rbtn" aria-label="Menü einblenden" onClick={() => setListOpen(true)}>
              <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
                <path d="M4.5 3.5h11A1.5 1.5 0 0 1 17 5v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15V5a1.5 1.5 0 0 1 1.5-1.5zM8 3.5v13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <Hero place={data.weather.place} current={data.weather.current} source={data.source} />
        <Dashboard />
      </div>
    </WeatherProvider>
  );
}
