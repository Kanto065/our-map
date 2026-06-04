import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'ourmap:memories'

function loadMemories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(memories) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories))
  } catch (err) {
    // Most likely the localStorage quota was exceeded (base64 photos/audio
    // are large). Surface it so the UI can warn the user.
    console.error('Failed to persist memories:', err)
    throw err
  }
}

function makeId() {
  return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Central store for travel memories, persisted to localStorage.
 *
 * Memory shape:
 * { id, coords:{lat,lng}, photos:[base64], caption, date, mood, audioFile:base64|null, createdAt }
 */
export function useMemories() {
  const [memories, setMemories] = useState(loadMemories)
  const [error, setError] = useState(null)

  // Keep localStorage in sync whenever memories change.
  useEffect(() => {
    try {
      persist(memories)
      setError(null)
    } catch {
      setError('Storage is full — try removing some memories or using smaller files.')
    }
  }, [memories])

  // Sync across browser tabs.
  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setMemories(loadMemories())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addMemory = useCallback((memory) => {
    const record = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      coords: memory.coords,
      photos: memory.photos || [],
      caption: memory.caption || '',
      date: memory.date || new Date().toISOString().slice(0, 10),
      mood: memory.mood || 'happy',
      audioFile: memory.audioFile || null,
    }
    setMemories((prev) => [...prev, record])
    return record
  }, [])

  const updateMemory = useCallback((id, patch) => {
    setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const removeMemory = useCallback((id) => {
    setMemories((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const clearAll = useCallback(() => setMemories([]), [])

  return { memories, addMemory, updateMemory, removeMemory, clearAll, error }
}
