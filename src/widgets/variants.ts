import type { WidgetVariant } from './types';

/** Sizes shared by the small detail widgets. Each widget may still declare its own set. */
export const detailVariants: WidgetVariant[] = [
  { name: '1x1', w: 1, h: 1 },
  { name: '2x1', w: 2, h: 1 },
  { name: '1x2', w: 1, h: 2 },
  { name: '2x2', w: 2, h: 2 },
];
