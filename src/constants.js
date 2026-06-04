// Shared mood definitions used across the map pins, add flow, and story viewer.
export const MOODS = {
  happy: {
    key: 'happy',
    label: 'Happy',
    emoji: '😄',
    color: '#fbbf24', // amber
  },
  romantic: {
    key: 'romantic',
    label: 'Romantic',
    emoji: '💕',
    color: '#fb7185', // rose
  },
  adventure: {
    key: 'adventure',
    label: 'Adventure',
    emoji: '🏔️',
    color: '#34d399', // emerald
  },
  chill: {
    key: 'chill',
    label: 'Chill',
    emoji: '🌊',
    color: '#60a5fa', // blue
  },
}

export const MOOD_LIST = Object.values(MOODS)

// Photos taken within this radius are grouped into one location/memory.
export const GROUP_RADIUS_METERS = 1000
