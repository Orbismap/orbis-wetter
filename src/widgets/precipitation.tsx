import { useWeather } from '../features/forecast/context';
import { PrecipCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function PrecipitationWidget() {
  const { precipitation, precipitationPeriod, precipitationNote } = useWeather().current;
  return <PrecipCard precipitation={precipitation} precipitationPeriod={precipitationPeriod} precipitationNote={precipitationNote} />;
}

export const precipitationWidget: WidgetDefinition = {
  id: 'precip',
  title: 'Niederschlag',
  variants: detailVariants,
  Component: PrecipitationWidget,
};
