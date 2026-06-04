// Reverse geocoding helpers backed by the free Nominatim (OpenStreetMap) API.
// Results are cached in-memory and in localStorage so we stay friendly to the
// public API's usage policy (max ~1 request/second, please cache).

const CACHE_KEY = 'ourmap:geocache'
const memoryCache = new Map()

function loadDiskCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    for (const [key, value] of Object.entries(parsed)) {
      memoryCache.set(key, value)
    }
  } catch {
    /* ignore corrupt cache */
  }
}
loadDiskCache()

function persistDiskCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(memoryCache)))
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

// Round coords so nearby points share a cache entry (~100m precision).
function cacheKey(lat, lng) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`
}

// Build a short, human-friendly place name from a Nominatim address object.
function formatPlace(data) {
  const a = data?.address || {}
  const locality =
    a.city ||
    a.town ||
    a.village ||
    a.hamlet ||
    a.suburb ||
    a.county ||
    a.municipality ||
    a.state_district
  const region = a.state || a.region
  const country = a.country

  const parts = [locality, region && region !== locality ? region : null, country].filter(Boolean)

  if (parts.length) return parts.join(', ')
  return data?.display_name || 'Unknown place'
}

/**
 * Reverse geocode a coordinate to a friendly place name.
 * Always resolves (never throws) so callers can render optimistically.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string>}
 */
export async function reverseGeocode(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return 'Unknown place'

  const key = cacheKey(lat, lng)
  if (memoryCache.has(key)) return memoryCache.get(key)

  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}` +
    `&zoom=12&addressdetails=1`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`Nominatim ${res.status}`)
    const data = await res.json()
    const place = formatPlace(data)
    memoryCache.set(key, place)
    persistDiskCache()
    return place
  } catch {
    // Graceful fallback: show the raw coordinates.
    const fallback = `${lat.toFixed(3)}, ${lng.toFixed(3)}`
    return fallback
  }
}
