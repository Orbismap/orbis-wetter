import { useEffect, useRef } from 'preact/hooks';
import type { Hour } from './model';
import { WeatherIcon } from './WeatherIcon';

/** The wide strip at the top: a plain-language summary and a horizontally scrollable timeline. */
export function HourlyBanner({ summary, hours }: { summary: string; hours: Hour[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  // A normal mouse wheel scrolls the timeline sideways; trackpads, touch and Shift+wheel work natively.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <section class="hourly" aria-label="Nächste Stunden">
      <p class="summary">{summary}</p>
      <div class="hours" ref={scroller} role="group" aria-label="Stündlicher Verlauf, horizontal scrollbar">
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
