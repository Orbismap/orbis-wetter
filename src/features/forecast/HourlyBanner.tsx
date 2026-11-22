import { useEffect, useRef } from 'preact/hooks';
import type { Hour } from './model';
import { WeatherIcon } from './WeatherIcon';

/** Small pictogram for the extra sunrise/sunset entries in the timeline. */
function SunEventIcon({ kind }: { kind: 'sunrise' | 'sunset' }) {
  return (
    <svg class="sun-event-icon" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      <circle cx="16" cy="16" r="5" class="sun-disc" />
      <line x1="4" y1="25" x2="28" y2="25" class="sun-horizon" />
      <path
        d={kind === 'sunrise' ? 'M16 9V2m-3 3 3-3 3 3' : 'M16 22v7m-3-3 3 3 3-3'}
        class="sun-arrow"
      />
    </svg>
  );
}

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
          <div class={`hour${h.event ? ' hour-event' : ''}`} key={`${h.time}-${i}`}>
            <div class="hour-label">{h.event ? h.time : h.label}</div>
            <div class="hour-icon">
              {h.event ? <SunEventIcon kind={h.event} /> : <WeatherIcon code={h.code} day={h.isDay} size={30} />}
            </div>
            <div class="hour-temp">
              {h.event === 'sunrise' ? 'Sonnenaufgang' : h.event === 'sunset' ? 'Sonnenuntergang' : `${h.temp}°`}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
