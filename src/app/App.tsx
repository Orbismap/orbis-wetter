import { useState } from 'preact/hooks';
import { OrbisMark } from '../ui/brand/OrbisMark';
import { Dashboard } from '../dashboard/Dashboard';
import { WeatherProvider } from '../features/forecast/context';
import { Hero } from '../features/forecast/Hero';
import { sample } from '../features/forecast/sample';
import { CitySearch } from '../features/search/CitySearch';
import type { City } from '../features/search/cities';
import './app.css';

export function App() {
  const [city, setCity] = useState<City | null>(null);
  // UI-only: selecting a city swaps the place info; all weather values stay sample data.
  const weather = city
    ? { ...sample, place: { name: city.name, eyebrow: city.region } }
    : sample;

  return (
    <WeatherProvider value={weather}>
      <div class="app">
        <div class="app-topbar">
          <div class="app-logo" aria-label="Orbis Wetter">
            <OrbisMark size={22} />
            <span>Wetter</span>
          </div>
          <CitySearch onSelect={setCity} />
        </div>
        <Hero place={weather.place} current={weather.current} />
        <Dashboard />
      </div>
    </WeatherProvider>
  );
}
