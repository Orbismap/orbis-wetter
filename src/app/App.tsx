import { OrbisMark } from '../ui/brand/OrbisMark';
import { Dashboard } from '../dashboard/Dashboard';
import { defaultLayouts } from '../dashboard/defaultLayout';
import { editStore, useEditing } from '../dashboard/editStore';
import { listPresets } from '../dashboard/presets';
import { layoutStore, useLayout } from '../dashboard/store';
import { WeatherProvider } from '../features/forecast/context';
import { Hero } from '../features/forecast/Hero';
import { sample } from '../features/forecast/sample';
import './app.css';

/** App shell: location hero above the widget grid. The preset picker demonstrates alternative grid sizes. */
export function App() {
  const layout = useLayout();
  const editing = useEditing();
  return (
    <WeatherProvider value={sample}>
      <div class="app">
        <header class="app-header">
          <div class="brand">
            <OrbisMark size={26} />
            <span>Wetter</span>
          </div>
          <div class="header-right">
            <span class="header-hint">Widget-Grid · {layout.placements.length} Widgets</span>
            {editing && <span class="edit-hint">Ziehen zum Verschieben</span>}
            <button type="button" class={`edit-toggle${editing ? ' active' : ''}`} onClick={editStore.toggle}>
              {editing ? 'Fertig' : 'Anordnen'}
            </button>
            {editing && (
              <button
                type="button"
                class="edit-reset"
                onClick={() => layoutStore.setLayout(defaultLayouts[layout.preset] ?? defaultLayouts.desktop!)}
              >
                Zurücksetzen
              </button>
            )}
            <label class="preset-picker">
              Raster
              <select
                value={layout.preset}
                onChange={(event) => {
                  const id = (event.currentTarget as HTMLSelectElement).value;
                  const next = defaultLayouts[id];
                  if (next) layoutStore.setLayout(next);
                }}
              >
                {listPresets().map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.label}</option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <Hero place={sample.place} current={sample.current} />
        <Dashboard />
      </div>
    </WeatherProvider>
  );
}
