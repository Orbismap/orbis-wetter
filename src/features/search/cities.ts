/** Fixed city list for the UI-only search. No geocoding API – selecting a city only changes the place name. */
export interface City {
  name: string;
  region: string;
}

export const CITIES: City[] = [
  { name: 'Bad Kleinen', region: 'Mecklenburg-Vorpommern' },
  { name: 'Berlin', region: 'Berlin' },
  { name: 'Hamburg', region: 'Hamburg' },
  { name: 'München', region: 'Bayern' },
  { name: 'Köln', region: 'Nordrhein-Westfalen' },
  { name: 'Frankfurt am Main', region: 'Hessen' },
  { name: 'Stuttgart', region: 'Baden-Württemberg' },
  { name: 'Düsseldorf', region: 'Nordrhein-Westfalen' },
  { name: 'Leipzig', region: 'Sachsen' },
  { name: 'Dresden', region: 'Sachsen' },
  { name: 'Hannover', region: 'Niedersachsen' },
  { name: 'Nürnberg', region: 'Bayern' },
  { name: 'Bremen', region: 'Bremen' },
  { name: 'Kiel', region: 'Schleswig-Holstein' },
  { name: 'Lübeck', region: 'Schleswig-Holstein' },
  { name: 'Rostock', region: 'Mecklenburg-Vorpommern' },
  { name: 'Schwerin', region: 'Mecklenburg-Vorpommern' },
  { name: 'Magdeburg', region: 'Sachsen-Anhalt' },
  { name: 'Erfurt', region: 'Thüringen' },
  { name: 'Kassel', region: 'Hessen' },
  { name: 'Freiburg im Breisgau', region: 'Baden-Württemberg' },
  { name: 'Karlsruhe', region: 'Baden-Württemberg' },
  { name: 'Mannheim', region: 'Baden-Württemberg' },
  { name: 'Augsburg', region: 'Bayern' },
  { name: 'Bielefeld', region: 'Nordrhein-Westfalen' },
  { name: 'Bonn', region: 'Nordrhein-Westfalen' },
  { name: 'Münster', region: 'Nordrhein-Westfalen' },
  { name: 'Osnabrück', region: 'Niedersachsen' },
  { name: 'Oldenburg', region: 'Niedersachsen' },
  { name: 'Flensburg', region: 'Schleswig-Holstein' },
  { name: 'Odense', region: 'Dänemark' },
  { name: 'Kopenhagen', region: 'Dänemark' },
  { name: 'Stettin', region: 'Polen' },
  { name: 'Warschau', region: 'Polen' },
  { name: 'Amsterdam', region: 'Niederlande' },
  { name: 'Wien', region: 'Österreich' },
  { name: 'Zürich', region: 'Schweiz' },
  { name: 'Paris', region: 'Frankreich' },
  { name: 'London', region: 'Vereinigtes Königreich' },
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
