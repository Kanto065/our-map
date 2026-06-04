import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

/**
 * Renders a leaflet.heat heatmap layer over the given points.
 *
 * @param {Array<{coords:{lat,lng}, weight?:number}>} points
 */
export default function HeatmapLayer({ points = [] }) {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    const heatPoints = points
      .filter((p) => p.coords)
      .map((p) => [p.coords.lat, p.coords.lng, p.weight ?? 0.8])

    if (!layerRef.current) {
      layerRef.current = L.heatLayer(heatPoints, {
        radius: 35,
        blur: 25,
        maxZoom: 13,
        minOpacity: 0.35,
        gradient: {
          0.2: '#3b1d4e',
          0.4: '#7a2a6b',
          0.6: '#c0397a',
          0.8: '#fb7185',
          1.0: '#ffd1dc',
        },
      })
      layerRef.current.addTo(map)
    } else {
      layerRef.current.setLatLngs(heatPoints)
    }
  }, [map, points])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map])

  return null
}
