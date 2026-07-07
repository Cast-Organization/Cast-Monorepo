// Buyer client — makes ONE real x402-paid request to the local Cast server and
// prints the settlement. Defaults to the cheap /cast/echo ($0.01) route.
// Usage: start the server (pnpm run dev) in one terminal, then: pnpm run pay:test
import { createPublicClient, http as viemHttp } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { x402Client, x402HTTPClient } from '@okxweb3/x402-core/client'
import { registerExactEvmScheme } from '@okxweb3/x402-evm/exact/client'
import type { ClientEvmSigner } from '@okxweb3/x402-evm'
import { env, xLayer, NETWORK } from '../src/config.js'

const BASE = `http://localhost:${env.PORT}`
const ROUTE = process.env.PAY_ROUTE ?? '/cast/echo'
const BODY = process.env.PAY_BODY ?? JSON.stringify({ ping: 'hello from pay-test' })

async function main() {
  if (!env.SIGNER_PK) throw new Error('SIGNER_PK not set in .env')
  const account = privateKeyToAccount(env.SIGNER_PK)
  const publicClient = createPublicClient({ chain: xLayer, transport: viemHttp(env.XLAYER_RPC) })

  // ClientEvmSigner: address + signTypedData (EIP-712) + optional readContract
  const signer: ClientEvmSigner = {
    address: account.address,
    signTypedData: (msg) => account.signTypedData(msg as any),
    readContract: (args) => publicClient.readContract(args as any),
  }

  const client = new x402Client()
  registerExactEvmScheme(client, { signer })
  const x402 = new x402HTTPClient(client)

  const url = BASE + ROUTE
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  console.log(`Buyer ${account.address}`)
  console.log(`POST ${url}  on ${NETWORK}  (paying via x402)…\n`)

  // 1) first request → expect 402
  const res1 = await fetch(url, { method: 'POST', headers, body: BODY })
  if (res1.status !== 402) {
    console.log('Unexpected (no 402):', res1.status, await res1.text()); return
  }
  console.log('← 402 Payment Required. Signing payment authorization…')

  // 2) build + sign payment, encode header
  const paymentRequired = x402.getPaymentRequiredResponse((n) => res1.headers.get(n))
  const payload = await x402.createPaymentPayload(paymentRequired)
  const payHeaders = x402.encodePaymentSignatureHeader(payload)

  // 3) retry with payment → expect 200 + settlement
  const res2 = await fetch(url, { method: 'POST', headers: { ...headers, ...payHeaders }, body: BODY })
  console.log('← Retry status:', res2.status)
  console.log('  Response body:', await res2.text())

  try {
    const settle = x402.getPaymentSettleResponse((n) => res2.headers.get(n))
    console.log('\n✅ SETTLED on X Layer:', JSON.stringify(settle, null, 2))
  } catch {
    console.log('\n(no settlement header parsed — check server logs / status)')
  }
}

main().catch((e) => { console.error('pay-test error:', e?.shortMessage ?? e?.message ?? e); process.exit(1) })
