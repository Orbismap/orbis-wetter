import { useWeather } from '../features/forecast/context';
import { MoonCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function MoonWidget() {
  return <MoonCard moon={useWeather().current.moon} />;
}

export const moonWidget: WidgetDefinition = { id: 'moon', title: 'Mond', variants: detailVariants, Component: MoonWidget };
