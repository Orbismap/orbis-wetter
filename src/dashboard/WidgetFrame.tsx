import type { CSSProperties } from 'preact';
import { getWidget } from '../widgets/registry';
import { useEditing } from './editStore';
import { placementRect, sizeLabel } from './geometry';
import { getPreset } from './presets';
import { layoutStore, useLayout } from './store';
import type { CellMetrics, Placement } from './types';
import { useDrag } from './useDrag';

/** Renders one placed widget at its computed pixel position inside the grid. */
export function WidgetFrame({ placement, metrics }: { placement: Placement; metrics: CellMetrics }) {
  const editing = useEditing();
  const layout = useLayout();
  const { dragging, dragProps } = useDrag(placement, metrics, editing);
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

  const resizeTo = (w: number, h: number) => {
    layoutStore.resizeTo(placement.id, w, h);
  };

  return (
    <section
      class={`card widget-frame${editing ? ' editing' : ''}${dragging ? ' dragging' : ''}`}
      style={style}
      {...dragProps}
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
      {editing && variants.length > 1 && (
        <div class="size-overlay">
          <div class="size-title">{title}</div>
          <div class="size-chips" role="group" aria-label={`Größe von ${title}`}>
            {variants.map((variant) => {
              const active = variant.w === placement.w && variant.h === placement.h;
              return (
                <button
                  type="button"
                  key={variant.name}
                  class={`size-chip${active ? ' active' : ''}`}
                  aria-pressed={active}
                  // The frame starts a drag on pointerdown – a chip must only resize.
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => resizeTo(variant.w, variant.h)}
                >
                  {variant.w}×{variant.h}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
