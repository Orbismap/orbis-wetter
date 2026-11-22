import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { searchPlaces, type Place } from '../../data/geocoding';
import './search.css';

/** Real place search (Open-Meteo Geocoding) with debounce, keyboard control and abortable requests. */
export function CitySearch({ onSelect }: { onSelect: (place: Place) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Use the browser's find shortcut for place search instead.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const name = query.trim();
    if (name.length < 2) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const timer = setTimeout(() => {
      searchPlaces(name, { signal: controller.signal })
        .then((places) => {
          if (controller.signal.aborted) return;
          setResults(places);
          setActive(0);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResults([]);
          setError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

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

  const choose = (place: Place) => {
    setQuery(place.name);
    setResults([]);
    setOpen(false);
    setActive(0);
    onSelect(place);
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

  const showResults = open && query.trim().length >= 2;

  return (
    <div class="city-search" ref={root}>
      <div class="city-search-field">
        <svg class="city-search-icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6" />
          <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          ref={input}
          class="city-search-input"
          type="text"
          role="combobox"
          aria-label="Ort suchen"
          aria-expanded={showResults}
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
              setResults([]);
              setActive(0);
              setOpen(true);
            }}
          >
            ×
          </button>
        )}
      </div>

      {showResults && (
        <ul class="city-search-results" id="city-search-results" role="listbox">
          {loading && <li class="city-search-empty">Suche läuft …</li>}
          {!loading && error && <li class="city-search-empty">Orte konnten nicht geladen werden</li>}
          {!loading && !error && results.length === 0 && <li class="city-search-empty">Kein Ort gefunden</li>}
          {!loading && results.map((place, index) => (
            <li key={`${place.name}-${place.lat}-${place.lng}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                class={index === active ? 'active' : ''}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(place)}
              >
                <span class="city-search-name">{place.name}</span>
                <span class="city-search-region">{place.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
