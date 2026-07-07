// Minimal character store. In-memory + JSON file so the smoke test persists across runs.
// PRODUCTION: swap for Postgres (Neon) or Redis (Upstash) — same interface.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'

export type Character = {
  charId: string
  owner: string
  name: string
  referenceUrl: string
  referenceHash: string
  styleRef?: string
  createdAt: number
  renders: number
}

const FILE = 'data/characters.json'
mkdirSync('data', { recursive: true })

function load(): Record<string, Character> {
  if (!existsSync(FILE)) return {}
  try { return JSON.parse(readFileSync(FILE, 'utf8')) } catch { return {} }
}
function persist(all: Record<string, Character>) {
  writeFileSync(FILE, JSON.stringify(all, null, 2))
}

export async function saveCharacter(c: Character): Promise<void> {
  const all = load(); all[c.charId] = c; persist(all)
}
export async function getCharacter(charId: string): Promise<Character | undefined> {
  return load()[charId]
}
export async function bumpRenders(charId: string): Promise<void> {
  const all = load(); if (all[charId]) { all[charId].renders++; persist(all) }
}
