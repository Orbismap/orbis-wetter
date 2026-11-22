import { useWeather } from '../features/forecast/context';
import { AirQualityCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';

function AirQualityWidget() {
  return <AirQualityCard air={useWeather().current.air} />;
}

export const airQualityWidget: WidgetDefinition = {
  id: 'air',
  title: 'Luftqualität',
  variants: [
    { name: '2x1', w: 2, h: 1 },
    { name: '3x1', w: 3, h: 1 },
    { name: '2x2', w: 2, h: 2 },
  ],
  Component: AirQualityWidget,
};
