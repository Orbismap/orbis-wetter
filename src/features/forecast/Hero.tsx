import type { WeatherNow } from './model';

export function Hero({ place, current }: Pick<WeatherNow, 'place' | 'current'>) {
  return (
    <header class="hero">
      <div class="eyebrow">{place.eyebrow}</div>
      <h1>{place.name}</h1>
      <div class="hero-temp">{current.temp}°</div>
      <div class="hero-feel">Gefühlt: {current.feelsLike}°</div>
      <div class="hero-hl">H: {current.high}° T: {current.low}°</div>
    </header>
  );
}
