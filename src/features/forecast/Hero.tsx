import type { SourceInfo } from '../../data/types';
import type { WeatherNow } from './model';

export function Hero({
  place,
  current,
  source,
}: Pick<WeatherNow, 'place' | 'current'> & { source?: SourceInfo }) {
  return (
    <header class="hero">
      <div class="eyebrow">{place.eyebrow}</div>
      <h1>{place.name}</h1>
      <div class="hero-temp">{current.temp}°</div>
      <div class="hero-feel">Gefühlt: {current.feelsLike}°</div>
      <div class="hero-hl">H: {current.high}° T: {current.low}°</div>
      {source && <div class="hero-source">Quelle: {source.label}{source.detail ? ` · ${source.detail}` : ''}</div>}
    </header>
  );
}
