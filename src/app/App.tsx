import { useEffect, useState } from 'preact/hooks';
import { OrbisMark } from '../ui/brand/OrbisMark';
import { Dashboard } from '../dashboard/Dashboard';
import { loadWarning } from '../data/openMeteo';
import { loadWeather, type WeatherResult } from '../data/weather';
import { WeatherProvider } from '../features/forecast/context';
import { Hero } from '../features/forecast/Hero';
import { sample } from '../features/forecast/sample';
import { CitySearch } from '../features/search/CitySearch';
import { CITIES, type City } from '../features/search/cities';
import './app.css';

const DEFAULT_CITY = CITIES[0]!;
const INITIAL: WeatherResult = {
  weather: sample,
  source: { label: 'Beispieldaten', detail: 'lädt …' },
};

export function App() {
  const [city, setCity] = useState<City>(DEFAULT_CITY);
  const [data, setData] = useState<WeatherResult>(INITIAL);

  useEffect(() => {
    const controller = new AbortController();
    const location = { name: city.name, eyebrow: city.region, lat: city.lat, lng: city.lng };
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
          weather: { ...sample, place: { name: city.name, eyebrow: city.region } },
          source: { label: 'Beispieldaten', detail: error instanceof Error ? error.message : 'Fehler' },
        });
      });
    return () => controller.abort();
  }, [city]);

  return (
    <WeatherProvider value={data.weather}>
      <div class="app">
        <div class="app-topbar">
          <div class="app-logo" aria-label="Orbis Wetter">
            <OrbisMark size={22} />
            <span>Wetter</span>
          </div>
          <CitySearch onSelect={setCity} />
        </div>
        <Hero place={data.weather.place} current={data.weather.current} source={data.source} />
        <Dashboard />
      </div>
    </WeatherProvider>
  );
}
