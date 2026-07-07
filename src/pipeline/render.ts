import { kontextRender, type AspectRatio } from './fal.js'
import { buildRenderPrompt, guardPrompt } from '../prompts.js'
import { getCharacter, bumpRenders } from '../store/db.js'

export type RenderInput = {
  charId: string
  scene: string
  shot?: string; mood?: string; style?: string; aspect?: string
}

export async function render(input: RenderInput): Promise<{ charId: string; imageUrl: string }> {
  const char = await getCharacter(input.charId)
  if (!char) throw new Error(`Unknown charId ${input.charId}`)
  guardPrompt(input.scene)

  const prompt = buildRenderPrompt(input.scene, input)
  const { url: imageUrl } = await kontextRender(char.referenceUrl, prompt, {
    aspectRatio: (input.aspect as AspectRatio) ?? '1:1',
    seed: char.seed,
  })
  await bumpRenders(input.charId)
  return { charId: input.charId, imageUrl }
}

/** Character sheet: front / side / back + expressions. Great for demos & storyboarding. */
export async function turnaround(charId: string): Promise<{ charId: string; images: string[] }> {
  const char = await getCharacter(charId)
  if (!char) throw new Error(`Unknown charId ${charId}`)
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
    const { url } = await kontextRender(char.referenceUrl, buildRenderPrompt(v, { style: 'character reference sheet' }), { seed: char.seed })
    images.push(url)
  }
  await bumpRenders(charId)
  return { charId, images }
}
