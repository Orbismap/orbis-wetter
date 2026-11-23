import type { ComponentChildren } from 'preact';
import { moonImageUrl } from '../../data/moon';
import type { WeatherNow } from './model';
import { SunIcon } from './SunIcon';
import { Compass, GradientScale, Meter, PressureGauge, SunCurve, tempScale } from './visuals';

/** All detail cards are buttons already: clicking them will open more detail in a later step. */
function DetailCard({ title, icon, className = '', children }: { title: string; icon?: ComponentChildren; className?: string; children: ComponentChildren }) {
  return (
    <button type="button" class={`detail ${className}`} title="Details folgen in einer späteren Stufe">
      <div class="card-title">{icon}<span class="title-text">{title}</span></div>
      {children}
    </button>
  );
}

export function AirQualityCard({ air }: { air: WeatherNow['current']['air'] }) {
  return (
    <DetailCard title="Luftqualität" className="air">
      <div class="air-head">
        <div class="big">{air.label}</div>
        <div class="sub">AQI {air.value}</div>
      </div>
      <GradientScale value={air.value} min={0} max={100} colors={['#50c878', '#a3d65c', '#f2c94c', '#f2994a', '#eb5757']} />
      <p class="note">{air.note}</p>
    </DetailCard>
  );
}

export function WindCard({ windSpeed, windGust, windDirection, windLabel }: Pick<WeatherNow['current'], 'windSpeed' | 'windGust' | 'windDirection' | 'windLabel'>) {
  return (
    <DetailCard title="Wind" className="wind">
      <div class="wind-layout">
        <div class="wind-rows">
          <div><span>Wind</span><b>{windSpeed} km/h</b></div>
          <div><span>Windböen</span><b>{windGust} km/h</b></div>
          <div><span>Richtung</span><b>{windDirection}° {windLabel}</b></div>
        </div>
        <Compass speed={windSpeed} direction={windDirection} />
      </div>
      <div class="wind-caption">{windSpeed} km/h {windLabel}</div>
    </DetailCard>
  );
}

export function WarningCard({ warning }: { warning: NonNullable<WeatherNow['current']['warning']> }) {
  return (
    <DetailCard title="Unwetterwarnung" className="warning">
      <div class="big">{warning.headline}</div>
      <p class="note">{warning.text}</p>
      <div class="source">{warning.source}</div>
    </DetailCard>
  );
}

/** Same card chrome as a real warning, so "no warnings" doesn't look like a stray text fragment. */
export function NoWarningCard() {
  return (
    <DetailCard title="Unwetterwarnung" className="warning">
      <p class="note">Für diesen Ort liegen keine Warnungen vor.</p>
    </DetailCard>
  );
}

export function UvCard({ uvIndex, uvLabel, uvNote }: Pick<WeatherNow['current'], 'uvIndex' | 'uvLabel' | 'uvNote'>) {
  return (
    <DetailCard title="UV-Index" className="uv">
      <div class="big">{uvIndex}</div>
      <div class="sub">{uvLabel}</div>
      <GradientScale value={uvIndex} min={0} max={11} colors={['#50c878', '#f2c94c', '#f2994a', '#eb5757', '#9b51e0']} />
      <p class="note">{uvNote}</p>
    </DetailCard>
  );
}

function dayLength(sunrise: string, sunset: string): string {
  const toMinutes = (value: string) => { const [h = 0, m = 0] = value.split(':').map(Number); return h * 60 + m; };
  const total = ((toMinutes(sunset) - toMinutes(sunrise)) % 1440 + 1440) % 1440;
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`;
}

export function SunCard({ sunrise, sunset, sunUp, sunClock }: Pick<WeatherNow['current'], 'sunrise' | 'sunset' | 'sunUp' | 'sunClock'>) {
  const rising = !sunUp;
  return (
    <DetailCard title={rising ? 'Sonnenaufgang' : 'Sonnenuntergang'} icon={<SunIcon kind={rising ? 'sunrise' : 'sunset'} size={20} />} className="sun">
      <div class="big">{rising ? sunrise : sunset}</div>
      <SunCurve sunrise={sunrise} sunset={sunset} clock={sunClock} />
      <div class="source sun-times">
        <span>{rising ? `Sonnenuntergang: ${sunset}` : `Sonnenaufgang: ${sunrise}`}</span>
        <span class="only-large">Tageslänge: {dayLength(sunrise, sunset)}</span>
      </div>
    </DetailCard>
  );
}

export function FeelsLikeCard({ feelsLike, temp, feelsLikeNote: note }: Pick<WeatherNow['current'], 'feelsLike' | 'temp' | 'feelsLikeNote'>) {
  const scale = tempScale([{ min: Math.min(feelsLike, temp), max: Math.max(feelsLike, temp) }]);
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - scale.min) / (scale.max - scale.min)) * 100));
  return (
    <DetailCard title="Gefühlt" className="feels">
      <div class="big">{feelsLike}°</div>
      <div class="sub">Tatsächlich: {temp}°</div>
      <span class="feels-scale" aria-hidden="true">
        <span class="feels-track" />
        <span class="feels-actual" style={{ left: `${pct(temp)}%` }} />
        <span class="feels-dot" style={{ left: `${pct(feelsLike)}%` }} />
      </span>
      <div class="range-label range-ends"><span>{scale.min}°</span><span>{scale.max}°</span></div>
      <p class="note">{note}</p>
    </DetailCard>
  );
}

export function PrecipCard({ precipitation, precipitationPeriod, precipitationNote }: Pick<WeatherNow['current'], 'precipitation' | 'precipitationPeriod' | 'precipitationNote'>) {
  return (
    <DetailCard title="Niederschlag" className="precip">
      <div class="big">{precipitation}</div>
      <div class="sub">{precipitationPeriod}</div>
      <span class="only-large"><Meter value={Number.parseFloat(precipitation) || 0} max={20} /></span>
      <p class="note">{precipitationNote}</p>
    </DetailCard>
  );
}

export function MoonCard({ moon, wide = false }: { moon: WeatherNow['current']['moon']; wide?: boolean }) {
  const image = <img class="moon-image" src={moonImageUrl(moon.image)} alt={moon.phase} draggable={false} />;
  const dates = (
    <div class="moon-dates">
      <div>{moon.next.name} {moon.next.when}</div>
    </div>
  );
  if (!wide) {
    return (
      <DetailCard title={moon.phase} className="moon">
        {image}
        {dates}
      </DetailCard>
    );
  }
  return (
    <DetailCard title={moon.phase} className="moon moon-wide">
      <div class="moon-wide-body">
        {image}
        <div class="moon-info">
          <div class="kv"><span>Beleuchtung</span><b>{moon.illumination} %</b></div>
          <div class="kv"><span>Mondaufgang</span><b>{moon.rise}</b></div>
          {dates}
        </div>
      </div>
    </DetailCard>
  );
}

export function HumidityCard({ humidity, dewPoint }: Pick<WeatherNow['current'], 'humidity' | 'dewPoint'>) {
  return (
    <DetailCard title="Feuchtigkeit" className="humidity">
      <div class="big">{humidity} %</div>
      <span class="only-large"><Meter value={humidity} max={100} /></span>
      <p class="note">Der Taupunkt liegt derzeit bei {dewPoint}°.</p>
    </DetailCard>
  );
}

export function VisibilityCard({ visibility, visibilityNote }: Pick<WeatherNow['current'], 'visibility' | 'visibilityNote'>) {
  return (
    <DetailCard title="Sichtweite" className="visibility">
      <div class="big">{visibility} km</div>
      <span class="only-large"><Meter value={visibility} max={30} /></span>
      <p class="note">{visibilityNote}</p>
    </DetailCard>
  );
}

export function PressureCard({ pressure, pressureTrend }: Pick<WeatherNow['current'], 'pressure' | 'pressureTrend'>) {
  const arrow = pressureTrend === 'falling' ? '↓' : pressureTrend === 'rising' ? '↑' : '→';
  const label = pressureTrend === 'falling' ? 'Fallend' : pressureTrend === 'rising' ? 'Steigend' : 'Stabil';
  return (
    <DetailCard title="Luftdruck" className="pressure">
      <PressureGauge value={pressure} />
      <div class="pressure-trend"><span aria-hidden="true">{arrow}</span> {label}</div>
    </DetailCard>
  );
}

export function AveragesCard({ averages }: { averages: WeatherNow['current']['averages'] }) {
  return (
    <DetailCard title="Durchschnitt" className="averages">
      <div class="big">{averages.delta}°</div>
      <p class="note">vs. Ø-Tageshöchstwert</p>
      <div class="kv"><span>Heute</span><b>H: {averages.todayHigh}°</b></div>
      <div class="kv"><span>Durchschnitt</span><b>H: {averages.averageHigh}°</b></div>
    </DetailCard>
  );
}
