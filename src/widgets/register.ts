import { defaultLayouts } from '../dashboard/defaultLayout';
import { PlaceholderContent } from './placeholder';
import { registerWidget } from './registry';
import type { WidgetVariant } from './types';

/** Sizes a placeholder declares. Real widgets declare only the sizes they actually support. */
const commonVariants: WidgetVariant[] = [
  { name: '1x1', w: 1, h: 1 },
  { name: '1x2', w: 1, h: 2 },
  { name: '2x1', w: 2, h: 1 },
  { name: '2x2', w: 2, h: 2 },
  { name: '2x3', w: 2, h: 3 },
  { name: '3x1', w: 3, h: 1 },
  { name: '3x2', w: 3, h: 2 },
  { name: '3x4', w: 3, h: 4 },
  { name: '4x1', w: 4, h: 1 },
  { name: '6x1', w: 6, h: 1 },
];

const titles: Record<string, string> = {
  hourly: 'Nächste Stunden',
  windmap: 'Windkarte',
  daily: '10-Tage-Vorhersage',
  air: 'Luftqualität',
  wind: 'Wind',
  warning: 'Unwetterwarnung',
  uv: 'UV-Index',
  sun: 'Sonnenuntergang',
  feels: 'Gefühlte Temperatur',
  precip: 'Niederschlag',
  moon: 'Zunehmender Mond',
  humidity: 'Feuchtigkeit',
  visibility: 'Sichtweite',
  pressure: 'Luftdruck',
  averages: 'Durchschnittswerte',
};

/** Register all widget definitions. Currently every widget is a placeholder. */
export function registerWidgets(): void {
  const ids = new Set(
    Object.values(defaultLayouts).flatMap((layout) => layout.placements.map((p) => p.widget)),
  );
  for (const id of ids) {
    registerWidget({
      id,
      title: titles[id] ?? id,
      variants: commonVariants,
      Component: PlaceholderContent,
    });
  }
}
