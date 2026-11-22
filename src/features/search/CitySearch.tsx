import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { filterCities, type City } from './cities';
import './search.css';

/** UI-only location search: suggestions come from a fixed list and selecting one changes the place name. */
export function CitySearch({ onSelect }: { onSelect: (city: City) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const results = filterCities(query);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const choose = (city: City) => {
    setQuery(city.name);
    setOpen(false);
    setActive(0);
    onSelect(city);
  };

  const onKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => results.length ? (index + 1) % results.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => results.length ? (index - 1 + results.length) % results.length : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (open && results[active]) choose(results[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div class="city-search" ref={root}>
      <div class="city-search-field">
        <svg class="city-search-icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6" />
          <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          class="city-search-input"
          type="text"
          role="combobox"
          aria-label="Ort suchen"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="city-search-results"
          placeholder="Ort suchen…"
          value={query}
          onFocus={() => setOpen(true)}
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            class="city-search-clear"
            aria-label="Suche löschen"
            onClick={() => {
              setQuery('');
              setActive(0);
              setOpen(true);
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul class="city-search-results" id="city-search-results" role="listbox">
          {results.length === 0 && <li class="city-search-empty">Kein Ort gefunden</li>}
          {results.map((city, index) => (
            <li key={`${city.name}-${city.region}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                class={index === active ? 'active' : ''}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(city)}
              >
                <span class="city-search-name">{city.name}</span>
                <span class="city-search-region">{city.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
