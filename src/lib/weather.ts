export type TemperatureUnit = "C" | "F";
export type WindSpeedUnit = "km/h" | "mph" | "m/s";

export type LocationResult = {
  id: number;
  name: string;
  country: string;
  country_code?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type WeatherSnapshot = {
  location: LocationResult;
  current: {
    time: string;
    temperature: number;
    feelsLike: number;
    apparentTemperature: number;
    weatherCode: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    pressure: number;
    cloudCover: number;
    visibility: number | null;
    precipitation: number;
    uvIndex: number | null;
    isDay: number;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    precipitationProbability: number;
    precipitation: number;
    weatherCode: number;
    windSpeed: number;
  }>;
  daily: Array<{
    date: string;
    weatherCode: number;
    tempMax: number;
    tempMin: number;
    precipitationProbability: number;
    windSpeed: number;
    sunrise: string | null;
    sunset: string | null;
    uvIndexMax: number | null;
  }>;
  timezone: string;
  lastUpdated: string;
  sunrise: string | null;
  sunset: string | null;
};

export type AirQualitySnapshot = {
  timezone: string;
  current: {
    usAqi: number | null;
    europeanAqi: number | null;
    pm2_5: number | null;
    pm10: number | null;
    carbonMonoxide: number | null;
    nitrogenDioxide: number | null;
    sulphurDioxide: number | null;
    ozone: number | null;
  };
};

export function getWeatherCondition(code: number): string {
  const weatherMap: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Heavy rain showers",
    82: "Violent rain showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Heavy thunderstorm with hail",
  };

  return weatherMap[code] ?? "Variable conditions";
}

export function getWeatherTone(code: number): "sunny" | "cloudy" | "rain" | "snow" | "storm" | "fog" | "night" {
  if ([0, 1].includes(code)) return "sunny";
  if ([2, 3].includes(code)) return "cloudy";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  if ([45, 48].includes(code)) return "fog";
  return "cloudy";
}

export function celsiusToFahrenheit(value: number) {
  return (value * 9) / 5 + 32;
}

export function formatTemperature(value: number, unit: TemperatureUnit) {
  const display = unit === "F" ? celsiusToFahrenheit(value) : value;
  return `${Math.round(display)}°${unit}`;
}

export function formatWindSpeed(value: number, unit: WindSpeedUnit) {
  const display =
    unit === "mph" ? value * 0.621371 : unit === "m/s" ? value / 3.6 : value;
  return `${Math.round(display)} ${unit}`;
}

export function formatPressure(value: number) {
  return `${Math.round(value)} hPa`;
}

export function formatVisibility(value: number | null) {
  if (value === null || Number.isNaN(value)) return "Unavailable";
  if (value >= 10000) return `${(value / 1000).toFixed(1)} km`;
  return `${Math.round(value)} m`;
}

export function formatDateTime(value: string, tz?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: tz ?? "UTC",
  }).format(date);
}

type GeocodingResponse = {
  results?: Array<{
    id: number;
    name: string;
    country?: string | null;
    country_code?: string;
    admin1?: string;
    latitude: number | string;
    longitude: number | string;
    timezone?: string;
  }>;
};

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<LocationResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=6&language=en&format=json`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Location search is temporarily unavailable. Please try again.");
  }

  const body = (await response.json()) as GeocodingResponse;

  return (body.results ?? []).map((result) => ({
    id: result.id,
    name: result.name,
    country: result.country ?? "Unknown",
    country_code: result.country_code,
    admin1: result.admin1,
    latitude: Number(result.latitude),
    longitude: Number(result.longitude),
    timezone: result.timezone,
  }));
}

type ReverseGeocodingResponse = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<Pick<LocationResult, "name" | "country" | "country_code" | "admin1">> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "10",
    addressdetails: "1",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      signal,
      headers: { "Accept-Language": "en" },
    },
  );

  if (!response.ok) {
    throw new Error("Unable to resolve the current city name.");
  }

  const result = (await response.json()) as ReverseGeocodingResponse;
  const address = result.address;
  if (!address) {
    throw new Error("No city name was returned for the current coordinates.");
  }
  const name =
    address.city ??
    address?.town ??
    address?.village ??
    address?.municipality ??
    address?.suburb;

  if (!name) {
    throw new Error("No city name was returned for the current coordinates.");
  }

  return {
    name,
    country: address.country ?? "",
    country_code: address.country_code?.toUpperCase(),
    admin1: address.state ?? address.county,
  };
}

export async function fetchWeatherSnapshot(location: {
  id?: number;
  latitude: number;
  longitude: number;
  name?: string;
  country?: string;
  admin1?: string;
  timezone?: string;
}, signal?: AbortSignal): Promise<WeatherSnapshot> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover,visibility,is_day,precipitation,uv_index&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max&timezone=auto&forecast_days=7&temperature_unit=celsius&wind_speed_unit=kmh`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Unable to load weather data");
  }

  const data = await response.json();

  const hourly = (data.hourly.time ?? []).slice(0, 24).map((time: string, index: number) => ({
    time,
    temperature: Number(data.hourly.temperature_2m[index]),
    precipitationProbability: Number(data.hourly.precipitation_probability[index] ?? 0),
    precipitation: Number(data.hourly.precipitation[index] ?? 0),
    weatherCode: Number(data.hourly.weather_code[index]),
    windSpeed: Number(data.hourly.wind_speed_10m[index] ?? 0),
  }));

  const daily = (data.daily.time ?? []).map((date: string, index: number) => ({
    date,
    weatherCode: Number(data.daily.weather_code[index] ?? 0),
    tempMax: Number(data.daily.temperature_2m_max[index] ?? 0),
    tempMin: Number(data.daily.temperature_2m_min[index] ?? 0),
    precipitationProbability: Number(data.daily.precipitation_probability_max[index] ?? 0),
    windSpeed: Number(data.daily.wind_speed_10m_max[index] ?? 0),
    sunrise: data.daily.sunrise[index] ?? null,
    sunset: data.daily.sunset[index] ?? null,
    uvIndexMax: data.daily.uv_index_max[index] ?? null,
  }));

  const resolvedLocation: LocationResult = {
    id: location.id ?? Date.now(),
    name: location.name ?? "Selected location",
    country: location.country ?? "",
    admin1: location.admin1,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    timezone: location.timezone ?? data.timezone ?? "auto",
  };

  return {
    location: resolvedLocation,
    timezone: data.timezone ?? resolvedLocation.timezone ?? "UTC",
    current: {
      time: data.current.time,
      temperature: Number(data.current.temperature_2m),
      feelsLike: Number(data.current.apparent_temperature),
      apparentTemperature: Number(data.current.apparent_temperature),
      weatherCode: Number(data.current.weather_code),
      humidity: Number(data.current.relative_humidity_2m ?? 0),
      windSpeed: Number(data.current.wind_speed_10m ?? 0),
      windDirection: Number(data.current.wind_direction_10m ?? 0),
      pressure: Number(data.current.pressure_msl ?? 0),
      cloudCover: Number(data.current.cloud_cover ?? 0),
      visibility: data.current.visibility === undefined ? null : Number(data.current.visibility),
      precipitation: Number(data.current.precipitation ?? 0),
      uvIndex: data.current.uv_index === undefined ? null : Number(data.current.uv_index),
      isDay: Number(data.current.is_day ?? 0),
    },
    hourly,
    daily,
    lastUpdated: data.current.time,
    sunrise: data.daily.sunrise?.[0] ?? null,
    sunset: data.daily.sunset?.[0] ?? null,
  };
}

export async function fetchAirQuality(latitude: number, longitude: number): Promise<AirQualitySnapshot> {
  const response = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`,
  );

  if (!response.ok) {
    throw new Error("Air quality data is currently unavailable");
  }

  const data = await response.json();

  return {
    timezone: data.timezone ?? "UTC",
    current: {
      usAqi: data.current?.us_aqi ?? null,
      europeanAqi: data.current?.european_aqi ?? null,
      pm2_5: data.current?.pm2_5 ?? null,
      pm10: data.current?.pm10 ?? null,
      carbonMonoxide: data.current?.carbon_monoxide ?? null,
      nitrogenDioxide: data.current?.nitrogen_dioxide ?? null,
      sulphurDioxide: data.current?.sulphur_dioxide ?? null,
      ozone: data.current?.ozone ?? null,
    },
  };
}

export function getAirQualityStatus(aqi: number | null) {
  if (aqi === null) return { label: "Unavailable", color: "text-slate-400" };
  if (aqi <= 50) return { label: "Good", color: "text-emerald-400" };
  if (aqi <= 100) return { label: "Moderate", color: "text-amber-400" };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", color: "text-orange-400" };
  if (aqi <= 200) return { label: "Unhealthy", color: "text-red-400" };
  if (aqi <= 300) return { label: "Very unhealthy", color: "text-rose-500" };
  return { label: "Hazardous", color: "text-fuchsia-500" };
}
