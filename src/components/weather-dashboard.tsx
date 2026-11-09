"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cloud, CloudRain, Compass, Droplets, Heart, LocateFixed, LoaderCircle, MapPinned, MoonStar, Search, Sun, Thermometer, Wind, Zap } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  celsiusToFahrenheit,
  fetchAirQuality,
  fetchWeatherSnapshot,
  formatPressure,
  formatTemperature,
  formatVisibility,
  formatWindSpeed,
  getAirQualityStatus,
  getWeatherCondition,
  getWeatherTone,
  reverseGeocodeLocation,
  searchLocations,
  type AirQualitySnapshot,
  type LocationResult,
  type TemperatureUnit,
  type WeatherSnapshot,
} from "@/lib/weather";
import dynamic from "next/dynamic";

const WeatherMap = dynamic(
  () => import("@/components/weather-map").then((mod) => mod.WeatherMap),
  { ssr: false },
);

const navItems = [
  { label: "Home", href: "/" },
  { label: "Forecast", href: "/forecast" },
  { label: "Weather Map", href: "/map" },
  { label: "Air Quality", href: "/air-quality" },
  { label: "Compare", href: "/compare" },
  { label: "Favorites", href: "/favorites" },
];

function highlightMatch(text: string, query: string) {
  const start = text.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase());
  if (start < 0 || !query.trim()) return text;

  const end = start + query.trim().length;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-sky-300/20 text-inherit">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function countryFlag(countryCode?: string) {
  if (!countryCode || !/^[a-z]{2}$/i.test(countryCode)) return null;

  return String.fromCodePoint(
    ...countryCode
      .toUpperCase()
      .split("")
      .map((character) => character.charCodeAt(0) + 127397),
  );
}

export function WeatherDashboard() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [unit, setUnit] = useState<TemperatureUnit>("C");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingLocation, setRequestingLocation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationDialog, setLocationDialog] = useState<
    "permission-denied" | "services-disabled" | null
  >(null);
  const [settingsInstructions, setSettingsInstructions] = useState<string | null>(
    null,
  );
  const [favorites, setFavorites] = useState<LocationResult[]>([]);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const weatherRequestRef = useRef<AbortController | null>(null);
  const initialLocationRequestedRef = useRef(false);
  const geolocationRequestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTheme(
        window.localStorage.getItem("todayweather-theme") === "light"
          ? "light"
          : "dark",
      );

      try {
        const storedFavorites: unknown = JSON.parse(
          window.localStorage.getItem("todayweather-favorites") ?? "[]",
        );
        if (Array.isArray(storedFavorites)) {
          setFavorites(
            storedFavorites.filter(
              (item): item is LocationResult =>
                typeof item?.name === "string" &&
                typeof item?.country === "string" &&
                typeof item?.latitude === "number" &&
                typeof item?.longitude === "number",
            ),
          );
        }
      } catch {
        setFavorites([]);
      }

      setPreferencesReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem("todayweather-theme", theme);
    window.localStorage.setItem("todayweather-favorites", JSON.stringify(favorites));
  }, [favorites, preferencesReady, theme]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!searchOpen || trimmedQuery.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchCompleted(false);
      setSearchError(null);
      void searchLocations(trimmedQuery, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return;
          setSearchResults(results);
          setSearchCompleted(true);
          setActiveSearchIndex(-1);
        })
        .catch((searchFailure: unknown) => {
          if (controller.signal.aborted) return;
          setSearchResults([]);
          setSearchCompleted(true);
          setSearchError(
            searchFailure instanceof Error
              ? searchFailure.message
              : "Location search is temporarily unavailable. Please try again.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !searchContainerRef.current?.contains(event.target)
      ) {
        setSearchOpen(false);
        setActiveSearchIndex(-1);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [searchOpen]);

  const loadWeather = useCallback(async (location: LocationResult) => {
    geolocationRequestIdRef.current += 1;
    setRequestingLocation(false);
    setLocationDialog(null);
    weatherRequestRef.current?.abort();
    const controller = new AbortController();
    weatherRequestRef.current = controller;
    setLoading(true);
    setError(null);
    setLocationNotice(null);
    setSelectedLocation(location);

    try {
      const currentCoordinates = location.name === "Current location";
      const [weatherResponse, resolvedCity, nextAirQuality] = await Promise.all([
        fetchWeatherSnapshot({
          id: location.id,
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          country: location.country,
          admin1: location.admin1,
          timezone: location.timezone,
        }, controller.signal),
        currentCoordinates
          ? reverseGeocodeLocation(
              location.latitude,
              location.longitude,
              controller.signal,
            ).catch(() => null)
          : Promise.resolve(null),
        fetchAirQuality(location.latitude, location.longitude).catch(() => null),
      ]);
      if (controller.signal.aborted) return;

      const nextWeather = resolvedCity
        ? {
            ...weatherResponse,
            location: { ...weatherResponse.location, ...resolvedCity },
          }
        : weatherResponse;

      window.localStorage.setItem(
        "todayweather-selected-location",
        JSON.stringify(nextWeather.location),
      );
      setWeather(nextWeather);
      setAirQuality(nextAirQuality);
      setSelectedLocation(nextWeather.location);
      setQuery(nextWeather.location.name);
      if (currentCoordinates && !resolvedCity) {
        setLocationNotice(
          "Weather is based on your current coordinates, but the city name could not be determined.",
        );
      }
    } catch (loadError) {
      if (controller.signal.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Unable to load weather data");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const activeCondition = weather ? getWeatherTone(weather.current.weatherCode) : "cloudy";

  const hourlyCards = useMemo(() => weather?.hourly.slice(0, 8) ?? [], [weather]);
  const comparisonCities = useMemo(
    () => [
      { name: "New York", temp: 22, condition: "Sunny" },
      { name: "Paris", temp: 18, condition: "Cloudy" },
      { name: "Tokyo", temp: 26, condition: "Clear" },
      { name: "London", temp: 15, condition: "Rain" },
    ],
    [],
  );

  const toggleFavorite = (location: LocationResult) => {
    setFavorites((current) => {
      const exists = current.some((item) => item.id === location.id);
      const next = exists ? current.filter((item) => item.id !== location.id) : [...current, location];
      return next;
    });
  };

  const selectLocation = (location: LocationResult) => {
    geolocationRequestIdRef.current += 1;
    setRequestingLocation(false);
    setSearchOpen(false);
    setSearchResults([]);
    setSearchLoading(false);
    setSearchCompleted(false);
    setSearchError(null);
    setActiveSearchIndex(-1);
    setQuery(location.name);
    void loadWeather(location);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setSearchOpen(false);
      setActiveSearchIndex(-1);
      return;
    }

    if (!searchOpen || searchResults.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((index) => (index + 1) % searchResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex(
        (index) => (index <= 0 ? searchResults.length - 1 : index - 1),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const location = searchResults[activeSearchIndex] ?? searchResults[0];
      selectLocation(location);
    }
  };

  const requestUserLocation = useCallback(() => {
    const requestId = ++geolocationRequestIdRef.current;
    setRequestingLocation(true);
    setLocationDialog(null);
    setSettingsInstructions(null);
    if (!navigator.geolocation) {
      setRequestingLocation(false);
      setLoading(false);
      setError("Location access is not available in this browser. Search for a city instead.");
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== geolocationRequestIdRef.current) return;
        setRequestingLocation(false);
        const coords = {
          id: Date.now(),
          name: "Current location",
          country: "",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        void loadWeather(coords);
      },
      (geoError) => {
        if (requestId !== geolocationRequestIdRef.current) return;
        setRequestingLocation(false);
        setLoading(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocationDialog("permission-denied");
          setSettingsInstructions(null);
          setError("Location access is blocked. Allow it for this site in your browser or device settings, then select “Use my location” to try again.");
        } else if (geoError.code === geoError.TIMEOUT) {
          setError("We could not get your location in time. Try again or search for a city.");
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setLocationDialog("services-disabled");
          setSettingsInstructions(null);
          setError("Your device location may be turned off. Turn on location services, then select “Use my location” to try again.");
        } else {
          setError("Your current location is unavailable. Try again or search for a city.");
        }
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 },
    );
  }, [loadWeather]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (initialLocationRequestedRef.current) return;
      initialLocationRequestedRef.current = true;
      requestUserLocation();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [requestUserLocation]);

  const openLocationSettings = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes("windows")) {
      setSettingsInstructions(
        "If Windows Settings does not open, go to Settings > Privacy & security > Location and turn on Location services. Also allow location for this site in your browser settings.",
      );
      window.location.href = "ms-settings:privacy-location";
      return;
    }

    if (userAgent.includes("android")) {
      setSettingsInstructions(
        "On your device, open Settings > Location and turn on Use location. Also allow location for this site in your browser settings. Then return here and select “Use my location”.",
      );
      return;
    }

    if (/iphone|ipad|ipod/.test(userAgent)) {
      setSettingsInstructions(
        "On your device, open Settings > Privacy & Security > Location Services, turn it on, and allow location for your browser. Then return here and select “Use my location”.",
      );
      return;
    }

    setSettingsInstructions(
      "Open your device Settings, turn on Location Services, and allow location for your browser and this site. Then return here and select “Use my location”.",
    );
  };

  const cancelLocationDialog = () => {
    setLocationDialog(null);
    setSettingsInstructions(null);
    setError(null);
  };

  useEffect(
    () => () => {
      weatherRequestRef.current?.abort();
    },
    [],
  );

  const resolveUnits = (value: number) => (unit === "F" ? celsiusToFahrenheit(value) : value);

  return (
    <div className={theme === "light" ? "theme-light" : "theme-dark"}>
      <div className="mx-auto min-h-screen max-w-7xl px-4 pb-16 pt-6 text-slate-50 sm:px-6 lg:px-8">
        <header className="glass-surface sticky top-4 z-30 mb-6 rounded-2xl border border-white/10 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 shadow-lg shadow-sky-500/20">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">TodayWeather</p>
                <p className="text-xs text-slate-400">Your World. Your Weather.</p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 transition ${item.href === "/" ? "bg-sky-500/15 text-sky-200" : "text-slate-300 hover:bg-white/5"}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 self-start lg:self-auto">
              <div className="flex items-center rounded-full border border-slate-700 bg-slate-900/60 p-1">
                <button
                  type="button"
                  onClick={() => setUnit("C")}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${unit === "C" ? "bg-sky-500 text-white" : "text-slate-300"}`}
                >
                  °C
                </button>
                <button
                  type="button"
                  onClick={() => setUnit("F")}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${unit === "F" ? "bg-sky-500 text-white" : "text-slate-300"}`}
                >
                  °F
                </button>
              </div>

              <button
                type="button"
                aria-label="Toggle theme"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                className="rounded-full border border-slate-700 bg-slate-900/60 p-2 text-slate-200"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </header>

        <main className="space-y-6">
          <section
            className="weather-hero weather-hero-enter relative isolate z-10 rounded-[28px] border border-white/10 p-5 sm:p-6 lg:p-8"
            data-condition={activeCondition}
          >
            <div className="weather-hero-glow absolute inset-0 rounded-[28px]" />
            <div className="weather-hero-weather absolute inset-0 rounded-[28px]" />
            <div className="weather-hero-orb absolute rounded-full" />
            <div className="weather-hero-stars absolute inset-0" />

            <div className="relative z-10">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div ref={searchContainerRef} className="relative z-50 max-w-xl flex-1">
                  <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-300" />
                  <input
                    value={query}
                    onChange={(event) => {
                      const nextQuery = event.target.value;
                      if (nextQuery.trim()) {
                        geolocationRequestIdRef.current += 1;
                        setRequestingLocation(false);
                        setLoading(false);
                      }
                      setQuery(nextQuery);
                      setSearchResults([]);
                      setSearchError(null);
                      setSearchCompleted(false);
                      setActiveSearchIndex(-1);
                      setSearchOpen(nextQuery.trim().length >= 2);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    aria-label="Search city"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={searchOpen}
                    aria-controls="location-search-results"
                    aria-activedescendant={
                      activeSearchIndex >= 0
                        ? `location-option-${searchResults[activeSearchIndex]?.id}`
                        : undefined
                    }
                    placeholder="Search a city or country"
                    className="h-12 w-full rounded-full border border-white/10 bg-slate-950/30 pl-11 pr-12 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                  />
                  {searchLoading ? (
                    <LoaderCircle
                      aria-label="Searching locations"
                      className="absolute right-4 top-3.5 h-4 w-4 animate-spin text-sky-300"
                    />
                  ) : null}

                  <AnimatePresence>
                    {searchOpen &&
                    (searchLoading || searchCompleted || searchError) ? (
                      <motion.div
                        key="location-search-results"
                        id="location-search-results"
                        role="listbox"
                        aria-label="Location suggestions"
                        initial={{ opacity: 0, y: -6, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.99 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur-xl"
                      >
                        {searchLoading ? (
                          <div
                            role="status"
                            className="px-3 py-3 text-sm text-slate-300"
                          >
                            Searching locations…
                          </div>
                        ) : searchError ? (
                          <div
                            role="status"
                            className="px-3 py-3 text-sm text-rose-200"
                          >
                            {searchError}
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div
                            role="status"
                            className="px-3 py-3 text-sm text-slate-300"
                          >
                            No locations found
                          </div>
                        ) : (
                          searchResults.map((result, index) => {
                            const region = result.admin1;
                            const flag = countryFlag(result.country_code);
                            const secondary = [region, result.country]
                              .filter(Boolean)
                              .join(", ");

                            return (
                              <button
                                key={`${result.id}-${result.name}-${result.latitude}-${result.longitude}`}
                                id={`location-option-${result.id}`}
                                type="button"
                                role="option"
                                aria-selected={activeSearchIndex === index}
                                onPointerDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setActiveSearchIndex(index)}
                                onClick={() => selectLocation(result)}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
                                  activeSearchIndex === index
                                    ? "bg-sky-400/15"
                                    : "hover:bg-white/[0.07]"
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg"
                                >
                                  {flag ?? <MapPinned className="h-4 w-4 text-sky-300" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-white">
                                    {highlightMatch(result.name, query)}
                                  </span>
                                  {secondary ? (
                                    <span className="block truncate text-xs text-slate-400">
                                      {highlightMatch(secondary, query)}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-sky-300">
                                  {result.country_code ?? ""}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={requestUserLocation}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-100 hover:bg-sky-500/20"
                  >
                    <LocateFixed className="h-4 w-4" />
                    Use my location
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedLocation) toggleFavorite(selectedLocation);
                    }}
                    disabled={!selectedLocation}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Heart className={`h-4 w-4 ${favorites.some((item) => item.id === selectedLocation?.id) ? "fill-rose-500 text-rose-400" : ""}`} />
                    Favorite
                  </button>
                </div>
              </div>

              {error ? (
                <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
              ) : null}
              {locationNotice ? (
                <div
                  role="status"
                  className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                >
                  {locationNotice}
                </div>
              ) : null}

              <div
                className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]"
                aria-busy={loading && !weather}
              >
                {weather ? (
                  <>
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-sky-100/90">
                        <MapPinned className="h-4 w-4" />
                        <span className="text-sm">{weather.location.name}, {weather.location.country}</span>
                      </div>

                      <div className="flex flex-wrap items-end gap-4">
                        <div className="text-6xl font-semibold tracking-tight sm:text-7xl">
                          {formatTemperature(resolveUnits(weather.current.temperature), unit)}
                        </div>
                        <div className="pb-2 text-slate-100/90">
                          <p className="text-lg font-medium">{getWeatherCondition(weather.current.weatherCode)}</p>
                          <p className="text-sm text-slate-200/80">Feels like {formatTemperature(resolveUnits(weather.current.feelsLike), unit)}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-200/85">
                        <div className="rounded-full border border-white/10 bg-slate-950/20 px-3 py-1.5">Humidity {weather.current.humidity}%</div>
                        <div className="rounded-full border border-white/10 bg-slate-950/20 px-3 py-1.5">Wind {formatWindSpeed(weather.current.windSpeed, "km/h")}</div>
                        <div className="rounded-full border border-white/10 bg-slate-950/20 px-3 py-1.5">Pressure {formatPressure(weather.current.pressure)}</div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Timezone</p>
                        <p className="mt-2 break-words text-lg font-medium text-white">{weather.timezone}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Updated</p>
                        <p className="mt-2 text-lg font-medium text-white">{new Date(weather.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 sm:col-span-2 xl:col-span-1">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Sunrise / Sunset</p>
                        <p className="mt-2 text-lg font-medium text-white">{weather.sunrise ? new Date(weather.sunrise).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} / {weather.sunset ? new Date(weather.sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                      </div>
                    </div>
                  </>
                ) : loading ? (
                  <>
                    <div className="animate-pulse">
                      <div className="mb-5 h-4 w-48 rounded bg-white/10" />
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="h-16 w-32 rounded-xl bg-white/10 sm:h-20" />
                        <div className="space-y-2 pb-2">
                          <div className="h-5 w-32 rounded bg-white/10" />
                          <div className="h-4 w-40 rounded bg-white/5" />
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        {[24, 20, 22].map((width) => (
                          <div
                            key={width}
                            className="h-8 rounded-full bg-white/10"
                            style={{ width: `${width * 4}px` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      {[0, 1, 2].map((item) => (
                        <div
                          key={item}
                          className="animate-pulse rounded-2xl border border-white/10 bg-slate-950/20 p-4"
                        >
                          <div className="h-3 w-24 rounded bg-white/10" />
                          <div className="mt-3 h-6 w-40 max-w-full rounded bg-white/10" />
                        </div>
                      ))}
                    </div>
                    <p role="status" className="sr-only">
                      {requestingLocation
                        ? "Waiting for location permission to show your local weather."
                        : "Loading live weather conditions."}
                    </p>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/20 p-5 text-sm text-slate-300 xl:col-span-2">
                    Current weather will appear here after you allow location access or select a city from search.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {weather
              ? [
                  { label: "Feels like", value: formatTemperature(resolveUnits(weather.current.feelsLike), unit), icon: Thermometer },
                  { label: "Humidity", value: `${weather.current.humidity}%`, icon: Droplets },
                  { label: "Wind", value: formatWindSpeed(weather.current.windSpeed, "km/h"), icon: Wind },
                  { label: "Visibility", value: formatVisibility(weather.current.visibility), icon: Compass },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="glass-surface rounded-2xl border border-white/10 p-4">
                    <div className="mb-3 flex items-center justify-between text-slate-300">
                      <span className="text-sm">{label}</span>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-semibold text-white">{value}</div>
                  </div>
                ))
              : null}
          </section>

          <section>
            <div className="glass-surface rounded-3xl border border-white/10 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Hourly forecast</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Next 24 hours</h2>
                </div>
                <button type="button" className="text-sm text-sky-300">View full forecast</button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {hourlyCards.map((item, index) => (
                  <div
                    key={`${item.time}-${index}`}
                    className={`min-w-[130px] rounded-2xl border p-3 ${index === 0 ? "border-sky-400/50 bg-sky-500/10" : "border-white/10 bg-slate-950/20"}`}
                  >
                    <p className="text-xs text-slate-300">{new Date(item.time).toLocaleTimeString([], { hour: "numeric" })}</p>
                    <div className="my-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/60 text-sky-200">
                      {item.weatherCode >= 80 ? <CloudRain className="h-5 w-5" /> : item.weatherCode >= 3 ? <Cloud className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </div>
                    <p className="text-xl font-semibold text-white">{formatTemperature(resolveUnits(item.temperature), unit)}</p>
                    <p className="mt-2 text-xs text-slate-300">{item.precipitationProbability}% rain</p>
                  </div>
                ))}
              </div>
            </div>

          </section>

          <section className="glass-surface rounded-3xl border border-white/10 p-5">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">7-day outlook</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Forecast</h2>
                </div>
                <MoonStar className="h-4 w-4 text-sky-300" />
              </div>
              <div
                className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
                aria-busy={loading && !weather}
              >
                {weather?.daily.length ? weather.daily.map((day, index) => (
                  <article
                    key={`${day.date}-${index}`}
                    className="min-w-[118px] flex-1 rounded-xl border border-white/10 bg-slate-950/20 p-2.5 sm:min-w-[130px]"
                  >
                    <p className="text-xs font-medium text-slate-200 sm:text-sm">
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString([], { weekday: "short" })}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                    <div className="my-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/70 text-sky-200">
                      {day.weatherCode >= 80 ? <CloudRain className="h-4 w-4" /> : day.weatherCode >= 3 ? <Cloud className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </div>
                    <p className="min-h-8 text-[11px] leading-4 text-slate-300">
                      {getWeatherCondition(day.weatherCode)}
                    </p>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-white">{formatTemperature(resolveUnits(day.tempMax), unit)}</span>
                      <span className="text-xs text-slate-400">{formatTemperature(resolveUnits(day.tempMin), unit)}</span>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
                      {day.precipitationProbability}% rain · {formatWindSpeed(day.windSpeed, "km/h")}
                    </p>
                  </article>
                )) : loading ? (
                  Array.from({ length: 7 }, (_, index) => (
                    <article
                      key={`forecast-loading-${index}`}
                      aria-hidden="true"
                      className="min-w-[118px] flex-1 animate-pulse rounded-xl border border-white/10 bg-slate-950/20 p-2.5 sm:min-w-[130px]"
                    >
                      <div className="h-4 w-12 rounded bg-white/10" />
                      <div className="mt-1.5 h-3 w-16 rounded bg-white/5" />
                      <div className="my-2 h-9 w-9 rounded-lg bg-white/10" />
                      <div className="h-3 w-20 rounded bg-white/10" />
                      <div className="mt-2 h-4 w-16 rounded bg-white/10" />
                      <div className="mt-2 h-3 w-24 rounded bg-white/5" />
                    </article>
                  ))
                ) : (
                  <p className="w-full rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-slate-400">
                    The forecast is unavailable right now.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="grid items-stretch gap-6 md:grid-cols-2">
              <div className="glass-surface min-w-0 rounded-3xl border border-white/10 p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Highlights</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Today</h2>
                  </div>
                  <Zap className="h-4 w-4 text-amber-300" />
                </div>
                {weather ? (
                  <div className="grid gap-3 text-sm text-slate-200">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/20 px-3 py-3">
                      <span>UV Index</span>
                      <span className="font-medium">{weather.current.uvIndex ?? "Unavailable"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/20 px-3 py-3">
                      <span>Pressure</span>
                      <span className="font-medium">{formatPressure(weather.current.pressure)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/20 px-3 py-3">
                      <span>Cloud cover</span>
                      <span className="font-medium">{weather.current.cloudCover}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/20 px-3 py-3">
                      <span>Precipitation</span>
                      <span className="font-medium">{weather.current.precipitation.toFixed(1)} mm</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Highlights are unavailable until weather data loads.</p>
                )}
              </div>

              <div className="glass-surface min-w-0 rounded-3xl border border-white/10 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Air quality</p>
                <h2 className="mt-2 text-xl font-semibold text-white">AQI overview</h2>
                {airQuality ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-slate-300">US AQI</span>
                        <span className={`font-semibold ${getAirQualityStatus(airQuality.current.usAqi).color}`}>
                          {getAirQualityStatus(airQuality.current.usAqi).label}
                        </span>
                      </div>
                      <div className="mt-3 text-3xl font-semibold text-white">{airQuality.current.usAqi ?? "Unavailable"}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/20 p-3">
                        <p className="text-xs text-slate-400">PM2.5 (µg/m³)</p>
                        <p className="mt-2 break-words text-lg font-semibold text-white">{airQuality.current.pm2_5 ?? "Unavailable"}</p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/20 p-3">
                        <p className="text-xs text-slate-400">PM10 (µg/m³)</p>
                        <p className="mt-2 break-words text-lg font-semibold text-white">{airQuality.current.pm10 ?? "Unavailable"}</p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/20 p-3">
                        <p className="text-xs text-slate-400">NO₂ (µg/m³)</p>
                        <p className="mt-2 break-words text-lg font-semibold text-white">{airQuality.current.nitrogenDioxide ?? "Unavailable"}</p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/20 p-3">
                        <p className="text-xs text-slate-400">O₃ (µg/m³)</p>
                        <p className="mt-2 break-words text-lg font-semibold text-white">{airQuality.current.ozone ?? "Unavailable"}</p>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-400">
                      Model-based air-quality estimates; they may differ from local monitoring stations.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                    Air quality data is currently unavailable for this location.
                  </div>
                )}
              </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
            <div className="glass-surface rounded-3xl border border-white/10 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Favorites</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Saved cities</h2>
                </div>
                <Heart className="h-4 w-4 text-rose-400" />
              </div>
              <div className="space-y-2">
                {favorites.length > 0 ? (
                  favorites.map((city) => (
                    <button
                      key={`${city.id}-${city.name}`}
                      type="button"
                      onClick={() => void loadWeather(city)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/20 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                    >
                      <span>{city.name}</span>
                      <span className="text-xs text-slate-400">{city.country}</span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">Save a city from the search results to keep it here.</div>
                )}
              </div>
            </div>

            <div className="glass-surface rounded-3xl border border-white/10 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Weather map</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Location view</h2>
                </div>
                <MapPinned className="h-4 w-4 text-sky-300" />
              </div>
              {weather ? (
                <WeatherMap latitude={weather.location.latitude} longitude={weather.location.longitude} city={weather.location.name} />
              ) : null}
            </div>
          </section>

          <section className="glass-surface rounded-3xl border border-white/10 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">City comparison</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Compare climate snapshots</h2>
              </div>
              <Link href="/compare" className="text-sm text-sky-300">Open comparison</Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {comparisonCities.map((city) => (
                <div key={city.name} className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                  <p className="text-sm text-slate-300">{city.name}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-3xl font-semibold text-white">{city.temp}°</span>
                    <span className="rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-200">{city.condition}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <AnimatePresence>
          {locationDialog ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-md"
            >
              <motion.section
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="location-dialog-title"
                className="w-full max-w-lg rounded-3xl border border-[#DC2F02]/40 bg-slate-900/95 p-6 shadow-2xl shadow-black/40 sm:p-8"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DC2F02]/15 text-[#DC2F02]">
                  <LocateFixed className="h-7 w-7" aria-hidden="true" />
                </div>
                <h2 id="location-dialog-title" className="text-xl font-semibold text-white sm:text-2xl">
                  {locationDialog === "permission-denied"
                    ? "Allow Location Access"
                    : "Your Device Location Is Off"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {locationDialog === "permission-denied"
                    ? "Allow location access for this site in your browser settings and make sure Location Services is turned on. Browser permission and device location settings may need to be enabled separately."
                    : "Please turn on Location Services on your device to get accurate weather updates for your current location."}
                </p>
                {settingsInstructions ? (
                  <p role="status" className="mt-4 rounded-2xl border border-[#DC2F02]/30 bg-[#DC2F02]/10 p-4 text-sm leading-6 text-orange-100">
                    {settingsInstructions}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={cancelLocationDialog}
                    className="rounded-full border border-white/15 px-5 py-3 text-sm text-slate-200 transition hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={openLocationSettings}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#DC2F02] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c52902]"
                  >
                    <LocateFixed className="h-4 w-4" aria-hidden="true" />
                    Turn On Location
                  </button>
                </div>
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <footer className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TodayWeather. Weather from Open-Meteo; map and city lookup from OpenStreetMap.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
