import type { WidgetRenderProps } from './types';

/**
 * Temporary content for every widget. Real widgets replace this file one by one; the grid system
 * around them does not change.
 */
export function PlaceholderContent({ placement, title, size, editing }: WidgetRenderProps) {
  return (
    <div class="placeholder">
      <div class="card-title"><span class="title-text">{title}</span></div>
      <div class="placeholder-title">{title}</div>
      <div class="placeholder-meta">
        <span class="badge">{size.w} × {size.h}</span>
        <span class="badge muted">@ {placement.x},{placement.y}</span>
      </div>
      <div class="placeholder-note">Platzhalter · Widget folgt</div>
      {editing && <div class="placeholder-edit">Bearbeitungsmodus</div>}
    </div>
  );
}
