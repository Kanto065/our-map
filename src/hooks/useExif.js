import { useCallback } from 'react'
import exifr from 'exifr'

// Read a File as a base64 data URL (what we store in localStorage).
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Hook exposing helpers to extract GPS coordinates from image EXIF metadata.
 */
export function useExif() {
  // Extract { lat, lng } from a single image File, or null if unavailable.
  const extractGPS = useCallback(async (file) => {
    try {
      const gps = await exifr.gps(file)
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        return { lat: gps.latitude, lng: gps.longitude }
      }
    } catch {
      /* unreadable / no EXIF — fall through */
    }
    return null
  }, [])

  // Also try to pull the capture date from EXIF (DateTimeOriginal).
  const extractDate = useCallback(async (file) => {
    try {
      const meta = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate'])
      const d = meta?.DateTimeOriginal || meta?.CreateDate
      if (d instanceof Date && !isNaN(d)) {
        return d.toISOString().slice(0, 10)
      }
    } catch {
      /* ignore */
    }
    return null
  }, [])

  /**
   * Process a list of image Files into:
   *   { photos:[base64], located:[{lat,lng}], date:string|null }
   */
  const processFiles = useCallback(
    async (files) => {
      const fileArr = Array.from(files)
      const photos = []
      const located = []
      let date = null

      for (const file of fileArr) {
        const [dataUrl, gps, exifDate] = await Promise.all([
          fileToDataURL(file),
          extractGPS(file),
          extractDate(file),
        ])
        photos.push(dataUrl)
        if (gps) located.push(gps)
        if (!date && exifDate) date = exifDate
      }

      return { photos, located, date }
    },
    [extractGPS, extractDate]
  )

  return { extractGPS, extractDate, processFiles, fileToDataURL }
}
