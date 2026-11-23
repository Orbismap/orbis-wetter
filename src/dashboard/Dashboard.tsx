import type { CSSProperties } from 'preact';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { useDragPreview } from './dragPreview';
import { editStore, useEditing } from './editStore';
import { playFlip } from './flip';
import { cellMetrics, placementRect, usedRows } from './geometry';
import { getPreset } from './presets';
import { layoutStore, useLayout } from './store';
import { WidgetFrame } from './WidgetFrame';
import { useMobileCanvasWidth } from './viewport';
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
  // Cards wiggle only until the pointer has moved a little after edit mode started.
  const [wiggle, setWiggle] = useState(true);
  useEffect(() => {
    if (!editing) return undefined;
    setWiggle(true);
    let base: { x: number; y: number } | null = null;
    const onMove = (event: PointerEvent) => {
      if (!base) { base = { x: event.clientX, y: event.clientY }; return; }
      if (Math.hypot(event.clientX - base.x, event.clientY - base.y) > 16) setWiggle(false);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [editing]);
  useLayoutEffect(playFlip);
  const mobileWidth = useMobileCanvasWidth();
  const basePreset = getPreset(layout.preset);
  // The phone grid always spans the screen; desktop presets keep their fixed canvas.
  // The canvas is only as tall as its content; while arranging there is always one spare row to drop widgets into.
  const rows = Math.min(basePreset.maxRows ?? basePreset.rows, Math.max(1, usedRows(layout.placements) + (editing ? 1 : 0)));
  const preset = { ...basePreset, rows, ...(basePreset.id === 'mobile' ? { width: mobileWidth } : {}) };
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
    <div class="dashboard-wrap" data-preset={preset.id}>
      <div class="dashboard-shell">
        <div class={`dashboard${editing ? ' editing' : ''}${editing && wiggle ? ' wiggle' : ''}`} style={style}>
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
        {editing && (
          <div class="edit-controls">
            <button type="button" class="edit-toggle active" onClick={editStore.toggle}>Fertig</button>
            <span class="edit-hint">Ziehen zum Verschieben · Ränder und Ecken ändern die Größe</span>
            <button type="button" class="reset-toggle" onClick={() => layoutStore.reset()}>Zurücksetzen</button>
          </div>
        )}
      </div>
    </div>
  );
}
