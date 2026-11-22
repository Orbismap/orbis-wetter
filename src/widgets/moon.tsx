import { useWeather } from '../features/forecast/context';
import { MoonCard } from '../features/forecast/Cards';
import type { WidgetDefinition, WidgetRenderProps } from './types';

function MoonWidget({ placement }: WidgetRenderProps) {
  return <MoonCard moon={useWeather().current.moon} wide={placement.w > 1} />;
}

export const moonWidget: WidgetDefinition = {
  id: 'moon',
  title: 'Mond',
  variants: [
    { name: '1x1', w: 1, h: 1 },
    { name: '2x1', w: 2, h: 1 },
  ],
  Component: MoonWidget,
};
