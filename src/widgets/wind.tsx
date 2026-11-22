import { useWeather } from '../features/forecast/context';
import { WindCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';

function WindWidget() {
  const { current } = useWeather();
  return (
    <WindCard
      windSpeed={current.windSpeed}
      windGust={current.windGust}
      windDirection={current.windDirection}
      windLabel={current.windLabel}
    />
  );
}

export const windWidget: WidgetDefinition = {
  id: 'wind',
  title: 'Wind',
  variants: [
    { name: '2x1', w: 2, h: 1 },
    { name: '3x1', w: 3, h: 1 },
    { name: '2x2', w: 2, h: 2 },
  ],
  Component: WindWidget,
};
