# Our Map 💕🗺️

A mobile-first web app for couples to visualize their shared travel memories as a glowing heatmap. Upload photos, and **Our Map** reads the GPS from each one, lights up where you've been, and lets you relive each place as an Instagram-style story — complete with a background song.

Everything lives in your browser (`localStorage`). No backend, no accounts, no tracking.

## Features

- **Heatmap map view** — a dark, romantic fullscreen Leaflet map with a `leaflet.heat` glow over every place you've visited and clustered pins (`leaflet.markercluster`).
- **Add memory flow** — upload multiple photos (hosted on **Supabase Storage**), auto-extract GPS from EXIF (`exifr`), and group photos taken within ~1km into a single location. No GPS in the photos? Tap the map to drop a pin instead.
- **Story viewer** — fullscreen vertical stories: photos auto-advance every 3s with progress bars, hold to pause, swipe down to close. Shows the reverse-geocoded place name (Nominatim/OSM), date, caption, and mood.
- **Background music** — pick a song from an Instagram-style in-app picker backed by the **Jamendo** Creative Commons catalog (search + preview, no uploads); it plays when you open the story and stops when you close it (`Howler.js`).
- **Moods** — tag each memory `happy`, `romantic`, `adventure`, or `chill`; the pin and story are themed to match.

## Tech stack

React + Vite · Leaflet + react-leaflet · leaflet.heat · leaflet.markercluster · exifr · Howler.js · Tailwind CSS · Supabase Storage · Jamendo API · localStorage. All open source / free tier.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your keys (see Configuration)
npm run dev            # start the dev server (http://localhost:5173)
npm run build          # production build
npm run preview        # preview the production build
```

Open it on your phone (or a 375px-wide viewport in dev tools) for the intended experience.

## Configuration

All keys are free and client-side (Vite exposes `VITE_*` to the browser — use only public anon / client keys). Copy `.env.example` to `.env` and fill in:

| Variable | Where to get it |
| --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | [supabase.com](https://supabase.com) → project → Settings → API |
| `VITE_SUPABASE_BUCKET` | Storage → create a **public** bucket (default `memories`) |
| `VITE_JAMENDO_CLIENT_ID` | [devportal.jamendo.com](https://devportal.jamendo.com) → register an app |

**Graceful fallback:** without Supabase keys, photos are stored inline as base64 in `localStorage` (so the app still runs). Without a Jamendo id, the song picker shows a setup hint. The app is fully functional once both are set.

## Data model

Memories are stored under the `ourmap:memories` key in `localStorage`:

```jsonc
{
  "id": "mem_...",
  "coords": { "lat": 0, "lng": 0 },
  "photos": ["https://<project>.supabase.co/storage/v1/object/public/memories/..."],
  "caption": "That perfect sunset",
  "date": "2026-06-04",
  "mood": "romantic",
  "song": {                       // or null — chosen from Jamendo
    "id": "123",
    "name": "Sunset Drive",
    "artist": "Some Artist",
    "audioUrl": "https://.../track.mp3",
    "image": "https://.../cover.jpg"
  }
}
```

> Photos and songs are now URLs, so `localStorage` only holds lightweight JSON. (If Supabase isn't configured, photos fall back to base64 data URLs and the old quota warning still applies.)

## Project structure

```
src/
  components/
    Map.jsx            # Leaflet map, clustering, heatmap wiring
    HeatmapLayer.jsx   # leaflet.heat layer
    AddMemoryModal.jsx # photo upload + EXIF + location + details wizard
    SongPicker.jsx     # Jamendo search/preview/pick (Instagram-style)
    StoryViewer.jsx    # fullscreen story playback + audio
  hooks/
    useMemories.js     # localStorage-backed store
    useExif.js         # EXIF GPS/date extraction
  utils/
    geocode.js         # Nominatim reverse geocoding (cached)
    cluster.js         # proximity grouping (haversine)
    storage.js         # Supabase Storage upload (base64 fallback)
    music.js           # Jamendo Creative Commons track search
  constants.js         # mood definitions
  App.jsx
  main.jsx
```
