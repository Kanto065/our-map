import { useState } from 'react'
import Map from './components/Map.jsx'
import AddMemoryModal from './components/AddMemoryModal.jsx'
import StoryViewer from './components/StoryViewer.jsx'
import { useMemories } from './hooks/useMemories.js'

export default function App() {
  const { memories, addMemory, error } = useMemories()
  const [adding, setAdding] = useState(false)
  const [active, setActive] = useState(null) // memory being viewed

  function handleSave(drafts) {
    drafts.forEach((d) => addMemory(d))
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-navy-900">
      {/* Map */}
      <Map memories={memories} onSelect={setActive} />

      {/* App title chip */}
      <div className="safe-top pointer-events-none absolute left-0 right-0 top-0 z-[500] flex justify-center pt-4">
        <div className="glass pointer-events-auto flex items-center gap-2 rounded-full border border-navy-600 px-4 py-2 shadow-lg">
          <span className="text-rose-glow">❤</span>
          <span className="text-sm font-semibold tracking-tight">Our Map</span>
          <span className="text-xs text-white/40">
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
          </span>
        </div>
      </div>

      {/* Empty state hint */}
      {memories.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center px-8">
          <div className="glass pointer-events-auto max-w-xs rounded-3xl border border-navy-600 p-6 text-center shadow-2xl animate-pop-in">
            <div className="mb-3 text-5xl">🗺️💕</div>
            <h2 className="text-lg font-semibold">Start your map</h2>
            <p className="mt-1 text-sm text-white/60">
              Add photos from your trips together and watch your shared world light up.
            </p>
            <button
              onClick={() => setAdding(true)}
              className="mt-4 rounded-full bg-rose-glow px-5 py-2.5 font-semibold text-navy-900 shadow-lg shadow-rose-glow/30 transition active:scale-95"
            >
              Add your first memory
            </button>
          </div>
        </div>
      )}

      {/* Storage error toast */}
      {error && (
        <div className="absolute left-1/2 top-20 z-[600] w-[90%] max-w-sm -translate-x-1/2 rounded-2xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-center text-sm text-red-100 backdrop-blur animate-fade-in">
          {error}
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => setAdding(true)}
        className="safe-bottom absolute bottom-6 right-6 z-[500] flex h-16 w-16 items-center justify-center rounded-full bg-rose-glow text-navy-900 shadow-lg transition active:scale-90 animate-pulse-glow"
        aria-label="Add memory"
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      {/* Modals */}
      {adding && <AddMemoryModal onClose={() => setAdding(false)} onSave={handleSave} />}
      {active && <StoryViewer memory={active} onClose={() => setActive(null)} />}
    </div>
  )
}
