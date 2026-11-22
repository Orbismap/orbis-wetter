import { describe, expect, it } from 'vitest';
import { defaultLayouts } from '../dashboard/defaultLayout';
import { registerWidgets } from './register';
import { listWidgets } from './registry';

registerWidgets();

describe('widget registry', () => {
  it('has a definition for every widget used in every layout', () => {
    const ids = new Set(listWidgets().map((widget) => widget.id));
    const used = new Set(
      Object.values(defaultLayouts).flatMap((layout) => layout.placements.map((p) => p.widget)),
    );
    expect([...used].every((id) => ids.has(id))).toBe(true);
  });

  it('every layout size is a declared variant of its widget', () => {
    const definitions = new Map(listWidgets().map((widget) => [widget.id, widget]));
    for (const layout of Object.values(defaultLayouts)) {
      for (const p of layout.placements) {
        const variants = definitions.get(p.widget)!.variants;
        expect(variants.some((v) => v.w === p.w && v.h === p.h), `${p.widget} ${p.w}x${p.h}`).toBe(true);
      }
    }
  });
});
