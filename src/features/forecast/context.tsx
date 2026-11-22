import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { WeatherNow } from './model';

const WeatherContext = createContext<WeatherNow | null>(null);

/** Provides the view model to all widgets. Swap `sample` for live data here later. */
export function WeatherProvider({ value, children }: { value: WeatherNow; children: ComponentChildren }) {
  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeather(): WeatherNow {
  const weather = useContext(WeatherContext);
  if (!weather) throw new Error('useWeather() must be used inside a WeatherProvider');
  return weather;
}
