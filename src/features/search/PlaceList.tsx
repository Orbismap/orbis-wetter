import { useEffect, useState } from 'preact/hooks';
import { loadFavorites, subscribeFavorites } from '../../data/favorites';
import type { Place } from '../../data/geocoding';
import { CitySearch } from './CitySearch';
import './placeList.css';

/** Scrollable content of the left sidebar: place search and saved favourites. */
export function PlaceList({ onSelect }: { onSelect: (place: Place) => void }) {
  const [favorites, setFavorites] = useState<Place[]>(() => loadFavorites());

  useEffect(() => subscribeFavorites(() => setFavorites(loadFavorites())), []);

  return (
    <div class="place-list">
      <CitySearch onSelect={onSelect} inlineFavorites shortcut />

      <div class="place-list-scroll">
        <h2 class="place-list-sect place-list-sect-first">Orte</h2>
        <ul class="place-list-rows" role="list" aria-label="Orte">
          <li>
            <div class="place-list-row">
              <span class="place-list-badge" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="17" height="17">
                  <path d="M5 3.5h10a1 1 0 0 1 1 1V17l-6-3.5L4 17V4.5a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                </svg>
              </span>
              <span>Gespeicherte Orte</span>
            </div>
          </li>
        </ul>

        <h2 class="place-list-sect">Favoriten</h2>
        {favorites.length === 0 ? (
          <p class="place-list-empty">Noch keine Favoriten. Stern neben dem Ort anklicken, um ihn zu speichern.</p>
        ) : (
          <ul class="place-list-rows" role="list" aria-label="Favoriten">
            {favorites.map((place) => (
              <li key={`${place.lat},${place.lng}`}>
                <button type="button" class="place-list-row" onClick={() => onSelect(place)}>
                  <span class="place-list-badge" aria-hidden="true">
                    <svg viewBox="0 0 20 20" width="17" height="17">
                      <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5" />
                      <circle cx="10" cy="10" r="2" fill="currentColor" />
                    </svg>
                  </span>
                  <span class="place-list-row-text">
                    <span>{place.name}</span>
                    {place.region && <small>{place.region}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
