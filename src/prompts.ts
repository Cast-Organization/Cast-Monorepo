// Prompt templates + content guardrails. Keep identity terms stable; vary only the scene.

export function buildPortraitPrompt(description: string): string {
  return [
    `Character reference portrait, front-facing, centered, neutral plain background.`,
    `Design a distinct, recognizable, reusable character: ${description}.`,
    `Clear face, consistent hairstyle and signature outfit, full-body-friendly proportions.`,
  ].join(' ')
}

export function buildRenderPrompt(
  scene: string,
  opts: { shot?: string; mood?: string; style?: string } = {},
): string {
  const { shot = 'medium shot', mood = 'natural lighting', style = 'consistent illustration style' } = opts
  // aspect ratio is passed to the model as a real param (aspect_ratio), not baked into the prompt
  return [
    `Keep the SAME character identity, face, hairstyle, and signature outfit from the reference image.`,
    `Do NOT change who they are.`,
    `New scene: ${scene}.`,
    `Camera: ${shot}. Lighting: ${mood}. Style: ${style}.`,
  ].join(' ')
}

// Block content that would fail OKX listing review or hurt review scores.
const BANNED: RegExp[] = [
  /\bn[s\W_]*f[s\W_]*w\b/i,
  /\bnude|nudity|explicit|porn\b/i,
  /\b(celebrity|public figure|president|politician)\b/i,
  /\b(disney|nintendo|pokemon|marvel|pixar|mickey|mario)\b/i,
  /\bimpersonat/i,
]

export function guardPrompt(p: string): string {
  const s = (p ?? '').trim()
  if (!s) throw new Error('Empty prompt')
  for (const re of BANNED) if (re.test(s)) throw new Error('Prompt violates content policy (NSFW / real people / trademarked characters).')
  return s
}
