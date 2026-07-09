import dotenv from 'dotenv'
dotenv.config({ override: true }) // .env is the single source of truth (beats stale shell vars)
import { defineChain } from 'viem'

// ---------- helpers ----------
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

// ---------- network ----------
// Payment network: eip155:196 = X Layer mainnet, eip155:1952 = X Layer testnet (free testing).
export const NETWORK = (clean(process.env.X402_NETWORK) || 'eip155:196') as `eip155:${number}`
const CHAIN_ID = Number(NETWORK.split(':')[1])

// USDT0 addresses match the OKX SDK DEFAULT_STABLECOINS map (both 6 decimals).
const NETS = {
  196: {
    name: 'X Layer',
    rpc: 'https://xlayerrpc.okx.com',
    explorer: 'https://www.oklink.com/x-layer',
    usdt0: '0x779ded0c9e1022225f8e0630b35a9b54be713736',
  },
  1952: {
    name: 'X Layer Testnet',
    rpc: 'https://testrpc.xlayer.tech/terigon',
    explorer: 'https://www.oklink.com/x-layer-testnet',
    usdt0: '0x9e29b3aada05bf2d2c827af80bd28dc0b9b4fb0c',
  },
} as const
const NET = NETS[CHAIN_ID as keyof typeof NETS] ?? NETS[196]

// ---------- env ----------
export const env = {
  FAL_KEY: req('FAL_KEY', ''),
  XLAYER_RPC: clean(process.env.XLAYER_RPC) || NET.rpc, // defaults to the active network's RPC
  PASSPORT_CONTRACT: clean(process.env.PASSPORT_CONTRACT) as `0x${string}`,
  SIGNER_PK: normPk(process.env.SIGNER_PK),
  PAY_TO: clean(process.env.PAY_TO),
  OKX_API_KEY: process.env.OKX_API_KEY ?? '',
  OKX_SECRET_KEY: process.env.OKX_SECRET_KEY ?? '',
  OKX_PASSPHRASE: process.env.OKX_PASSPHRASE ?? '',
  PORT: Number(process.env.PORT ?? 4000),
  // Public base URL for serving stored images (auto-detects Railway; set explicitly in prod).
  PUBLIC_BASE_URL:
    clean(process.env.PUBLIC_BASE_URL) ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `http://localhost:${Number(process.env.PORT ?? 4000)}`),
}

export const xLayer = defineChain({
  id: CHAIN_ID,
  name: NET.name,
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: [env.XLAYER_RPC] } },
  blockExplorers: { default: { name: 'OKLink', url: NET.explorer } },
})

// Settlement token (USDT0) for the active network.
export const USDT0 = NET.usdt0 as `0x${string}`

// Per-call prices (USD strings; for display).
export const PRICES = {
  create_character: '$0.50',
  render: '$0.30',
  turnaround: '$1.00',
} as const

export const PRICE_USD = { echo: 0.01, create_character: 0.5, render: 0.3, turnaround: 1 } as const

// Emit the price as an explicit AssetAmount so the x402 challenge carries `extra.decimals`.
// The marketplace's task system doesn't recognize USD₮0 by address (only USDT/USDG), so without
// a decimals field it can't resolve the token → rejects the endpoint. Providing decimals fixes it.
export function priceOf(usd: number) {
  return {
    asset: USDT0,
    amount: Math.round(usd * 1_000_000).toString(), // USDT0 = 6 decimals
    extra: { name: 'USD₮0', version: '1', decimals: 6 },
  }
}
