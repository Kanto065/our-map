// Geospatial helpers for grouping photos that were taken near each other.

const EARTH_RADIUS_M = 6371000

function toRad(deg) {
  return (deg * Math.PI) / 180
}

/**
 * Haversine distance between two coordinates, in meters.
 */
export function distanceMeters(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Average a list of coordinates into a single centroid.
 */
export function centroid(coordsList) {
  if (!coordsList.length) return null
  const sum = coordsList.reduce(
    (acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }),
    { lat: 0, lng: 0 }
  )
  return {
    lat: sum.lat / coordsList.length,
    lng: sum.lng / coordsList.length,
  }
}

/**
 * Greedily group items by proximity. Items within `radiusMeters` of an
 * existing group's centroid join that group; otherwise they seed a new one.
 *
 * @param {Array<{coords:{lat:number,lng:number}}>} items
 * @param {number} radiusMeters
 * @returns {Array<{coords:{lat,lng}, items:Array}>}
 */
export function groupByProximity(items, radiusMeters = 1000) {
  const groups = []

  for (const item of items) {
    if (!item.coords) continue
    let placed = false

    for (const group of groups) {
      if (distanceMeters(group.coords, item.coords) <= radiusMeters) {
        group.items.push(item)
        // Re-center the group so the centroid stays accurate.
        group.coords = centroid(group.items.map((i) => i.coords))
        placed = true
        break
      }
    }

    if (!placed) {
      groups.push({ coords: { ...item.coords }, items: [item] })
    }
  }

  return groups
}
