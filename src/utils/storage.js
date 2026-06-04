// Photo storage backed by Supabase Storage (open-source, S3-compatible).
//
// Configure via .env (see .env.example):
//   VITE_SUPABASE_URL        e.g. https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY   the project's public anon key
//   VITE_SUPABASE_BUCKET     public bucket name (default: "memories")
//
// If the env vars are missing, we transparently fall back to inlining the
// photo as a base64 data URL so the app still works without any setup.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'memories'

let client = null
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export function isStorageConfigured() {
  return !!client
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function extOf(file) {
  const fromName = file.name?.split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  const fromType = file.type?.split('/').pop()
  return (fromType || 'jpg').toLowerCase()
}

/**
 * Upload a single image File to Supabase Storage and return its public URL.
 * Falls back to a base64 data URL when Supabase isn't configured (or on error)
 * so a memory is never lost.
 *
 * @param {File} file
 * @returns {Promise<string>} a URL (https) or data URL usable as an <img> src
 */
export async function uploadPhoto(file) {
  if (!client) {
    return fileToDataURL(file)
  }

  const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extOf(file)}`

  try {
    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })
    if (error) throw error

    const { data } = client.storage.from(BUCKET).getPublicUrl(path)
    if (!data?.publicUrl) throw new Error('No public URL returned')
    return data.publicUrl
  } catch (err) {
    // Network / config / policy error — degrade gracefully rather than fail.
    console.error('Supabase upload failed, falling back to base64:', err)
    return fileToDataURL(file)
  }
}

/**
 * Upload many files in parallel, preserving order.
 * @param {File[]} files
 * @returns {Promise<string[]>}
 */
export function uploadPhotos(files) {
  return Promise.all(files.map((f) => uploadPhoto(f)))
}
