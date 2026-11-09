# TodayWeather

TodayWeather is a premium global weather dashboard built with Next.js, TypeScript, Tailwind CSS, Framer Motion, and live Open-Meteo data. It supports city search, geolocation, current conditions, forecasts, air quality, favorites, and map-based location views.

## Features

- Global city search with live Open-Meteo geocoding
- Real-time current weather, hourly forecast, and 7-day outlook
- Dark/light theme toggle and Celsius/Fahrenheit temperature switch
- Air quality insights using Open-Meteo AQI data
- Favorites saved locally in the browser
- Map view with OpenStreetMap tiles and selected city marker
- Responsive layout for mobile and desktop screens
- Graceful loading and error states for API failures

## Tech stack

- Next.js App Router
- React 19 + TypeScript
- Tailwind CSS
- Framer Motion
- Lucide Icons
- Leaflet + react-leaflet for map rendering
- Open-Meteo API for weather, geocoding, and air quality

## Project structure

```text
src/
  app/                  # App routes and global styles
  components/           # Main dashboards and UI sections
  lib/                  # Weather API clients and format helpers
public/                 # Static assets
README.md               # Project overview
docs/
  API_DOCUMENTATION.md
  PROJECT_STRUCTURE.md
  SETUP_GUIDE.md
```

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Production checks

```bash
npm run lint
npm run build
```

## Environment usage

This app uses public Open-Meteo endpoints and does not require an API key for basic usage.

## Data sources and attribution

- Open-Meteo geocoding: https://geocoding-api.open-meteo.com
- Open-Meteo forecast: https://api.open-meteo.com
- Open-Meteo air quality: https://air-quality-api.open-meteo.com
- OpenStreetMap tiles: https://www.openstreetmap.org/copyright

## Notes

- Favorite cities are persisted in local browser storage.
- Weather and air-quality responses are loaded live from official APIs.
- If an external provider is unavailable, the UI shows an honest unavailable state rather than fabricated data.
