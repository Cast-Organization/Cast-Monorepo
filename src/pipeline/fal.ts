import { fal } from '@fal-ai/client'
import { env } from '../config.js'

fal.config({ credentials: env.FAL_KEY })

// Model ids per fal docs (verify at fal.ai/models):
const CREATE_MODEL = 'fal-ai/flux/dev'          // text -> reference portrait
const KONTEXT_MODEL = 'fal-ai/flux-pro/kontext' // reference + scene -> same character

export type AspectRatio = '21:9' | '16:9' | '4:3' | '3:2' | '1:1' | '2:3' | '3:4' | '9:16' | '9:21'

type FalImage = { url: string; width?: number; height?: number }
type FalResult = { data?: { images?: FalImage[]; has_nsfw_concepts?: boolean[]; seed?: number } }

/** Generate a fresh reference portrait from text. Returns url + seed (store it for consistency). */
export async function fluxCreatePortrait(prompt: string, seed?: number): Promise<{ url: string; seed?: number }> {
  const res = (await fal.subscribe(CREATE_MODEL, {
    input: { prompt, image_size: 'square_hd', ...(seed !== undefined ? { seed } : {}) },
  })) as FalResult
  const img = res.data?.images?.[0]
  if (!img?.url) throw new Error('fal: no portrait returned')
  return { url: img.url, seed: res.data?.seed }
}

/** Place the SAME character (reference image) into a new scene via FLUX Kontext. */
export async function kontextRender(
  imageUrl: string,
  prompt: string,
  opts: { aspectRatio?: AspectRatio; guidanceScale?: number; seed?: number; outputFormat?: 'jpeg' | 'png' } = {},
): Promise<{ url: string; seed?: number }> {
  const res = (await fal.subscribe(KONTEXT_MODEL, {
    input: {
      image_url: imageUrl,
      prompt,
      guidance_scale: opts.guidanceScale ?? 3.5,
      aspect_ratio: opts.aspectRatio ?? '1:1',
      output_format: opts.outputFormat ?? 'jpeg',
      safety_tolerance: '2',
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
    },
  })) as FalResult
  const img = res.data?.images?.[0]
  if (!img?.url) throw new Error('fal: no render returned')
  if (res.data?.has_nsfw_concepts?.[0]) throw new Error('Render flagged NSFW — rejected')
  return { url: img.url, seed: res.data?.seed }
}
