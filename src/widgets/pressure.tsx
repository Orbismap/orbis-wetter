import { useWeather } from '../features/forecast/context';
import { PressureCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function PressureWidget() {
  const { pressure, pressureTrend } = useWeather().current;
  return <PressureCard pressure={pressure} pressureTrend={pressureTrend} />;
}

export const pressureWidget: WidgetDefinition = { id: 'pressure', title: 'Luftdruck', variants: detailVariants, Component: PressureWidget };
