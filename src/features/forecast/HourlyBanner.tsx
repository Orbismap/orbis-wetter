import type { Hour } from './model';
import { WeatherIcon } from './WeatherIcon';

/** The wide strip at the top: a plain-language summary and the next hours. */
export function HourlyBanner({ summary, hours }: { summary: string; hours: Hour[] }) {
  return (
    <section class="hourly" aria-label="Nächste Stunden">
      <p class="summary">{summary}</p>
      <div class="hours">
        {hours.map((h, i) => (
          <div class={`hour${h.special ? ' hour-event' : ''}`} key={`${h.time}-${i}`}>
            <div class="hour-label">{h.label}</div>
            <div class="hour-icon">{h.special ? <span class="sunset-icon">↓</span> : <WeatherIcon code={h.code} day={h.isDay} size={30} />}</div>
            <div class="hour-temp">{h.special ?? `${h.temp}°`}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
