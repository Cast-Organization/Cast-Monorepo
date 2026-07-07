import { fal } from '@fal-ai/client'
import { env } from '../config.js'

fal.config({ credentials: env.FAL_KEY })

// NOTE: verify exact model ids/params against https://fal.ai/models (they evolve).
const CREATE_MODEL = 'fal-ai/flux/dev'          // cheap hero-portrait generation from text
const KONTEXT_MODEL = 'fal-ai/flux-pro/kontext' // character-consistency edit from a reference

type FalImageResult = { data?: { images?: { url: string }[] } }

/** Generate a fresh reference portrait from a text description. */
export async function fluxCreatePortrait(prompt: string): Promise<string> {
  const res = (await fal.subscribe(CREATE_MODEL, {
    input: { prompt, image_size: 'square_hd' },
  })) as FalImageResult
  const url = res.data?.images?.[0]?.url
  if (!url) throw new Error('fal: no portrait returned')
  return url
}

/** Place the SAME character (from reference image) into a new scene via FLUX Kontext. */
export async function kontextRender(
  imageUrl: string,
  prompt: string,
  opts: { guidance_scale?: number } = {},
): Promise<string> {
  const res = (await fal.subscribe(KONTEXT_MODEL, {
    input: { image_url: imageUrl, prompt, guidance_scale: opts.guidance_scale ?? 3.5 },
  })) as FalImageResult
  const url = res.data?.images?.[0]?.url
  if (!url) throw new Error('fal: no render returned')
  return url
}
