import { OrbisMark } from '../ui/brand/OrbisMark';
import { sample } from '../features/forecast/sample';
import { Hero } from '../features/forecast/Hero';
import { HourlyBanner } from '../features/forecast/HourlyBanner';
import { DailyForecast } from '../features/forecast/DailyForecast';
import { WindMapCard } from '../features/forecast/WindMapCard';
import {
  AirQualityCard, AveragesCard, FeelsLikeCard, HumidityCard, PressureCard, PrecipCard,
  SunCard, UvCard, VisibilityCard, WarningCard, WindCard, MoonCard,
} from '../features/forecast/Cards';
import './app.css';

/** Desktop forecast layout from the design reference, filled with sample data for now. */
export function App() {
  const { place, current, hourly, daily } = sample;
  return (
    <div class="app">
      <div class="toolbar">
        <button type="button" class="sidebar-toggle" aria-label="Seitenleiste" title="Seitenleiste">
          <OrbisMark size={22} />
        </button>
      </div>

      <Hero place={place} current={current} />

      <div class="grid">
        <div class="row row-top">
          <HourlyBanner summary={current.summary} hours={hourly} />
          <WindMapCard windSpeed={current.windSpeed} placeName={place.eyebrow} />
        </div>

        <div class="row row-main">
          <DailyForecast days={daily} />
          <div class="col">
            <AirQualityCard air={current.air} />
            <WindCard windSpeed={current.windSpeed} windGust={current.windGust} windDirection={current.windDirection} />
          </div>
          <div class="col">
            {current.warning && <WarningCard warning={current.warning} />}
          </div>
        </div>

        <div class="row row-four">
          <div class="row-spacer" aria-hidden="true" />
          <UvCard uvIndex={current.uvIndex} uvLabel={current.uvLabel} uvNote={current.uvNote} />
          <SunCard sunrise={current.sunrise} sunset={current.sunset} />
          <FeelsLikeCard feelsLike={current.feelsLike} temp={current.temp} feelsLikeNote={current.feelsLikeNote} />
          <PrecipCard precipitation={current.precipitation} precipitationPeriod={current.precipitationPeriod} precipitationNote={current.precipitationNote} />
        </div>

        <div class="row row-five">
          <MoonCard moon={current.moon} />
          <HumidityCard humidity={current.humidity} dewPoint={current.dewPoint} />
          <VisibilityCard visibility={current.visibility} visibilityNote={current.visibilityNote} />
          <PressureCard pressure={current.pressure} pressureTrend={current.pressureTrend} />
          <AveragesCard averages={current.averages} />
        </div>
      </div>
    </div>
  );
}
