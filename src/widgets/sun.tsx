import { useWeather } from '../features/forecast/context';
import { SunCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function SunWidget() {
  const { sunrise, sunset, sunUp, sunPhase } = useWeather().current;
  return <SunCard sunrise={sunrise} sunset={sunset} sunUp={sunUp} sunPhase={sunPhase} />;
}

export const sunWidget: WidgetDefinition = { id: 'sun', title: 'Sonne', variants: detailVariants, Component: SunWidget };
