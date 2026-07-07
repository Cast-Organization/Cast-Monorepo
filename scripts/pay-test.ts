// Buyer test — pays $0.01 for /cast/echo to validate the x402 loop. (pnpm run pay:test)
import { createBuyer } from './x402-buyer.js'
import { NETWORK } from '../src/config.js'

async function main() {
  const { address, paidPost } = createBuyer()
  console.log(`Buyer ${address}\nPOST /cast/echo on ${NETWORK} (paying via x402)…\n`)

  const r = await paidPost('/cast/echo', { ping: 'hello from pay-test' })
  console.log('← status:', r.status)
  console.log('  body  :', r.body)
  console.log(r.settle ? `\n✅ SETTLED: ${JSON.stringify(r.settle, null, 2)}` : '\n(no settlement parsed)')
}

main().catch((e) => { console.error('pay-test error:', e?.shortMessage ?? e?.message ?? e); process.exit(1) })
