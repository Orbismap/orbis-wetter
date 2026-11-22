import type { ComponentChildren } from 'preact';
import type { WeatherNow } from './model';
import { Compass, GradientScale, PressureGauge, SunCurve, TempRange } from './visuals';

/** All detail cards are buttons already: clicking them will open more detail in a later step. */
function DetailCard({ title, icon, className = '', children }: { title: string; icon: string; className?: string; children: ComponentChildren }) {
  return (
    <button type="button" class={`card detail ${className}`} title="Details folgen in einer späteren Stufe">
      <div class="card-title"><span class="title-icon">{icon}</span>{title}</div>
      {children}
    </button>
  );
}

export function AirQualityCard({ air }: { air: WeatherNow['current']['air'] }) {
  return (
    <DetailCard title="Luftqualität" icon="◌" className="air">
      <div class="big">{air.label}</div>
      <GradientScale value={air.value} min={0} max={100} colors={['#50c878', '#a3d65c', '#f2c94c', '#f2994a', '#eb5757']} />
      <p class="note">{air.note}</p>
    </DetailCard>
  );
}

export function WindCard({ windSpeed, windGust, windDirection }: Pick<WeatherNow['current'], 'windSpeed' | 'windGust' | 'windDirection'>) {
  return (
    <DetailCard title="Wind" icon="≋" className="wind">
      <div class="wind-layout">
        <div class="wind-rows">
          <div><span>Wind</span><b>{windSpeed} km/h</b></div>
          <div><span>Windböen</span><b>{windGust} km/h</b></div>
          <div><span>Richtung</span><b>{windDirection}° N</b></div>
        </div>
        <Compass speed={windSpeed} direction={windDirection} />
      </div>
    </DetailCard>
  );
}

export function WarningCard({ warning }: { warning: NonNullable<WeatherNow['current']['warning']> }) {
  return (
    <DetailCard title="Unwetterwarnung" icon="⚠" className="warning">
      <div class="big">{warning.headline}</div>
      <p class="note">{warning.text}</p>
      <div class="source">{warning.source}</div>
    </DetailCard>
  );
}

export function UvCard({ uvIndex, uvLabel, uvNote }: Pick<WeatherNow['current'], 'uvIndex' | 'uvLabel' | 'uvNote'>) {
  return (
    <DetailCard title="UV-Index" icon="☼" className="uv">
      <div class="big">{uvIndex}</div>
      <div class="sub">{uvLabel}</div>
      <GradientScale value={uvIndex} min={0} max={11} colors={['#50c878', '#f2c94c', '#f2994a', '#eb5757', '#9b51e0']} />
      <p class="note">{uvNote}</p>
    </DetailCard>
  );
}

export function SunCard({ sunrise, sunset }: Pick<WeatherNow['current'], 'sunrise' | 'sunset'>) {
  return (
    <DetailCard title="Sonnenuntergang" icon="☀" className="sun">
      <div class="big">{sunset}</div>
      <SunCurve sunrise={sunrise} sunset={sunset} />
      <div class="source">Sonnenaufgang: {sunrise}</div>
    </DetailCard>
  );
}

export function FeelsLikeCard({ feelsLike, temp, feelsLikeNote: note }: Pick<WeatherNow['current'], 'feelsLike' | 'temp' | 'feelsLikeNote'>) {
  return (
    <DetailCard title="Gefühlte Temperatur" icon="🌡" className="feels">
      <div class="big">{feelsLike}°</div>
      <div class="sub">Tatsächlich: {temp}°</div>
      <TempRange min={-4} max={temp} scaleMin={-6} scaleMax={8} />
      <div class="range-label">−4°</div>
      <p class="note">{note}</p>
    </DetailCard>
  );
}

export function PrecipCard({ precipitation, precipitationPeriod, precipitationNote }: Pick<WeatherNow['current'], 'precipitation' | 'precipitationPeriod' | 'precipitationNote'>) {
  return (
    <DetailCard title="Niederschlag" icon="◍" className="precip">
      <div class="big">{precipitation}</div>
      <div class="sub">{precipitationPeriod}</div>
      <p class="note">{precipitationNote}</p>
    </DetailCard>
  );
}

export function MoonCard({ moon }: { moon: WeatherNow['current']['moon'] }) {
  return (
    <DetailCard title={moon.phase} icon="☾" className="moon">
      <div class="kv"><span>Beleuchtungsgrad</span><b>{moon.illumination} %</b></div>
      <div class="kv"><span>Nächster Mondaufgang</span><b>{moon.rise}</b></div>
      <div class="kv"><span>Nächster Vollmond</span><b>{moon.full}</b></div>
    </DetailCard>
  );
}

export function HumidityCard({ humidity, dewPoint }: Pick<WeatherNow['current'], 'humidity' | 'dewPoint'>) {
  return (
    <DetailCard title="Feuchtigkeit" icon="◉" className="humidity">
      <div class="big">{humidity} %</div>
      <p class="note">Der Taupunkt liegt derzeit bei {dewPoint}°.</p>
    </DetailCard>
  );
}

export function VisibilityCard({ visibility, visibilityNote }: Pick<WeatherNow['current'], 'visibility' | 'visibilityNote'>) {
  return (
    <DetailCard title="Sichtweite" icon="◎" className="visibility">
      <div class="big">{visibility} km</div>
      <p class="note">{visibilityNote}</p>
    </DetailCard>
  );
}

export function PressureCard({ pressure, pressureTrend }: Pick<WeatherNow['current'], 'pressure' | 'pressureTrend'>) {
  const arrow = pressureTrend === 'falling' ? '↓' : pressureTrend === 'rising' ? '↑' : '↔';
  return (
    <DetailCard title="Luftdruck" icon="◴" className="pressure">
      <PressureGauge value={pressure} />
      <div class="pressure-value">{pressure.toLocaleString('de-DE')}<small>hPa</small></div>
      <div class="pressure-trend">{arrow}</div>
    </DetailCard>
  );
}

export function AveragesCard({ averages }: { averages: WeatherNow['current']['averages'] }) {
  return (
    <DetailCard title="Durchschnittswerte" icon="▤" className="averages">
      <div class="big">{averages.delta}°</div>
      <p class="note">Abweichung vom durchschnittlichen Tageshöchstwert</p>
      <div class="kv"><span>Heute</span><b>H: {averages.todayHigh}°</b></div>
      <div class="kv"><span>Durchschnitt</span><b>H: {averages.averageHigh}°</b></div>
    </DetailCard>
  );
}
