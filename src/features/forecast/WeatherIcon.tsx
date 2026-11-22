import { weatherIcon } from '../wmo/weather';

/** The WMO helper returns an inline SVG string; keep the injection in one small component. */
export function WeatherIcon({ code, day = true, size = 32 }: { code: number; day?: boolean; size?: number }) {
  return <span class="icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: weatherIcon(code, day, size) }} />;
}
