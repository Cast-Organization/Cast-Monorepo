import { kontextRender, type AspectRatio } from './fal.js'
import { buildRenderPrompt, guardPrompt } from '../prompts.js'
import { getCharacter, bumpRenders, type Character } from '../store/db.js'
import { saveFromUrl, readBytes, toDataUri } from '../store/images.js'

export type RenderInput = {
  charId: string
  scene: string
  shot?: string; mood?: string; style?: string; aspect?: string
}

// Feed the reference to fal as a durable data URI (works locally + on any host).
// Falls back to the stored URL for legacy characters without a storage key.
function referenceFor(char: Character): string {
  return char.referenceKey ? toDataUri(readBytes(char.referenceKey), char.referenceKey) : char.referenceUrl
}

export async function render(input: RenderInput): Promise<{ charId: string; imageUrl: string }> {
  const char = await getCharacter(input.charId)
  if (!char) throw new Error(`Unknown charId ${input.charId}`)
  guardPrompt(input.scene)

  const prompt = buildRenderPrompt(input.scene, input)
  const { url: falUrl } = await kontextRender(referenceFor(char), prompt, {
    aspectRatio: (input.aspect as AspectRatio) ?? '1:1',
    seed: char.seed,
  })
  const { url: imageUrl } = await saveFromUrl(falUrl) // durable, permanent URL
  await bumpRenders(input.charId)
  return { charId: input.charId, imageUrl }
}

/** Character sheet: front / side / back + expressions. Great for demos & storyboarding. */
export async function turnaround(charId: string): Promise<{ charId: string; images: string[] }> {
  const char = await getCharacter(charId)
  if (!char) throw new Error(`Unknown charId ${charId}`)
  const ref = referenceFor(char)
  const views = [
    'front view, T-pose, neutral expression',
    'side profile view',
    'back view',
    'close-up, happy expression',
    'close-up, angry expression',
    'close-up, surprised expression',
  ]
  const images: string[] = []
  for (const v of views) {
    const { url: falUrl } = await kontextRender(ref, buildRenderPrompt(v, { style: 'character reference sheet' }), { seed: char.seed })
    const { url } = await saveFromUrl(falUrl)
    images.push(url)
  }
  await bumpRenders(charId)
  return { charId, images }
}
