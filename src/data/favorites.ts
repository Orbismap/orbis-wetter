/** Favourite places, stored locally. The star next to the place name toggles the current one. */
import type { Place } from './geocoding';

const KEY = 'orbis-wetter:favorites';

/** Listeners are notified after a write so the search field and the favorites list stay in sync. */
const listeners = new Set<() => void>();
export function subscribeFavorites(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function loadFavorites(): Place[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is Place =>
      !!entry && typeof entry.name === 'string'
      && typeof entry.lat === 'number' && Number.isFinite(entry.lat)
      && typeof entry.lng === 'number' && Number.isFinite(entry.lng));
  } catch {
    return [];
  }
}

export function saveFavorites(places: Place[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(places));
  } catch {
    // Private mode / blocked storage: favourites stay in memory for this session.
  }
  listeners.forEach((listener) => listener());
}

const samePlace = (a: Place, b: Place): boolean =>
  Math.abs(a.lat - b.lat) < 0.001 && Math.abs(a.lng - b.lng) < 0.001;

export function isFavorite(places: Place[], place: Place): boolean {
  return places.some((entry) => samePlace(entry, place));
}

/** Adds the place (with its label) or removes it, keeping the existing order. */
export function toggleFavorite(places: Place[], place: Place): Place[] {
  if (isFavorite(places, place)) return places.filter((entry) => !samePlace(entry, place));
  return [...places, { ...place }];
}
