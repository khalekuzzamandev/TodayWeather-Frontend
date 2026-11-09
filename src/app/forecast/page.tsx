"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Sun,
  Wind,
} from "lucide-react";
import {
  fetchWeatherSnapshot,
  formatTemperature,
  formatWindSpeed,
  getWeatherCondition,
  type LocationResult,
  type WeatherSnapshot,
} from "@/lib/weather";

const defaultLocation: LocationResult = {
  id: 1,
  name: "New York",
  country: "United States",
  admin1: "New York",
  latitude: 40.7128,
  longitude: -74.006,
  timezone: "America/New_York",
};

function isLocation(value: unknown): value is LocationResult {
  if (!value || typeof value !== "object") return false;
  const location = value as Partial<LocationResult>;

  return (
    typeof location.name === "string" &&
    typeof location.latitude === "number" &&
    Number.isFinite(location.latitude) &&
    typeof location.longitude === "number" &&
    Number.isFinite(location.longitude)
  );
}

function formatForecastDate(date: string, options: Intl.DateTimeFormatOptions) {
  const localDate = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "UTC",
  }).format(localDate);
}

function ForecastIcon({ code }: { code: number }) {
  const className = "h-6 w-6 text-sky-300";
  if (code >= 95) return <CloudRain className={className} aria-hidden="true" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return <CloudSnow className={className} aria-hidden="true" />;
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return <CloudRain className={className} aria-hidden="true" />;
  }
  if (code >= 2 && code <= 3) {
    return <CloudSun className={className} aria-hidden="true" />;
  }
  if (code >= 45 && code <= 48) {
    return <Cloud className={className} aria-hidden="true" />;
  }
  return <Sun className={className} aria-hidden="true" />;
}

export default function ForecastPage() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      let location = defaultLocation;

      try {
        const savedLocation: unknown = JSON.parse(
          window.localStorage.getItem("todayweather-selected-location") ?? "null",
        );
        if (isLocation(savedLocation)) location = savedLocation;
      } catch {
        // Fall back to the default location if saved browser data is malformed.
      }

      void fetchWeatherSnapshot(location, controller.signal)
        .then((snapshot) => {
          if (!controller.signal.aborted) setWeather(snapshot);
        })
        .catch((loadError: unknown) => {
          if (!controller.signal.aborted) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Unable to load the 7-day forecast.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 text-slate-100 sm:px-6 sm:py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Forecast</p>
          <h1 className="mt-2 text-3xl font-semibold">Next 7 days</h1>
          {weather ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {weather.location.name}
              {weather.location.admin1 ? `, ${weather.location.admin1}` : ""}
              {weather.location.country ? `, ${weather.location.country}` : ""}
            </p>
          ) : null}
        </div>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Back home</span>
        </Link>
      </div>

      {loading ? (
        <div
          role="status"
          className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-slate-300"
        >
          Loading the latest 7-day forecast…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100"
        >
          {error}
        </div>
      ) : weather?.daily.length ? (
        <>
          <p className="mb-4 text-sm text-slate-400">
            Live daily forecast · temperatures in °C · local dates for{" "}
            {weather.timezone}
          </p>
          <div className="space-y-3">
            {weather.daily.map((day) => (
              <article
                key={day.date}
                className="grid grid-cols-[minmax(5rem,0.8fr)_2.5rem_minmax(0,1.8fr)_minmax(5.5rem,0.8fr)] items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:grid-cols-[minmax(7rem,0.9fr)_3rem_minmax(0,2fr)_minmax(7rem,0.9fr)_minmax(7rem,0.8fr)] sm:gap-4 sm:p-5"
              >
                <div>
                  <p className="font-medium text-white">
                    {formatForecastDate(day.date, { weekday: "long" })}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatForecastDate(day.date, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <ForecastIcon code={day.weatherCode} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-200">
                    {getWeatherCondition(day.weatherCode)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {day.precipitationProbability}% precipitation
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">
                    {formatTemperature(day.tempMax, "C")}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatTemperature(day.tempMin, "C")}
                  </p>
                </div>
                <div className="hidden items-center justify-end gap-1.5 text-sm text-slate-400 sm:flex">
                  <Wind className="h-4 w-4" aria-hidden="true" />
                  {formatWindSpeed(day.windSpeed, "km/h")}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-5 text-xs text-slate-500">
            Forecast data provided by Open-Meteo. Weather conditions can change;
            check official local sources for severe weather alerts.
          </p>
        </>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-slate-300">
          The forecast provider returned no daily forecast for this location.
        </div>
      )}
    </main>
  );
}
