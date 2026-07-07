// End-to-end pipeline test WITHOUT payment/chain — proves the consistency engine works.
// Needs only FAL_KEY. Run: npm run smoke
import { createCharacter } from '../src/pipeline/createCharacter.js'
import { render } from '../src/pipeline/render.js'

const OWNER = '0x0000000000000000000000000000000000000001' as const

async function main() {
  console.log('1) Creating character (off-chain, no mint)...')
  const c = await createCharacter({
    owner: OWNER,
    name: 'Detective Miso',
    description: 'a grumpy orange cat detective in a tan trench coat',
    mint: false, // skip on-chain passport for the smoke test
  })
  console.log('   charId:', c.charId)
  console.log('   reference portrait:', c.portraitUrl)

  const scenes = ['on the surface of the moon', 'as a Renaissance oil painting', 'eating ramen in a neon Tokyo alley']
  console.log('2) Rendering the SAME character across scenes...')
  for (const scene of scenes) {
    const r = await render({ charId: c.charId, scene })
    console.log(`   [${scene}] ->`, r.imageUrl)
  }
  console.log('\n✅ Open the URLs — the cat should be recognizably the same character in every one.')
}

main().catch((e) => { console.error(e); process.exit(1) })
