import type { CSSProperties } from 'preact';
import { useLayoutEffect } from 'preact/hooks';
import { useDragPreview } from './dragPreview';
import { defaultLayouts } from './defaultLayout';
import { editStore, useEditing } from './editStore';
import { playFlip } from './flip';
import { cellMetrics, placementRect } from './geometry';
import { getPreset } from './presets';
import { layoutStore, useLayout } from './store';
import { WidgetFrame } from './WidgetFrame';
import './dashboard.css';

const outlineStyle = (
  rect: { x: number; y: number; w: number; h: number },
  metrics: ReturnType<typeof cellMetrics>,
): CSSProperties => {
  const box = placementRect(rect, metrics);
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  } as CSSProperties;
};

/** The grid surface. Widgets are absolutely positioned from cell coordinates. */
export function Dashboard() {
  const layout = useLayout();
  const editing = useEditing();
  const preview = useDragPreview();
  useLayoutEffect(playFlip);
  const preset = getPreset(layout.preset);
  const metrics = cellMetrics(preset);
  const style = {
    width: `${metrics.width}px`,
    height: `${metrics.height}px`,
    '--cols': String(preset.cols),
    '--rows': String(preset.rows),
    '--step-x': `${metrics.stepX}px`,
    '--step-y': `${metrics.stepY}px`,
  } as CSSProperties;

  return (
    <div class="dashboard-wrap">
      <div class="dashboard-shell">
        <div class={`dashboard${editing ? ' editing' : ''}`} style={style}>
          {layout.placements.map((placement) => (
            <WidgetFrame key={placement.id} placement={placement} metrics={metrics} />
          ))}
          {preview.origin && (
            <div class="swap-outline swap-origin" style={outlineStyle(preview.origin, metrics)} aria-hidden="true" />
          )}
          {preview.target && (
            <div class="swap-outline swap-target" style={outlineStyle(preview.target, metrics)} aria-hidden="true" />
          )}
        </div>
        <div class="edit-controls">
          <button type="button" class={`edit-toggle${editing ? ' active' : ''}`} onClick={editStore.toggle}>
            {editing ? 'Fertig' : 'Anordnen'}
          </button>
          {editing && (
            <button
              type="button"
              class="reset-toggle"
              onClick={() => layoutStore.setLayout(defaultLayouts[layout.preset] ?? defaultLayouts.desktop!)}
            >
              Zurücksetzen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
