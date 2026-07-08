// Shared x402 buyer helper: builds a signer from SIGNER_PK and returns paidPost().
import { createPublicClient, http as viemHttp } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { x402Client, x402HTTPClient } from '@okxweb3/x402-core/client'
import { registerExactEvmScheme } from '@okxweb3/x402-evm/exact/client'
import type { ClientEvmSigner } from '@okxweb3/x402-evm'
import { env, xLayer } from '../src/config.js'

export type PaidResult = { status: number; body: string; settle: unknown }

export function createBuyer() {
  if (!env.SIGNER_PK) throw new Error('SIGNER_PK not set in .env')
  const account = privateKeyToAccount(env.SIGNER_PK)
  const publicClient = createPublicClient({ chain: xLayer, transport: viemHttp(env.XLAYER_RPC) })

  const signer: ClientEvmSigner = {
    address: account.address,
    signTypedData: (msg) => account.signTypedData(msg as any),
    readContract: (args) => publicClient.readContract(args as any),
  }

  const client = new x402Client()
  registerExactEvmScheme(client, { signer })
  const x402 = new x402HTTPClient(client)
  const base = process.env.CAST_BASE_URL ?? `http://localhost:${env.PORT}` // set CAST_BASE_URL to test the deployed URL

  async function paidPost(route: string, body: unknown): Promise<PaidResult> {
    const url = base + route
    const payload = JSON.stringify(body ?? {})
    const headers: Record<string, string> = { 'content-type': 'application/json' }

    const res1 = await fetch(url, { method: 'POST', headers, body: payload })
    if (res1.status !== 402) return { status: res1.status, body: await res1.text(), settle: null }

    const paymentRequired = x402.getPaymentRequiredResponse((n) => res1.headers.get(n))
    const pp = await x402.createPaymentPayload(paymentRequired)
    const payHeaders = x402.encodePaymentSignatureHeader(pp)

    const res2 = await fetch(url, { method: 'POST', headers: { ...headers, ...payHeaders }, body: payload })
    let settle: unknown = null
    try { settle = x402.getPaymentSettleResponse((n) => res2.headers.get(n)) } catch { /* no settle header */ }
    return { status: res2.status, body: await res2.text(), settle }
  }

  return { address: account.address, paidPost }
}
