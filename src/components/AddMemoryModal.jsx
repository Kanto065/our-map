import { useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useExif, fileToDataURL } from '../hooks/useExif.js'
import { groupByProximity } from '../utils/cluster.js'
import { MOOD_LIST, GROUP_RADIUS_METERS } from '../constants.js'

const heartIcon = L.divIcon({
  className: 'om-pin',
  html: `<div style="font-size:30px;filter:drop-shadow(0 3px 4px rgba(0,0,0,.6))">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
})

// Mini map used as the tap-to-place fallback when no EXIF GPS is found.
function LocationPicker({ value, onChange }) {
  function ClickHandler() {
    useMapEvents({
      click(e) {
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
      },
    })
    return null
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-navy-600">
      <MapContainer
        center={value ? [value.lat, value.lng] : [20, 0]}
        zoom={value ? 11 : 2}
        zoomControl={false}
        className="h-56 w-full"
      >
        <TileLayer
          className="map-tiles"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <ClickHandler />
        {value && <Marker position={[value.lat, value.lng]} icon={heartIcon} />}
      </MapContainer>
    </div>
  )
}

export default function AddMemoryModal({ onClose, onSave }) {
  const { extractGPS, extractDate } = useExif()

  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [closing, setClosing] = useState(false)

  // Photo processing results.
  const [photos, setPhotos] = useState([]) // [{ dataUrl, coords|null }]
  const [groups, setGroups] = useState([]) // proximity groups of located photos
  const [manualCoords, setManualCoords] = useState(null) // fallback placement

  // Details.
  const [caption, setCaption] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [mood, setMood] = useState('romantic')
  const [audio, setAudio] = useState(null) // { dataUrl, name }

  const fileInputRef = useRef(null)
  const audioInputRef = useRef(null)

  const hasGps = groups.length > 0
  const ungroupedCount = photos.filter((p) => !p.coords).length

  function requestClose() {
    setClosing(true)
    setTimeout(onClose, 280)
  }

  // ---- Step 1: photo selection & EXIF processing ----
  async function handlePhotos(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setBusy(true)
    try {
      // Process each file into { dataUrl, coords, date }, keeping the photo
      // ↔ coordinate pairing intact.
      const paired = await Promise.all(
        files.map(async (file) => {
          const [dataUrl, coords, exifDate] = await Promise.all([
            fileToDataURL(file),
            extractGPS(file),
            extractDate(file),
          ])
          return { dataUrl, coords, exifDate }
        })
      )

      const grouped = groupByProximity(
        paired.filter((p) => p.coords).map((p) => ({ coords: p.coords, dataUrl: p.dataUrl })),
        GROUP_RADIUS_METERS
      )

      const firstDate = paired.find((p) => p.exifDate)?.exifDate
      if (firstDate) setDate(firstDate)

      setPhotos(paired.map((p) => ({ dataUrl: p.dataUrl, coords: p.coords })))
      setGroups(grouped)
      setStep(2)
    } finally {
      setBusy(false)
    }
  }

  async function handleAudio(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataURL(file)
    setAudio({ dataUrl, name: file.name })
  }

  function canSave() {
    if (!photos.length) return false
    return hasGps || !!manualCoords
  }

  function handleSave() {
    if (!canSave()) return

    const drafts = []

    if (hasGps) {
      // One memory per proximity group. Photos with no GPS ride along with the
      // first group so they aren't lost.
      groups.forEach((group, idx) => {
        const groupPhotos = group.items.map((i) => i.dataUrl)
        if (idx === 0) {
          groupPhotos.push(...photos.filter((p) => !p.coords).map((p) => p.dataUrl))
        }
        drafts.push({
          coords: group.coords,
          photos: groupPhotos,
          caption,
          date,
          mood,
          audioFile: audio?.dataUrl || null,
        })
      })
    } else {
      // No EXIF anywhere — single location placed manually on the map.
      drafts.push({
        coords: manualCoords,
        photos: photos.map((p) => p.dataUrl),
        caption,
        date,
        mood,
        audioFile: audio?.dataUrl || null,
      })
    }

    onSave(drafts)
    requestClose()
  }

  return (
    <div
      className={`fixed inset-0 z-[1000] flex items-end justify-center sm:items-center ${
        closing ? 'animate-fade-in' : 'animate-fade-in'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={requestClose} />

      {/* Sheet */}
      <div
        className={`glass relative z-10 flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl border border-navy-600 shadow-2xl sm:rounded-3xl ${
          closing ? 'animate-slide-down' : 'animate-slide-up'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div className="h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/20 absolute left-1/2 top-2" />
          <h2 className="text-lg font-semibold tracking-tight">
            {step === 1 && 'Add a memory'}
            {step === 2 && 'Where was it?'}
            {step === 3 && 'Tell the story'}
          </h2>
          <button
            onClick={requestClose}
            className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-5 pb-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-rose-glow' : 'bg-white/15'
              }`}
            />
          ))}
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-2">
          {/* ---- STEP 1: photos ---- */}
          {step === 1 && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="text-5xl">📸</div>
              <p className="text-sm text-white/70">
                Pick the photos from this trip. We'll read GPS from each photo automatically.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotos}
              />
              <button
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-rose-glow px-6 py-3 font-semibold text-navy-900 shadow-lg shadow-rose-glow/30 transition active:scale-95 disabled:opacity-60"
              >
                {busy ? 'Reading photos…' : 'Choose photos'}
              </button>
            </div>
          )}

          {/* ---- STEP 2: location ---- */}
          {step === 2 && (
            <div className="space-y-4 py-2">
              {/* Thumbnails */}
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={p.dataUrl}
                    alt=""
                    className="h-16 w-16 flex-shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                  />
                ))}
              </div>

              {hasGps ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm">
                  <p className="font-medium text-emerald-300">
                    📍 Found GPS in {photos.length - ungroupedCount} of {photos.length} photo
                    {photos.length === 1 ? '' : 's'}.
                  </p>
                  <p className="mt-1 text-white/70">
                    {groups.length === 1
                      ? 'All photos map to one location.'
                      : `Detected ${groups.length} separate locations — we'll create a memory for each.`}
                    {ungroupedCount > 0 &&
                      ` ${ungroupedCount} photo without GPS will join the first location.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
                    No GPS found in these photos. Tap the map to place this memory.
                  </div>
                  <LocationPicker value={manualCoords} onChange={setManualCoords} />
                  {manualCoords && (
                    <p className="text-center text-xs text-white/50">
                      Placed at {manualCoords.lat.toFixed(4)}, {manualCoords.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-full border border-white/15 py-3 font-medium text-white/80 transition active:scale-95"
                >
                  Back
                </button>
                <button
                  disabled={!hasGps && !manualCoords}
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-full bg-rose-glow py-3 font-semibold text-navy-900 transition active:scale-95 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ---- STEP 3: details ---- */}
          {step === 3 && (
            <div className="space-y-4 py-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={2}
                  placeholder="That perfect sunset together…"
                  className="w-full resize-none rounded-2xl border border-navy-600 bg-navy-800/60 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-rose-glow"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border border-navy-600 bg-navy-800/60 px-4 py-3 text-sm outline-none focus:border-rose-glow"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">
                  Mood
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MOOD_LIST.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setMood(m.key)}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm transition active:scale-95 ${
                        mood === m.key
                          ? 'border-transparent text-navy-900'
                          : 'border-navy-600 bg-navy-800/40 text-white/80'
                      }`}
                      style={mood === m.key ? { background: m.color } : undefined}
                    >
                      <span className="text-lg">{m.emoji}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">
                  Background song (optional)
                </label>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudio}
                />
                <button
                  onClick={() => audioInputRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-2xl border border-navy-600 bg-navy-800/60 px-4 py-3 text-sm text-white/80 transition active:scale-95"
                >
                  <span className="text-lg">🎵</span>
                  <span className="truncate">{audio ? audio.name : 'Add an mp3 to set the mood'}</span>
                </button>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-full border border-white/15 py-3 font-medium text-white/80 transition active:scale-95"
                >
                  Back
                </button>
                <button
                  disabled={!canSave()}
                  onClick={handleSave}
                  className="flex-1 rounded-full bg-rose-glow py-3 font-semibold text-navy-900 shadow-lg shadow-rose-glow/30 transition active:scale-95 disabled:opacity-50"
                >
                  Save memory
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="safe-bottom" />
      </div>
    </div>
  )
}
