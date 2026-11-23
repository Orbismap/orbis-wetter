import { useWeather } from '../features/forecast/context';
import { MapCard } from '../features/forecast/MapCard';
import type { WidgetDefinition } from './types';

function MapWidget() {
  const { place, current } = useWeather();
  return (
    <MapCard
      windSpeed={current.windSpeed}
      placeName={place.name}
      lat={place.lat}
      lng={place.lng}
      temp={current.temp}
      precip={Number.parseFloat(current.precipitation) || 0}
      code={current.code}
    />
  );
}

export const mapWidget: WidgetDefinition = {
  // Kept as "windmap" so saved layouts (orbis.wetter.layout.v1) keep resolving.
  id: 'windmap',
  title: 'Wetterkarte',
  variants: [
    { name: '2x2', w: 2, h: 2 },
    { name: '3x2', w: 3, h: 2 },
    { name: '3x3', w: 3, h: 3 },
    { name: '4x3', w: 4, h: 3 },
  ],
  Component: MapWidget,
};
