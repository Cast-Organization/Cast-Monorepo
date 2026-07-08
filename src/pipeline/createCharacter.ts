import { fluxCreatePortrait } from './fal.js'
import { buildPortraitPrompt } from '../prompts.js'
import { hashImage, mintPassport } from '../chain/passport.js'
import { saveCharacter } from '../store/db.js'
import { saveFromUrl } from '../store/images.js'
import { env } from '../config.js'

export type CreateInput = {
  owner: `0x${string}`
  name: string
  description?: string   // text path
  referenceUrl?: string  // image path (bring your own reference)
  mint?: boolean         // set false to skip on-chain passport (e.g. smoke test w/o chain)
}

export type CreateResult = {
  charId: string
  name: string
  portraitUrl: string
  referenceHash: `0x${string}`
  passportTx?: string
}

export async function createCharacter(input: CreateInput): Promise<CreateResult> {
  if (!input.description && !input.referenceUrl) throw new Error('Provide description or referenceUrl')

  let portraitSource: string
  let seed: number | undefined
  if (input.referenceUrl) {
    portraitSource = input.referenceUrl
  } else {
    const p = await fluxCreatePortrait(buildPortraitPrompt(input.description!))
    portraitSource = p.url
    seed = p.seed
  }
  const stored = await saveFromUrl(portraitSource) // durable copy of the reference
  const referenceHash = hashImage(stored.bytes)
  const portraitUrl = stored.url
  const referenceKey = stored.key

  // Mint an on-chain passport only if a contract is configured (else off-chain id).
  const shouldMint = input.mint ?? Boolean(env.PASSPORT_CONTRACT)
  let charId: string
  let passportTx: string | undefined
  if (!shouldMint) {
    charId = referenceHash // off-chain fallback id
  } else {
    const res = await mintPassport(input.owner, referenceHash, /* metadataURI */ '')
    charId = res.charId
    passportTx = res.txHash
  }

  await saveCharacter({
    charId, owner: input.owner, name: input.name,
    referenceUrl: portraitUrl, referenceKey, referenceHash, seed, createdAt: Date.now(), renders: 0,
  })

  return { charId, name: input.name, portraitUrl, referenceHash, passportTx }
}
