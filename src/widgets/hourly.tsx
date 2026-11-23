import { useWeather } from '../features/forecast/context';
import { HourlyBanner } from '../features/forecast/HourlyBanner';
import type { WidgetDefinition } from './types';

function HourlyWidget() {
  const { current, hourly } = useWeather();
  return <HourlyBanner summary={current.summary} hours={hourly} />;
}

export const hourlyWidget: WidgetDefinition = {
  id: 'hourly',
  title: 'Nächste Stunden',
  variants: [
    { name: '4x1', w: 4, h: 1 },
    { name: '6x1', w: 6, h: 1 },
    { name: '8x1', w: 8, h: 1 },
    { name: '3x1', w: 3, h: 1 },
    { name: '2x1', w: 2, h: 1 },
  ],
  Component: HourlyWidget,
};
