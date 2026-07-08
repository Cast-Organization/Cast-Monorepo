// Generate a Cast logo / avatar (1:1) with fal. Usage: pnpm run logo  [LOGO_PROMPT="..."]
import { writeFileSync, mkdirSync } from 'node:fs'
import { fluxCreatePortrait } from '../src/pipeline/fal.js'

const PROMPT = process.env.LOGO_PROMPT ??
  `A modern app icon logo for a product called "Cast", a creative tool that keeps one character consistent across many scenes. ` +
  `A single bold, friendly mascot character face with big expressive eyes, centered inside a soft rounded-square badge / picture frame, ` +
  `flat vector illustration, thick clean outlines, minimal shapes, vibrant purple-to-indigo gradient background, subtle spotlight glow, ` +
  `high contrast, iconic and memorable, perfectly centered, 1:1 square, no text, no letters, no words.`

async function main() {
  mkdirSync('assets', { recursive: true })
  const out = process.env.LOGO_OUT ?? 'assets/cast-logo.jpg'
  console.log('generating logo…')
  const { url } = await fluxCreatePortrait(PROMPT)
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  writeFileSync(out, buf)
  console.log('saved', out, `(${buf.length} bytes)`)
}
main().catch((e) => { console.error(e?.message ?? e); process.exit(1) })
