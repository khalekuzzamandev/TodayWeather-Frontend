# API documentation

TodayWeather uses official Open-Meteo endpoints directly from the frontend browser.

## Endpoints

### Geocoding search

GET https://geocoding-api.open-meteo.com/v1/search

Query parameters:
- name: city or place name
- count: maximum number of results
- language: language code
- format: JSON

Example:

```bash
curl "https://geocoding-api.open-meteo.com/v1/search?name=Tokyo&count=3&language=en&format=json"
```

### Forecast data

GET https://api.open-meteo.com/v1/forecast

Key parameters:
- latitude
- longitude
- current
- hourly
- daily
- timezone
- forecast_days

Example:

```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,pressure_msl&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7"
```

### Air quality

GET https://air-quality-api.open-meteo.com/v1/air-quality

Example:

```bash
curl "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=35.6762&longitude=139.6503&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone&timezone=auto"
```

## Response notes

- All times are returned in the API timezone and should be treated as local time.
- Missing values are handled gracefully and displayed as unavailable.
- Unsupported product features are omitted rather than fabricated.
