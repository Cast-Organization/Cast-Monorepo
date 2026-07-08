// Full on-chain product loop: pay to create (mints passport) → verify ownership → pay to render.
// Usage: server running (pnpm run dev), then: pnpm run pay:flow
import { createPublicClient, http as viemHttp } from 'viem'
import { createBuyer } from './x402-buyer.js'
import { env, xLayer, NETWORK } from '../src/config.js'
import { passportAbi } from '../src/chain/abi.js'

async function main() {
  const { address, paidPost } = createBuyer()
  console.log(`Buyer ${address} on ${NETWORK}\n`)

  // 1) pay to create a character → server generates a portrait and mints an on-chain passport
  console.log('1) POST /cast/create_character ($0.50) — create + mint passport…')
  const created = await paidPost('/cast/create_character', {
    owner: address,
    name: 'Detective Miso',
    description: 'a grumpy orange cat detective in a tan trench coat',
  })
  console.log('   status:', created.status)
  const c = JSON.parse(created.body)
  console.log('   charId (tokenId):', c.charId, '| passportTx:', c.passportTx)
  console.log('   portrait:', c.portraitUrl)

  // 2) verify on-chain ownership
  const pub = createPublicClient({ chain: xLayer, transport: viemHttp(env.XLAYER_RPC) })
  const owner = (await pub.readContract({
    address: env.PASSPORT_CONTRACT, abi: passportAbi, functionName: 'ownerOf', args: [BigInt(c.charId)],
  })) as string
  console.log(`2) on-chain ownerOf(${c.charId}):`, owner,
    owner.toLowerCase() === address.toLowerCase() ? '✅ you own this character' : '⚠️ owner mismatch')

  // 3) pay to render the SAME character in a new scene
  console.log('\n3) POST /cast/render ($0.30) — same character, new scene…')
  const rendered = await paidPost('/cast/render', { charId: c.charId, scene: 'as an astronaut planting a flag on Mars' })
  console.log('   status:', rendered.status)
  console.log('   image:', JSON.parse(rendered.body).imageUrl)

  console.log('\n✅ FULL on-chain product loop complete: paid create → owned passport → paid render.')
}

main().catch((e) => { console.error('pay-flow error:', e?.shortMessage ?? e?.message ?? e); process.exit(1) })
