import dotenv from 'dotenv'
dotenv.config({ override: true }) // .env is the single source of truth (beats stale shell vars)
import { defineChain } from 'viem'

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (v === undefined) throw new Error(`Missing env ${name}`)
  return v
}

// Treat leftover template placeholders (blank / inline-comment) as unset.
function clean(v?: string): string {
  const t = (v ?? '').trim()
  return !t || t.startsWith('#') ? '' : t.replace(/\s+#.*$/, '').trim()
}
// Private key: tolerate a missing 0x prefix.
function normPk(v?: string): `0x${string}` {
  const t = clean(v).replace(/\s.*$/, '')
  if (!t) return '' as `0x${string}`
  return (t.startsWith('0x') ? t : `0x${t}`) as `0x${string}`
}

export const env = {
  FAL_KEY: req('FAL_KEY', ''),
  XLAYER_RPC: req('XLAYER_RPC', 'https://xlayerrpc.okx.com'),
  PASSPORT_CONTRACT: clean(process.env.PASSPORT_CONTRACT) as `0x${string}`,
  SIGNER_PK: normPk(process.env.SIGNER_PK),
  PAY_TO: clean(process.env.PAY_TO),
  OKX_API_KEY: process.env.OKX_API_KEY ?? '',
  OKX_SECRET_KEY: process.env.OKX_SECRET_KEY ?? '',
  OKX_PASSPHRASE: process.env.OKX_PASSPHRASE ?? '',
  PORT: Number(process.env.PORT ?? 4000),
}

// X Layer mainnet — chainId 196. Gas token OKB.
export const xLayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: [env.XLAYER_RPC] } },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/x-layer' } },
})

// Settlement token used by OKX.AI marketplace (auto-configured by the x402 SDK).
export const USDT0 = '0x779Ded0c9e1022225f8E0630b35a9b54bE713736' as const

// Per-call prices (USD strings; SDK converts to USDT0 atomic units @ 6 decimals).
export const PRICES = {
  create_character: '$0.50',
  render: '$0.30',
  turnaround: '$1.00',
} as const

// Payment network: eip155:196 = X Layer mainnet, eip155:1952 = X Layer testnet (free testing).
export const NETWORK = (process.env.X402_NETWORK ?? 'eip155:196') as `eip155:${number}`
