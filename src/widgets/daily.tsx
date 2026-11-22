import { useWeather } from '../features/forecast/context';
import { DailyForecast } from '../features/forecast/DailyForecast';
import type { WidgetDefinition } from './types';

function DailyWidget() {
  const { daily } = useWeather();
  return <DailyForecast days={daily} />;
}

export const dailyWidget: WidgetDefinition = {
  id: 'daily',
  title: '10-Tage-Vorhersage',
  variants: [
    { name: '2x3', w: 2, h: 3 },
    { name: '3x4', w: 3, h: 4 },
  ],
  Component: DailyWidget,
};
