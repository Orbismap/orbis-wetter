import type { CSSProperties } from 'preact';
import { getWidget } from '../widgets/registry';
import { editStore, useEditing } from './editStore';
import { placementRect, sizeLabel } from './geometry';
import { getPreset } from './presets';
import { useLayout } from './store';
import type { CellMetrics, Placement } from './types';
import { useDrag } from './useDrag';
import { useLongPress } from './useLongPress';
import { HANDLES, useResize } from './useResize';

/** Renders one placed widget at its computed pixel position inside the grid. */
export function WidgetFrame({ placement, metrics }: { placement: Placement; metrics: CellMetrics }) {
  const editing = useEditing();
  const layout = useLayout();
  const { dragging, dragProps, beginDrag } = useDrag(placement, metrics, editing);
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
  const cols = getPreset(layout.preset).cols;
  const variants = (definition?.variants ?? []).filter((variant) => variant.w <= cols)
    .sort((a, b) => a.w * a.h - b.w * b.h || a.w - b.w);

  const sizes = variants.length > 0 ? variants.map(({ w, h }) => ({ w, h })) : [{ w: placement.w, h: placement.h }];
  const longPressProps = useLongPress((press) => {
    editStore.setEditing(true);
    // The pressed card sticks to the pointer right away, like picking up an icon on a home screen.
    beginDrag(press.element, press.pointerId, press.x, press.y, press.touch);
  }, !editing);
  const { resizing, handleProps } = useResize(placement, metrics, sizes, editing);

  return (
    <section
      class={`card widget-frame${editing ? ' editing' : ''}${dragging ? ' dragging' : ''}${resizing ? ' resizing' : ''}`}
      style={style}
      {...dragProps}
      {...longPressProps}
      data-widget={placement.widget}
      data-placement-id={placement.id}
      data-size={sizeLabel(placement.w, placement.h)}
      aria-label={title}
    >
      {Component ? (
        <Component placement={placement} title={title} size={size} editing={editing} />
      ) : (
        <div class="placeholder">
          <div class="placeholder-title">Unbekanntes Widget</div>
          <div class="placeholder-note">{placement.widget}</div>
        </div>
      )}
      {editing && (
        <>
          {variants.length > 1 && HANDLES.map((handle) => (
            <div
              key={handle}
              class={`resize-handle resize-${handle}${resizing === handle ? ' active' : ''}`}
              data-handle={handle}
              role="presentation"
              {...handleProps(handle)}
            />
          ))}
        </>
      )}
    </section>
  );
}
