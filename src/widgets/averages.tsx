import { useWeather } from '../features/forecast/context';
import { AveragesCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function AveragesWidget() {
  return <AveragesCard averages={useWeather().current.averages} />;
}

export const averagesWidget: WidgetDefinition = { id: 'averages', title: 'Durchschnittswerte', variants: detailVariants, Component: AveragesWidget };
