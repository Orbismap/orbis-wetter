/** Real place search via Open-Meteo Geocoding (keyless, CORS enabled). */
import { API } from './endpoints';
import { cached, fetchJson, type FetchOptions } from './http';

export interface Place {
  name: string;
  region: string;
  lat: number;
  lng: number;
  country: string;
}

/** Start location – the rest comes from the geocoding API. */
export const DEFAULT_PLACE: Place = {
  name: 'Bad Kleinen',
  region: 'Mecklenburg-Vorpommern, Deutschland',
  lat: 53.75,
  lng: 11.47,
  country: 'Deutschland',
};

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}
interface GeoResponse { results?: GeoResult[] }

export function searchPlaces(query: string, options: FetchOptions = {}): Promise<Place[]> {
  const name = query.trim();
  if (name.length < 2) return Promise.resolve([]);
  const url = new URL(API.geocoding);
  url.search = new URLSearchParams({ name, count: '8', language: 'de', format: 'json' }).toString();
  return cached(`geo:${name.toLowerCase()}`, 24 * 3_600_000, async () => {
    const data = await fetchJson<GeoResponse>(url.toString(), { ...options, timeout: 10_000 });
    return (data.results ?? []).map((result) => ({
      name: result.name,
      region: [result.admin1, result.country].filter(Boolean).join(', '),
      lat: result.latitude,
      lng: result.longitude,
      country: result.country ?? '',
    }));
  });
}
