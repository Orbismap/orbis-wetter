import { useWeather } from '../features/forecast/context';
import { WindMapCard } from '../features/forecast/WindMapCard';
import type { WidgetDefinition } from './types';

function WindMapWidget() {
  const { place, current } = useWeather();
  return <WindMapCard windSpeed={current.windSpeed} placeName={place.eyebrow} />;
}

export const windMapWidget: WidgetDefinition = {
  id: 'windmap',
  title: 'Windkarte',
  variants: [
    { name: '2x2', w: 2, h: 2 },
    { name: '3x3', w: 3, h: 3 },
  ],
  Component: WindMapWidget,
};
