// Music search backed by the Jamendo API — a catalog of Creative Commons
// licensed tracks. Used for the in-app "choose a song" picker (no uploads).
//
// Configure via .env:
//   VITE_JAMENDO_CLIENT_ID   free client id from https://devportal.jamendo.com
//
// Docs: https://developer.jamendo.com/v3.0/tracks

const CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID
const BASE = 'https://api.jamendo.com/v3.0'

export function isMusicConfigured() {
  return !!CLIENT_ID
}

function mapTrack(t) {
  return {
    id: String(t.id),
    name: t.name,
    artist: t.artist_name,
    audioUrl: t.audio, // streamable mp3 URL
    image: t.album_image || t.image || '',
    duration: t.duration, // seconds
  }
}

/**
 * Search Jamendo for tracks matching a query. When the query is empty we
 * return a "popular" feed so the picker isn't blank on open.
 *
 * @param {string} query
 * @param {{ limit?: number, signal?: AbortSignal }} [opts]
 * @returns {Promise<Array>}
 */
export async function searchTracks(query, { limit = 30, signal } = {}) {
  if (!CLIENT_ID) return []

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    format: 'json',
    limit: String(limit),
    audioformat: 'mp32',
    include: 'musicinfo',
    imagesize: '200',
  })

  const q = query.trim()
  if (q) {
    params.set('namesearch', q)
    params.set('order', 'popularity_total')
  } else {
    // Popular feed as a sensible default.
    params.set('order', 'popularity_month')
  }

  const res = await fetch(`${BASE}/tracks/?${params.toString()}`, { signal })
  if (!res.ok) throw new Error(`Jamendo ${res.status}`)
  const data = await res.json()
  return (data.results || []).map(mapTrack)
}
