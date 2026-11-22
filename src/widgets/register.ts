import { registerWidget } from './registry';
import { airQualityWidget } from './airQuality';
import { averagesWidget } from './averages';
import { dailyWidget } from './daily';
import { feelsLikeWidget } from './feelsLike';
import { hourlyWidget } from './hourly';
import { humidityWidget } from './humidity';
import { moonWidget } from './moon';
import { precipitationWidget } from './precipitation';
import { pressureWidget } from './pressure';
import { sunWidget } from './sun';
import { uvWidget } from './uv';
import { visibilityWidget } from './visibility';
import { warningWidget } from './warning';
import { mapWidget } from './map';
import { windWidget } from './wind';
import type { WidgetDefinition } from './types';

const widgets: WidgetDefinition[] = [
  hourlyWidget,
  mapWidget,
  dailyWidget,
  airQualityWidget,
  windWidget,
  warningWidget,
  uvWidget,
  sunWidget,
  feelsLikeWidget,
  precipitationWidget,
  moonWidget,
  humidityWidget,
  visibilityWidget,
  pressureWidget,
  averagesWidget,
];

/** Register every widget definition. New widgets only need to be added to `widgets` above. */
export function registerWidgets(): void {
  widgets.forEach(registerWidget);
}
