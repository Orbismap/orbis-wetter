import type { CSSProperties } from 'preact';
import { getWidget } from '../widgets/registry';
import { placementRect, sizeLabel } from './geometry';
import type { CellMetrics, Placement } from './types';

/** Renders one placed widget at its computed pixel position inside the grid. */
export function WidgetFrame({ placement, metrics }: { placement: Placement; metrics: CellMetrics }) {
  const definition = getWidget(placement.widget);
  const rect = placementRect(placement, metrics);
  const style = {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    '--cell-x': String(placement.x),
    '--cell-y': String(placement.y),
    '--cell-w': String(placement.w),
    '--cell-h': String(placement.h),
  } as CSSProperties;

  const title = definition?.title ?? placement.widget;
  const Component = definition?.Component;
  const size = { w: placement.w, h: placement.h };

  return (
    <section
      class="card widget-frame"
      style={style}
      data-widget={placement.widget}
      data-size={sizeLabel(placement.w, placement.h)}
      aria-label={title}
    >
      {Component ? (
        <Component placement={placement} title={title} size={size} editing={false} />
      ) : (
        <div class="placeholder">
          <div class="placeholder-title">Unbekanntes Widget</div>
          <div class="placeholder-note">{placement.widget}</div>
        </div>
      )}
    </section>
  );
}
