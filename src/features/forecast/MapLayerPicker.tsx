import { useEffect, useRef, useState } from 'preact/hooks';
import type { WxMapMode } from '../handoff/modes';
import { rememberReturnTo } from '../handoff/contract';
import { MAP_MODES, MODE_TITLE } from './mapLayers';

/** Layer switcher for the compact map. The fullscreen handoff lives inside this menu. */
export function MapLayerPicker({
  mode,
  onChange,
  href,
}: {
  mode: WxMapMode;
  onChange: (mode: WxMapMode) => void;
  href: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div class="layer-picker" ref={root}>
      <button
        type="button"
        class="layer-toggle"
        aria-label="Kartenebene wählen"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M10 1.8 2 5.9l8 4.1 8-4.1-8-4.1Z" fill="currentColor" opacity="0.95" />
          <path d="m2 10 8 4.1 8-4.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="m2 14 8 4.1 8-4.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.6" />
        </svg>
      </button>
      {open && (
        <div class="layer-menu" role="menu" aria-label="Kartenebene">
          <div class="layer-menu-title">Ebene</div>
          {MAP_MODES.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitemradio"
              aria-checked={item === mode}
              class={`layer-item${item === mode ? ' active' : ''}`}
              onClick={() => { onChange(item); setOpen(false); }}
            >
              <span class="layer-swatch" data-mode={item} aria-hidden="true" />
              {MODE_TITLE[item]}
              {item === mode && <span class="layer-check" aria-hidden="true">✓</span>}
            </button>
          ))}
          <a class="layer-handoff" href={href} role="menuitem" onClick={rememberReturnTo}>
            Große Karte öffnen <span aria-hidden="true">⤢</span>
          </a>
        </div>
      )}
    </div>
  );
}
