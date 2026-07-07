// Safe OKX credential check — authenticates against the facilitator, moves NO money.
// Run: pnpm run check:okx
import dotenv from 'dotenv'
dotenv.config({ override: true }) // .env wins over any stale shell var

import { OKXFacilitatorClient } from '@okxweb3/x402-core'

const { OKX_API_KEY = '', OKX_SECRET_KEY = '', OKX_PASSPHRASE = '' } = process.env

const mask = (s: string) => (s ? `${s.slice(0, 6)}…${s.slice(-2)} (len ${s.length})` : '(EMPTY)')

async function main() {
  console.log('Loaded from .env:')
  console.log('  OKX_API_KEY   :', mask(OKX_API_KEY))
  console.log('  OKX_SECRET_KEY:', OKX_SECRET_KEY ? `set (len ${OKX_SECRET_KEY.length})` : '(EMPTY)')
  console.log('  OKX_PASSPHRASE:', OKX_PASSPHRASE ? `set (len ${OKX_PASSPHRASE.length})` : '(EMPTY)')

  if (!OKX_API_KEY || !OKX_SECRET_KEY || !OKX_PASSPHRASE) {
    console.error('\n❌ One or more OKX_* values are empty in .env. Fill them and retry.')
    process.exit(1)
  }

  const facilitator = new OKXFacilitatorClient({
    apiKey: OKX_API_KEY,
    secretKey: OKX_SECRET_KEY,
    passphrase: OKX_PASSPHRASE,
  })

  console.log('\nCalling facilitator.getSupported() (auth check, no payment)…')
  try {
    const res = await facilitator.getSupported()
    console.log('\n✅ AUTH OK — the OKX facilitator accepted your credentials.')
    console.log('Supported schemes/networks:', JSON.stringify(res, null, 2))
    console.log('\nIf X Layer (eip155:196) appears above, you are cleared for Phase 2 payments.')
  } catch (e: any) {
    console.error('\n❌ Facilitator rejected the request.')
    console.error('  message:', e?.message)
    if (e?.status) console.error('  status :', e.status)
    if (e?.body) console.error('  body   :', JSON.stringify(e.body))
    console.error('\nLikely causes: wrong/rotated key, wrong passphrase, key from the wrong OKX portal,')
    console.error('missing permission scope, or a region block. (This is exactly what we want to learn now.)')
    process.exit(1)
  }
}

main()
