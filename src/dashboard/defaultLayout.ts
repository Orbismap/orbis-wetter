import type { LayoutState, Placement } from './types';

const p = (id: string, widget: string, x: number, y: number, w: number, h: number): Placement => ({ id, widget, x, y, w, h });

/**
 * Default arrangements. They mirror the reference layout: the hourly strip is wide, the wind map is a
 * square, the 10-day card is tall, and the detail cards fill the remaining cells.
 */
export const defaultLayouts: Record<string, LayoutState> = {
  desktop: {
    preset: 'desktop',
    placements: [
      p('hourly', 'hourly', 0, 0, 4, 1),
      p('wind-map', 'windmap', 4, 0, 2, 2),
      p('daily', 'daily', 0, 1, 2, 3),
      p('air', 'air', 2, 1, 2, 1),
      p('wind', 'wind', 2, 2, 2, 1),
      p('warning', 'warning', 4, 2, 2, 1),
      p('uv', 'uv', 2, 3, 1, 1),
      p('sun', 'sun', 3, 3, 1, 1),
      p('feels', 'feels', 4, 3, 1, 1),
      p('precip', 'precip', 5, 3, 1, 1),
      p('moon', 'moon', 0, 4, 1, 1),
      p('humidity', 'humidity', 1, 4, 1, 1),
      p('visibility', 'visibility', 2, 4, 1, 1),
      p('pressure', 'pressure', 3, 4, 1, 1),
      p('averages', 'averages', 4, 4, 1, 1),
    ],
  },
  wide: {
    preset: 'wide',
    placements: [
      p('hourly', 'hourly', 0, 0, 6, 1),
      p('wind-map', 'windmap', 6, 0, 2, 2),
      p('daily', 'daily', 0, 1, 3, 4),
      p('air', 'air', 3, 1, 3, 1),
      p('wind', 'wind', 3, 2, 3, 1),
      p('warning', 'warning', 6, 2, 2, 1),
      p('uv', 'uv', 3, 3, 1, 1),
      p('sun', 'sun', 4, 3, 1, 1),
      p('feels', 'feels', 5, 3, 1, 1),
      p('precip', 'precip', 6, 3, 1, 1),
      p('moon', 'moon', 3, 4, 1, 1),
      p('humidity', 'humidity', 4, 4, 1, 1),
      p('visibility', 'visibility', 5, 4, 1, 1),
      p('pressure', 'pressure', 6, 4, 1, 1),
      p('averages', 'averages', 7, 4, 1, 1),
    ],
  },
};

export const defaultLayout = defaultLayouts.desktop!;
