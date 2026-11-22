import { OrbisMark } from '../ui/brand/OrbisMark';
import { Dashboard } from '../dashboard/Dashboard';
import { WeatherProvider } from '../features/forecast/context';
import { Hero } from '../features/forecast/Hero';
import { sample } from '../features/forecast/sample';
import './app.css';

export function App() {
  return (
    <WeatherProvider value={sample}>
      <div class="app">
        <div class="app-logo" aria-label="Orbis Wetter">
          <OrbisMark size={22} />
          <span>Wetter</span>
        </div>
        <Hero place={sample.place} current={sample.current} />
        <Dashboard />
      </div>
    </WeatherProvider>
  );
}
