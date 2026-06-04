import { useCallback, useEffect, useRef, useState } from 'react'
import { Howl } from 'howler'
import { reverseGeocode } from '../utils/geocode.js'
import { MOODS } from '../constants.js'

const PHOTO_DURATION = 3000 // ms per photo

export default function StoryViewer({ memory, onClose }) {
  const photos = memory.photos?.length ? memory.photos : []
  const mood = MOODS[memory.mood] || MOODS.happy

  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0) // 0..1 for the current photo
  const [paused, setPaused] = useState(false)
  const [place, setPlace] = useState('Locating…')
  const [dragY, setDragY] = useState(0)
  const [closing, setClosing] = useState(false)

  const elapsedRef = useRef(0)
  const rafRef = useRef(null)
  const lastTsRef = useRef(0)
  const howlRef = useRef(null)
  const pointerRef = useRef(null)

  // ---- Reverse geocode the location name ----
  useEffect(() => {
    let active = true
    if (memory.coords) {
      reverseGeocode(memory.coords.lat, memory.coords.lng).then((name) => {
        if (active) setPlace(name)
      })
    } else {
      setPlace('Somewhere special')
    }
    return () => {
      active = false
    }
  }, [memory])

  // ---- Background song (plays on open, stops on close) ----
  // Supports the Jamendo song picker (memory.song.audioUrl) and legacy
  // uploaded audio (memory.audioFile).
  const audioSrc = memory.song?.audioUrl || memory.audioFile || null

  useEffect(() => {
    if (!audioSrc) return
    const howl = new Howl({
      src: [audioSrc],
      format: ['mp3'], // Jamendo stream URLs have no file extension
      html5: true,
      loop: true,
      volume: 0.85,
    })
    howl.play()
    howlRef.current = howl
    return () => {
      howl.stop()
      howl.unload()
      howlRef.current = null
    }
  }, [memory])

  // Pause/resume the song alongside the story.
  useEffect(() => {
    const howl = howlRef.current
    if (!howl) return
    if (paused) howl.pause()
    else if (!howl.playing()) howl.play()
  }, [paused])

  const handleClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 280)
  }, [closing, onClose])

  const goTo = useCallback(
    (i) => {
      elapsedRef.current = 0
      setProgress(0)
      setIndex(i)
    },
    []
  )

  const next = useCallback(() => {
    if (index < photos.length - 1) goTo(index + 1)
    else handleClose()
  }, [index, photos.length, goTo, handleClose])

  const prev = useCallback(() => {
    if (index > 0) goTo(index - 1)
    else goTo(0)
  }, [index, goTo])

  // ---- Auto-advance animation loop ----
  useEffect(() => {
    if (paused || closing || !photos.length) return

    lastTsRef.current = performance.now()
    function tick(now) {
      const dt = now - lastTsRef.current
      lastTsRef.current = now
      elapsedRef.current += dt
      const p = Math.min(1, elapsedRef.current / PHOTO_DURATION)
      setProgress(p)
      if (p >= 1) {
        next()
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [paused, closing, index, photos.length, next])

  // ---- Pointer gestures: tap to navigate, hold to pause, swipe down to close ----
  function onPointerDown(e) {
    pointerRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      moved: false,
    }
    setPaused(true)
  }

  function onPointerMove(e) {
    const p = pointerRef.current
    if (!p) return
    const dy = e.clientY - p.y
    const dx = e.clientX - p.x
    if (Math.abs(dy) > 10 || Math.abs(dx) > 10) p.moved = true
    // Only react to downward drags for the swipe-to-close affordance.
    if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
      setDragY(dy)
    }
  }

  function onPointerUp(e) {
    const p = pointerRef.current
    pointerRef.current = null
    setPaused(false)

    if (!p) return
    const dy = e.clientY - p.y
    const dx = e.clientX - p.x
    const dt = performance.now() - p.t

    // Swipe down to close.
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) {
      handleClose()
      return
    }
    setDragY(0)

    // Quick tap (not a drag/hold) → navigate by tap zone.
    if (!p.moved && dt < 250) {
      const w = window.innerWidth
      if (p.x < w * 0.33) prev()
      else next()
    }
  }

  const dragOpacity = Math.max(0, 1 - dragY / 500)

  return (
    <div
      className={`fixed inset-0 z-[1100] select-none bg-black ${
        closing ? 'animate-slide-down' : 'animate-fade-in'
      }`}
      style={{
        transform: dragY ? `translateY(${dragY}px) scale(${1 - dragY / 2500})` : undefined,
        opacity: dragY ? dragOpacity : undefined,
        transition: pointerRef.current ? 'none' : 'transform 0.25s, opacity 0.25s',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Photo */}
      <div className="absolute inset-0 flex items-center justify-center bg-navy-900">
        {photos.length ? (
          <img
            key={index}
            src={photos[index]}
            alt={memory.caption || 'memory'}
            className="h-full w-full animate-fade-in object-cover"
            draggable={false}
          />
        ) : (
          <div className="text-6xl">{mood.emoji}</div>
        )}
        {/* Readability gradients */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      {/* Progress bars */}
      <div className="safe-top absolute left-0 right-0 top-0 flex gap-1 px-3 pt-3">
        {photos.map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white"
              style={{
                width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
                transition: i === index ? 'none' : 'width 0.2s',
              }}
            />
          </div>
        ))}
      </div>

      {/* Top bar: close + mood */}
      <div className="absolute left-0 right-0 top-6 flex items-center justify-between px-4 pt-2">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold text-navy-900 shadow"
          style={{ background: mood.color }}
        >
          {mood.emoji} {mood.label}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleClose()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded-full bg-black/40 p-2 text-white/90 backdrop-blur"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Pause indicator */}
      {paused && pointerRef.current && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/40 p-4 backdrop-blur">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </div>
        </div>
      )}

      {/* Bottom info card */}
      <div className="safe-bottom absolute bottom-0 left-0 right-0 px-5 pb-7">
        <div className="flex items-center gap-2 text-sm text-white/90">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="font-medium">{place}</span>
        </div>
        {memory.caption && (
          <p className="mt-2 text-lg font-medium leading-snug text-white drop-shadow">
            {memory.caption}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
          <span>{formatDate(memory.date)}</span>
          {photos.length > 1 && (
            <span>
              {index + 1} / {photos.length}
            </span>
          )}
          {memory.song ? (
            <span className="truncate">🎵 {memory.song.name} · {memory.song.artist}</span>
          ) : (
            memory.audioFile && <span>🎵 playing</span>
          )}
        </div>
        <p className="mt-3 text-center text-[11px] text-white/40">
          Tap to advance · hold to pause · swipe down to close
        </p>
      </div>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}
