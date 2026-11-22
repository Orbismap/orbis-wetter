import { OrbisMark } from '../ui/brand/OrbisMark';
import { Dashboard } from '../dashboard/Dashboard';
import { defaultLayouts } from '../dashboard/defaultLayout';
import { listPresets } from '../dashboard/presets';
import { layoutStore, useLayout } from '../dashboard/store';
import './app.css';

/** App shell around the widget grid. The preset picker exists to demonstrate alternative grid sizes. */
export function App() {
  const layout = useLayout();
  return (
    <div class="app">
      <header class="app-header">
        <div class="brand">
          <OrbisMark size={26} />
          <span>Wetter</span>
        </div>
        <div class="header-right">
          <span class="header-hint">Widget-Grid · {layout.placements.length} Widgets</span>
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
      <Dashboard />
    </div>
  );
}
