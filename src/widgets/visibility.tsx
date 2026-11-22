import { useWeather } from '../features/forecast/context';
import { VisibilityCard } from '../features/forecast/Cards';
import type { WidgetDefinition } from './types';
import { detailVariants } from './variants';

function VisibilityWidget() {
  const { visibility, visibilityNote } = useWeather().current;
  return <VisibilityCard visibility={visibility} visibilityNote={visibilityNote} />;
}

export const visibilityWidget: WidgetDefinition = { id: 'visibility', title: 'Sichtweite', variants: detailVariants, Component: VisibilityWidget };
