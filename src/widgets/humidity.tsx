import { useWeather } from '../features/forecast/context';
import { HumidityCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function HumidityWidget() {
  const { humidity, dewPoint } = useWeather().current;
  return <HumidityCard humidity={humidity} dewPoint={dewPoint} />;
}

export const humidityWidget: WidgetDefinition = { id: 'humidity', title: 'Feuchtigkeit', variants: detailVariants, Component: HumidityWidget };
