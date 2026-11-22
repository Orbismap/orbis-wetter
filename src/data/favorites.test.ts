import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Place } from './geocoding';
import { isFavorite, loadFavorites, saveFavorites, toggleFavorite } from './favorites';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
});

const berlin: Place = { name: 'Berlin', region: 'Land Berlin', lat: 52.52, lng: 13.41, country: 'Deutschland' };

describe('favourite places', () => {
  beforeEach(() => storage.clear());

  it('starts empty and survives a broken storage entry', () => {
    expect(loadFavorites()).toEqual([]);
    storage.set('orbis-wetter:favorites', '{oops');
    expect(loadFavorites()).toEqual([]);
  });

  it('persists a place and finds it by coordinates', () => {
    saveFavorites([berlin]);
    expect(loadFavorites()).toEqual([berlin]);
    expect(isFavorite(loadFavorites(), { ...berlin, name: 'Berlin Mitte' })).toBe(true);
  });

  it('toggles the current place off and on', () => {
    const added = toggleFavorite([], berlin);
    expect(added).toEqual([berlin]);
    expect(toggleFavorite(added, berlin)).toEqual([]);
  });
});
