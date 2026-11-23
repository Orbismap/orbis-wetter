import { expect, test } from 'vitest';
import { defaultLayouts } from './defaultLayout';
import { LayoutStore } from './store';
test('hoverSwap: an impossible target reverts a previous preview', () => {
  const s = new LayoutStore(defaultLayouts.desktop!);
  const before = JSON.stringify(s.getState().placements);
  s.beginGesture();
  expect(s.hoverSwap('daily', 2, 1)).toBe(true);
  expect(s.hoverSwap('daily', 5, 4)).toBe(false); // impossible target reverts
  expect(JSON.stringify(s.getState().placements)).toBe(before);
});
