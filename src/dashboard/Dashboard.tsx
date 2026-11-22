import type { CSSProperties } from 'preact';
import { cellMetrics } from './geometry';
import { getPreset } from './presets';
import { useLayout } from './store';
import { WidgetFrame } from './WidgetFrame';
import './dashboard.css';

/** The grid surface. Widgets are absolutely positioned from cell coordinates. */
export function Dashboard() {
  const layout = useLayout();
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
      <div class="dashboard" style={style}>
        {layout.placements.map((placement) => (
          <WidgetFrame key={placement.id} placement={placement} metrics={metrics} />
        ))}
      </div>
    </div>
  );
}
