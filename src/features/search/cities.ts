/** Fixed city list. Coordinates come from orbis-karten's ALL_CITIES dataset; the search itself stays offline. */
export interface City {
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  { name: 'Bad Kleinen', region: 'Mecklenburg-Vorpommern', lat: 53.75, lng: 11.47 },
  { name: 'Berlin', region: 'Berlin', lat: 52.52, lng: 13.41 },
  { name: 'Hamburg', region: 'Hamburg', lat: 53.55, lng: 9.99 },
  { name: 'München', region: 'Bayern', lat: 48.14, lng: 11.58 },
  { name: 'Köln', region: 'Nordrhein-Westfalen', lat: 50.94, lng: 6.96 },
  { name: 'Frankfurt am Main', region: 'Hessen', lat: 50.11, lng: 8.68 },
  { name: 'Stuttgart', region: 'Baden-Württemberg', lat: 48.78, lng: 9.18 },
  { name: 'Düsseldorf', region: 'Nordrhein-Westfalen', lat: 51.23, lng: 6.78 },
  { name: 'Leipzig', region: 'Sachsen', lat: 51.34, lng: 12.37 },
  { name: 'Dresden', region: 'Sachsen', lat: 51.05, lng: 13.74 },
  { name: 'Hannover', region: 'Niedersachsen', lat: 52.37, lng: 9.73 },
  { name: 'Nürnberg', region: 'Bayern', lat: 49.45, lng: 11.08 },
  { name: 'Bremen', region: 'Bremen', lat: 53.08, lng: 8.8 },
  { name: 'Kiel', region: 'Schleswig-Holstein', lat: 54.32, lng: 10.14 },
  { name: 'Lübeck', region: 'Schleswig-Holstein', lat: 53.87, lng: 10.68 },
  { name: 'Rostock', region: 'Mecklenburg-Vorpommern', lat: 54.09, lng: 12.14 },
  { name: 'Schwerin', region: 'Mecklenburg-Vorpommern', lat: 53.63, lng: 11.41 },
  { name: 'Magdeburg', region: 'Sachsen-Anhalt', lat: 52.13, lng: 11.63 },
  { name: 'Erfurt', region: 'Thüringen', lat: 50.98, lng: 11.03 },
  { name: 'Kassel', region: 'Hessen', lat: 51.31, lng: 9.48 },
  { name: 'Freiburg im Breisgau', region: 'Baden-Württemberg', lat: 47.99, lng: 7.85 },
  { name: 'Karlsruhe', region: 'Baden-Württemberg', lat: 49.01, lng: 8.4 },
  { name: 'Mannheim', region: 'Baden-Württemberg', lat: 49.49, lng: 8.47 },
  { name: 'Augsburg', region: 'Bayern', lat: 48.37, lng: 10.9 },
  { name: 'Bielefeld', region: 'Nordrhein-Westfalen', lat: 52.03, lng: 8.53 },
  { name: 'Bonn', region: 'Nordrhein-Westfalen', lat: 50.74, lng: 7.1 },
  { name: 'Münster', region: 'Nordrhein-Westfalen', lat: 51.96, lng: 7.63 },
  { name: 'Osnabrück', region: 'Niedersachsen', lat: 52.28, lng: 8.05 },
  { name: 'Oldenburg', region: 'Niedersachsen', lat: 53.14, lng: 8.21 },
  { name: 'Flensburg', region: 'Schleswig-Holstein', lat: 54.79, lng: 9.43 },
  { name: 'Odense', region: 'Dänemark', lat: 55.4, lng: 10.39 },
  { name: 'Kopenhagen', region: 'Dänemark', lat: 55.68, lng: 12.57 },
  { name: 'Stettin', region: 'Polen', lat: 53.43, lng: 14.55 },
  { name: 'Warschau', region: 'Polen', lat: 52.23, lng: 21.01 },
  { name: 'Amsterdam', region: 'Niederlande', lat: 52.37, lng: 4.9 },
  { name: 'Wien', region: 'Österreich', lat: 48.21, lng: 16.37 },
  { name: 'Zürich', region: 'Schweiz', lat: 47.37, lng: 8.54 },
  { name: 'Paris', region: 'Frankreich', lat: 48.86, lng: 2.35 },
  { name: 'London', region: 'Vereinigtes Königreich', lat: 51.51, lng: -0.13 },
];

/** Case- and umlaut-insensitive so "Munchen" still finds "München". */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ß', 'ss')
    .trim();
}

/** Prefix matches first, then contains matches; capped so the dropdown stays compact. */
export function filterCities(query: string, cities: City[] = CITIES, limit = 8): City[] {
  const needle = normalize(query);
  if (!needle) return cities.slice(0, limit);
  const scored = cities
    .map((city, index) => {
      const name = normalize(city.name);
      const region = normalize(city.region);
      const score = name.startsWith(needle) ? 0
        : region.startsWith(needle) ? 1
        : name.includes(needle) ? 2
        : region.includes(needle) ? 3
        : -1;
      return { city, index, score };
    })
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score || a.index - b.index);
  return scored.slice(0, limit).map((entry) => entry.city);
}
