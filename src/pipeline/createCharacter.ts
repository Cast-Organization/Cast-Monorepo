import { fluxCreatePortrait } from './fal.js'
import { buildPortraitPrompt } from '../prompts.js'
import { hashImage, mintPassport } from '../chain/passport.js'
import { saveCharacter } from '../store/db.js'

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

  const portraitUrl = input.referenceUrl ?? (await fluxCreatePortrait(buildPortraitPrompt(input.description!)))
  const bytes = new Uint8Array(await (await fetch(portraitUrl)).arrayBuffer())
  const referenceHash = hashImage(bytes)

  let charId: string
  let passportTx: string | undefined
  if (input.mint === false) {
    charId = referenceHash // off-chain fallback id for local testing
  } else {
    const res = await mintPassport(input.owner, referenceHash, /* metadataURI */ '')
    charId = res.charId
    passportTx = res.txHash
  }

  await saveCharacter({
    charId, owner: input.owner, name: input.name,
    referenceUrl: portraitUrl, referenceHash, createdAt: Date.now(), renders: 0,
  })

  return { charId, name: input.name, portraitUrl, referenceHash, passportTx }
}
