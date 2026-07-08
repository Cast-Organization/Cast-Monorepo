import express from 'express'
import { OKXFacilitatorClient } from '@okxweb3/x402-core'
import {
  x402ResourceServer,
  x402HTTPResourceServer,
  paymentMiddlewareFromHTTPServer,
} from '@okxweb3/x402-express'
import { ExactEvmScheme } from '@okxweb3/x402-evm/exact/server'
import { isAddress } from 'viem'
import { env, NETWORK, PRICES } from './config.js'
import { createCharacter } from './pipeline/createCharacter.js'
import { render, turnaround } from './pipeline/render.js'

// NOTE: @okxweb3/x402-* is early (v0.0.x). If an import/signature differs from this,
// check github.com/okx/payments -> typescript/SELLER.md for the installed version.

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use('/images', express.static('data/images')) // serve stored renders/portraits (free)

// --- x402 payment layer (settles USDT0 on X Layer via OKX facilitator) ---
const facilitator = new OKXFacilitatorClient({
  apiKey: env.OKX_API_KEY,
  secretKey: env.OKX_SECRET_KEY,
  passphrase: env.OKX_PASSPHRASE,
  syncSettle: true, // return the result only after settlement confirms
})

const resourceServer = new x402ResourceServer(facilitator).register(NETWORK, new ExactEvmScheme())

const httpServer = new x402HTTPResourceServer(resourceServer, {
  'POST /cast/echo':             { accepts: { scheme: 'exact', network: NETWORK, payTo: env.PAY_TO, price: '$0.01' } }, // cheap payment-loop test
  'POST /cast/create_character': { accepts: { scheme: 'exact', network: NETWORK, payTo: env.PAY_TO, price: PRICES.create_character } },
  'POST /cast/render':           { accepts: { scheme: 'exact', network: NETWORK, payTo: env.PAY_TO, price: PRICES.render } },
  'POST /cast/turnaround':       { accepts: { scheme: 'exact', network: NETWORK, payTo: env.PAY_TO, price: PRICES.turnaround } },
})

app.use(paymentMiddlewareFromHTTPServer(httpServer))

// --- handlers (only reached after payment) ---
app.post('/cast/create_character', async (req, res) => {
  try {
    const { owner, name, description, referenceUrl } = req.body ?? {}
    if (!owner || !isAddress(owner)) return res.status(400).json({ error: 'valid owner address required' })
    if (!name) return res.status(400).json({ error: 'name required' })
    if (!description && !referenceUrl) return res.status(400).json({ error: 'description or referenceUrl required' })
    return res.json(await createCharacter({ owner, name, description, referenceUrl }))
  } catch (e: any) { return res.status(400).json({ error: e.message }) }
})

app.post('/cast/render', async (req, res) => {
  try {
    const { charId, scene } = req.body ?? {}
    if (!charId) return res.status(400).json({ error: 'charId required' })
    if (!scene) return res.status(400).json({ error: 'scene required' })
    return res.json(await render(req.body))
  } catch (e: any) { return res.status(400).json({ error: e.message }) }
})

app.post('/cast/turnaround', async (req, res) => {
  try { res.json(await turnaround(req.body?.charId)) }
  catch (e: any) { res.status(400).json({ error: e.message }) }
})

// paid echo — validates the x402 payment loop cheaply (no fal, no charId)
app.post('/cast/echo', (req, res) => res.json({ ok: true, echo: req.body ?? null }))

// free, unpriced health check
app.get('/health', (_req, res) => res.json({ ok: true, service: 'cast', network: NETWORK }))

app.listen(env.PORT, async () => {
  await resourceServer.initialize()
  console.log(`Cast ASP listening on :${env.PORT}  (x402 → USDT0 on X Layer)`) // eslint-disable-line no-console
})
