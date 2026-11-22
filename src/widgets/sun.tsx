import { useWeather } from '../features/forecast/context';
import { SunCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function SunWidget() {
  const { sunrise, sunset, sunUp, sunClock } = useWeather().current;
  return <SunCard sunrise={sunrise} sunset={sunset} sunUp={sunUp} sunClock={sunClock} />;
}

export const sunWidget: WidgetDefinition = { id: 'sun', title: 'Sonne', variants: detailVariants, Component: SunWidget };
