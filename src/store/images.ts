// Durable image storage. Local filesystem backend now; swap the two marked lines
// for Vercel Blob / S3 / R2 at deploy time (keep the same function signatures).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { env } from '../config.js'

const DIR = 'data/images'
mkdirSync(DIR, { recursive: true })

function extFor(mime: string | null): string {
  if (mime?.includes('png')) return 'png'
  if (mime?.includes('webp')) return 'webp'
  return 'jpg'
}
function mimeFor(key: string): string {
  if (key.endsWith('png')) return 'image/png'
  if (key.endsWith('webp')) return 'image/webp'
  return 'image/jpeg'
}

/** Download an image from a (possibly temporary) URL and store it durably. */
export async function saveFromUrl(sourceUrl: string): Promise<{ key: string; url: string; bytes: Buffer }> {
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`saveFromUrl: fetch failed ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  const key = `${randomUUID()}.${extFor(res.headers.get('content-type'))}`
  writeFileSync(`${DIR}/${key}`, bytes) // <-- SWAP: Blob/S3 put(key, bytes, {access:'public'})
  return { key, url: `${env.PUBLIC_BASE_URL}/images/${key}`, bytes }
}

/** Read stored bytes (used to pass a reference image to fal as a data URI). */
export function readBytes(key: string): Buffer {
  return readFileSync(`${DIR}/${key}`) // <-- SWAP: Blob/S3 get(key)
}

/** Encode stored bytes as a data URI so fal can consume it without reaching our server. */
export function toDataUri(bytes: Buffer, key: string): string {
  return `data:${mimeFor(key)};base64,${bytes.toString('base64')}`
}

/** Local disk path for a stored key (dev scripts only). */
export function localPath(key: string): string {
  return `${DIR}/${key}`
}
