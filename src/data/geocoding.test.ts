import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http', () => ({
  fetchJson: vi.fn(),
  // Real cache semantics aren't relevant here; each call should reach the mocked fetch.
  cached: (_key: string, _ttl: number, load: () => Promise<unknown>) => load(),
}));

import { fetchJson } from './http';
import { searchPlaces } from './geocoding';

describe('place search', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not call the API for very short queries', async () => {
    expect(await searchPlaces('B')).toEqual([]);
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it('maps geocoding results into places with a readable region', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      results: [
        { name: 'Berlin', latitude: 52.52, longitude: 13.41, admin1: 'Land Berlin', country: 'Deutschland' },
        { name: 'Berlin', latitude: 44.46, longitude: -71.18, admin1: 'New Hampshire', country: 'Vereinigte Staaten' },
      ],
    });
    const places = await searchPlaces('Berlin');
    expect(places).toHaveLength(2);
    expect(places[0]).toEqual({
      name: 'Berlin', region: 'Land Berlin, Deutschland', lat: 52.52, lng: 13.41, country: 'Deutschland',
    });
    const url = String(vi.mocked(fetchJson).mock.calls[0]![0]);
    expect(url).toContain('name=Berlin');
    expect(url).toContain('language=de');
  });

  it('returns an empty list when the API has no results', async () => {
    vi.mocked(fetchJson).mockResolvedValue({});
    expect(await searchPlaces('zzzznope')).toEqual([]);
  });
});
