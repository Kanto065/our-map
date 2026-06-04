import { useEffect, useRef, useState } from 'react'
import { isMusicConfigured, searchTracks } from '../utils/music.js'

// Instagram-style song picker: search the Jamendo (Creative Commons) catalog,
// preview a track, and pick one. No uploads.
export default function SongPicker({ value, onChange }) {
  const configured = isMusicConfigured()

  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [previewId, setPreviewId] = useState(null)

  const audioRef = useRef(null)

  // Debounced search (also runs once on mount for the popular feed).
  useEffect(() => {
    if (!configured) return
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const results = await searchTracks(query, { signal: controller.signal })
        setTracks(results)
      } catch (e) {
        if (e.name !== 'AbortError') setError('Could not load tracks. Check your connection.')
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [query, configured])

  // Tidy up the preview audio on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  function togglePreview(track) {
    if (previewId === track.id) {
      audioRef.current?.pause()
      setPreviewId(null)
      return
    }
    audioRef.current?.pause()
    const audio = new Audio(track.audioUrl)
    audio.volume = 0.85
    audio.play().catch(() => {})
    audio.onended = () => setPreviewId(null)
    audioRef.current = audio
    setPreviewId(track.id)
  }

  function select(track) {
    onChange(value?.id === track.id ? null : track)
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
        Music search needs a free Jamendo client id. Add{' '}
        <code className="rounded bg-black/30 px-1">VITE_JAMENDO_CLIENT_ID</code> to your{' '}
        <code className="rounded bg-black/30 px-1">.env</code> (see <code>.env.example</code>).
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs (Jamendo · Creative Commons)"
        className="w-full rounded-2xl border border-navy-600 bg-navy-800/60 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-rose-glow"
      />

      {value && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-glow/40 bg-rose-glow/10 px-3 py-2 text-sm">
          <span>🎵</span>
          <span className="truncate">
            <span className="font-medium">{value.name}</span>{' '}
            <span className="text-white/50">· {value.artist}</span>
          </span>
        </div>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}

      <div className="no-scrollbar max-h-56 space-y-1 overflow-y-auto">
        {loading && <p className="py-2 text-center text-xs text-white/40">Loading…</p>}
        {!loading && !tracks.length && (
          <p className="py-2 text-center text-xs text-white/40">No tracks found.</p>
        )}
        {tracks.map((t) => {
          const selected = value?.id === t.id
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 rounded-xl border px-2 py-1.5 transition ${
                selected ? 'border-rose-glow bg-rose-glow/10' : 'border-transparent hover:bg-white/5'
              }`}
            >
              <button
                onClick={() => togglePreview(t)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-navy-700 text-white/90"
                aria-label={previewId === t.id ? 'Pause preview' : 'Play preview'}
              >
                {previewId === t.id ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button onClick={() => select(t)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium">{t.name}</span>{' '}
                  <span className="text-white/45">· {t.artist}</span>
                </span>
                {selected && <span className="text-rose-glow">✓</span>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
