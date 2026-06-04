# Our Map 💕🗺️

A mobile-first web app for couples to visualize their shared travel memories as a glowing heatmap. Upload photos, and **Our Map** reads the GPS from each one, lights up where you've been, and lets you relive each place as an Instagram-style story — complete with a background song.

Everything lives in your browser (`localStorage`). No backend, no accounts, no tracking.

## Features

- **Heatmap map view** — a dark, romantic fullscreen Leaflet map with a `leaflet.heat` glow over every place you've visited and clustered pins (`leaflet.markercluster`).
- **Add memory flow** — upload multiple photos, auto-extract GPS from EXIF (`exifr`), and group photos taken within ~1km into a single location. No GPS in the photos? Tap the map to drop a pin instead.
- **Story viewer** — fullscreen vertical stories: photos auto-advance every 3s with progress bars, hold to pause, swipe down to close. Shows the reverse-geocoded place name (Nominatim/OSM), date, caption, and mood.
- **Background music** — attach an mp3 to a location; it plays when you open the story and stops when you close it (`Howler.js`).
- **Moods** — tag each memory `happy`, `romantic`, `adventure`, or `chill`; the pin and story are themed to match.

## Tech stack

React + Vite · Leaflet + react-leaflet · leaflet.heat · leaflet.markercluster · exifr · Howler.js · Tailwind CSS · localStorage. All open source.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build
npm run preview  # preview the production build
```

Open it on your phone (or a 375px-wide viewport in dev tools) for the intended experience.

## Data model

Memories are stored under the `ourmap:memories` key in `localStorage`:

```jsonc
{
  "id": "mem_...",
  "coords": { "lat": 0, "lng": 0 },
  "photos": ["data:image/...;base64,..."],
  "caption": "That perfect sunset",
  "date": "2026-06-04",
  "mood": "romantic",
  "audioFile": "data:audio/mpeg;base64,..."  // or null
}
```

## Project structure

```
src/
  components/
    Map.jsx            # Leaflet map, clustering, heatmap wiring
    HeatmapLayer.jsx   # leaflet.heat layer
    AddMemoryModal.jsx # photo upload + EXIF + location + details wizard
    StoryViewer.jsx    # fullscreen story playback + audio
  hooks/
    useMemories.js     # localStorage-backed store
    useExif.js         # EXIF GPS/date extraction
  utils/
    geocode.js         # Nominatim reverse geocoding (cached)
    cluster.js         # proximity grouping (haversine)
  constants.js         # mood definitions
  App.jsx
  main.jsx
```

> Note: base64 photos/audio can fill `localStorage` (usually ~5MB) quickly. The app warns you when storage is full.
