import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import HeatmapLayer from './HeatmapLayer.jsx'
import { MOODS } from '../constants.js'

// Default view: a gentle world view until the user adds memories.
const DEFAULT_CENTER = [20, 0]
const DEFAULT_ZOOM = 2

// Build a heart-shaped pin icon tinted by the memory's mood.
function makePinIcon(memory) {
  const mood = MOODS[memory.mood] || MOODS.happy
  const thumb = memory.photos?.[0]
  const inner = thumb
    ? `<img src="${thumb}" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid ${mood.color};box-shadow:0 0 10px ${mood.color};" />`
    : `<div style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;background:${mood.color};box-shadow:0 0 10px ${mood.color};">${mood.emoji}</div>`

  return L.divIcon({
    className: 'om-pin',
    html: `<div style="transform:translateY(-4px)">${inner}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  })
}

// Cluster bubble sized & labeled by how many memories it holds.
function makeClusterIcon(cluster) {
  const count = cluster.getChildCount()
  const size = count < 5 ? 42 : count < 15 ? 52 : 62
  return L.divIcon({
    html: `<div class="om-cluster" style="width:${size}px;height:${size}px;font-size:${
      count < 15 ? 15 : 17
    }px;">${count}</div>`,
    className: 'om-cluster-wrap',
    iconSize: [size, size],
  })
}

/**
 * Imperatively manages a leaflet.markercluster group of memory pins.
 * react-leaflet has no first-class wrapper for markercluster, so we drive
 * the plugin directly through the map instance.
 */
function ClusterLayer({ memories, onSelect }) {
  const map = useMap()
  const groupRef = useRef(null)

  useEffect(() => {
    if (!groupRef.current) {
      groupRef.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 50,
        iconCreateFunction: makeClusterIcon,
      })
      map.addLayer(groupRef.current)
    }

    const group = groupRef.current
    group.clearLayers()

    const markers = memories
      .filter((m) => m.coords)
      .map((m) => {
        const marker = L.marker([m.coords.lat, m.coords.lng], {
          icon: makePinIcon(m),
        })
        marker.on('click', () => onSelect(m))
        return marker
      })

    group.addLayers(markers)
  }, [map, memories, onSelect])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (groupRef.current) {
        map.removeLayer(groupRef.current)
        groupRef.current = null
      }
    }
  }, [map])

  return null
}

// Smoothly fit the map to all memories the first time they appear.
function FitToMemories({ memories }) {
  const map = useMap()
  const didFit = useRef(false)

  useEffect(() => {
    if (didFit.current) return
    const located = memories.filter((m) => m.coords)
    if (!located.length) return

    didFit.current = true
    if (located.length === 1) {
      map.setView([located[0].coords.lat, located[0].coords.lng], 11, { animate: true })
    } else {
      const bounds = L.latLngBounds(located.map((m) => [m.coords.lat, m.coords.lng]))
      map.fitBounds(bounds.pad(0.25), { animate: true })
    }
  }, [map, memories])

  return null
}

export default function Map({ memories, onSelect }) {
  const heatPoints = useMemo(() => memories.filter((m) => m.coords), [memories])

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      attributionControl
      className="absolute inset-0 h-full w-full"
      worldCopyJump
    >
      <TileLayer
        className="map-tiles"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <HeatmapLayer points={heatPoints} />
      <ClusterLayer memories={memories} onSelect={onSelect} />
      <FitToMemories memories={memories} />
    </MapContainer>
  )
}
