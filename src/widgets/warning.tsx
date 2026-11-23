import { useWeather } from '../features/forecast/context';
import { NoWarningCard, WarningCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';

function WarningWidget() {
  const warning = useWeather().current.warning;
  return warning ? <WarningCard warning={warning} /> : <NoWarningCard />;
}

export const warningWidget: WidgetDefinition = {
  id: 'warning',
  title: 'Unwetterwarnung',
  variants: [
    { name: '2x1', w: 2, h: 1 },
    { name: '3x1', w: 3, h: 1 },
    { name: '2x2', w: 2, h: 2 },
    { name: '3x2', w: 3, h: 2 },
  ],
  Component: WarningWidget,
};
