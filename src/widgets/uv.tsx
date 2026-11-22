import { useWeather } from '../features/forecast/context';
import { UvCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function UvWidget() {
  const { uvIndex, uvLabel, uvNote } = useWeather().current;
  return <UvCard uvIndex={uvIndex} uvLabel={uvLabel} uvNote={uvNote} />;
}

export const uvWidget: WidgetDefinition = { id: 'uv', title: 'UV-Index', variants: detailVariants, Component: UvWidget };
