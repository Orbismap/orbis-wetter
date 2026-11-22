import type { Day } from './model';
import { WeatherIcon } from './WeatherIcon';
import { TempRange } from './visuals';

export function DailyForecast({ days }: { days: Day[] }) {
  return (
    <section class="daily" aria-label="10-Tage-Vorhersage">
      <div class="card-title"><span class="title-icon">▦</span> 10-Tage-Vorhersage</div>
      <ul class="day-list">
        {days.map((d, i) => (
          <li class="day" key={`${d.label}-${i}`}>
            <span class="day-name">{d.label}</span>
            <span class="day-icon-wrap">
              <span class="day-icon"><WeatherIcon code={d.code} size={24} /></span>
              <span class={`day-chance${(d.chance ?? 0) >= 30 ? ' wet' : ''}`}>{d.chance != null ? `${d.chance} %` : ''}</span>
            </span>
            <span class="day-min">{d.min}°</span>
            <TempRange min={d.min} max={d.max} />
            <span class="day-max">{d.max}°</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
