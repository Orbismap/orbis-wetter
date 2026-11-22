import { useEffect, useState } from 'preact/hooks';
import type { SourceInfo } from '../../data/types';
import { isFavorite, loadFavorites, saveFavorites, toggleFavorite } from '../../data/favorites';
import type { Place } from '../../data/geocoding';
import type { WeatherNow } from './model';

const STAR = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26';

export function Hero({
  place,
  current,
  source,
}: Pick<WeatherNow, 'place' | 'current'> & { source?: SourceInfo }) {
  const [favorites, setFavorites] = useState<Place[]>(() => loadFavorites());
  useEffect(() => setFavorites(loadFavorites()), [place.name]);

  const favoritePlace: Place | undefined = place.lat !== undefined && place.lng !== undefined
    ? { name: place.name, region: place.eyebrow, lat: place.lat, lng: place.lng, country: '' }
    : undefined;
  const starred = favoritePlace ? isFavorite(favorites, favoritePlace) : false;

  const toggleStar = () => {
    if (!favoritePlace) return;
    const next = toggleFavorite(favorites, favoritePlace);
    setFavorites(next);
    saveFavorites(next);
  };

  return (
    <header class="hero">
      <div class="eyebrow">{place.eyebrow}</div>
      <div class="hero-title">
        <h1>{place.name}</h1>
        {favoritePlace && (
          <button
            type="button"
            class={`fav-star${starred ? ' active' : ''}`}
            aria-label={starred ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            aria-pressed={starred}
            title={starred ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            onClick={toggleStar}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <polygon points={STAR} />
            </svg>
          </button>
        )}
      </div>
      <div class="hero-temp">{current.temp}°</div>
      <div class="hero-feel">Gefühlt: {current.feelsLike}°</div>
      <div class="hero-hl">H: {current.high}° T: {current.low}°</div>
      {source && <div class="hero-source">Quelle: {source.label}{source.detail ? ` · ${source.detail}` : ''}</div>}
    </header>
  );
}
