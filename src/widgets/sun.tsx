import { useWeather } from '../features/forecast/context';
import { SunCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function SunWidget() {
  const { sunrise, sunset } = useWeather().current;
  return <SunCard sunrise={sunrise} sunset={sunset} />;
}

export const sunWidget: WidgetDefinition = { id: 'sun', title: 'Sonnenuntergang', variants: detailVariants, Component: SunWidget };
