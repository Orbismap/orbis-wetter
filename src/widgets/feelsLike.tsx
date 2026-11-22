import { useWeather } from '../features/forecast/context';
import { FeelsLikeCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function FeelsLikeWidget() {
  const { feelsLike, temp, feelsLikeNote } = useWeather().current;
  return <FeelsLikeCard feelsLike={feelsLike} temp={temp} feelsLikeNote={feelsLikeNote} />;
}

export const feelsLikeWidget: WidgetDefinition = {
  id: 'feels',
  title: 'Gefühlte Temperatur',
  variants: detailVariants,
  Component: FeelsLikeWidget,
};
