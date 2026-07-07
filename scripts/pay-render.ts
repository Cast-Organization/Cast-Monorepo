// Full product loop: pay $0.30 for /cast/render → get the SAME character in a new scene.
// Reuses a character from data/characters.json (run `pnpm run smoke` first), else creates one.
// Usage: server running (pnpm run dev), then: pnpm run pay:render   [SCENE="..."]
import { existsSync, readFileSync } from 'node:fs'
import { createBuyer } from './x402-buyer.js'
import { createCharacter } from '../src/pipeline/createCharacter.js'
import { NETWORK } from '../src/config.js'

async function ensureCharacter(owner: `0x${string}`): Promise<string> {
  if (existsSync('data/characters.json')) {
    const all = JSON.parse(readFileSync('data/characters.json', 'utf8')) as Record<string, { charId: string }>
    const first = Object.values(all)[0]
    if (first?.charId) return first.charId
  }
  console.log('No character found — creating one locally (off-chain)…')
  const c = await createCharacter({
    owner, name: 'Detective Miso',
    description: process.env.CHAR ?? 'a grumpy orange cat detective in a tan trench coat',
    mint: false,
  })
  return c.charId
}

async function main() {
  const { address, paidPost } = createBuyer()
  const charId = await ensureCharacter(address)
  const scene = process.env.SCENE ?? 'riding a skateboard through Times Square at night'

  console.log(`Buyer ${address}`)
  console.log(`Paying $0.30 to render char ${charId.slice(0, 12)}… on ${NETWORK}`)
  console.log(`Scene: "${scene}"\n`)

  const r = await paidPost('/cast/render', { charId, scene })
  console.log('← status:', r.status)
  console.log('  body  :', r.body) // { charId, imageUrl }
  console.log(r.settle ? `\n✅ SETTLED: ${JSON.stringify(r.settle, null, 2)}` : '\n(no settlement parsed)')
}

main().catch((e) => { console.error('pay-render error:', e?.shortMessage ?? e?.message ?? e); process.exit(1) })
