# Project structure

```text
src/
  app/
    app-router entry points and global styling
  components/
    dashboard, map, navigation, and page-specific UI
  lib/
    weather API client code and formatting utilities
public/
  static icons and assets
README.md
  product overview and quick-start steps
docs/
  API_DOCUMENTATION.md
  PROJECT_STRUCTURE.md
  SETUP_GUIDE.md
```

## Key responsibilities

- `src/app` keeps the route tree and metadata.
- `src/components/weather-dashboard.tsx` contains the main user experience.
- `src/lib/weather.ts` centralizes data-fetching logic and parsing.
- `src/components/weather-map.tsx` renders the map with OpenStreetMap tiles.
- `docs/*.md` explains usage, setup, and API interactions.
