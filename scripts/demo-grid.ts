// Builds the "same character, six worlds" demo asset: renders 6 scenes, downloads them
// locally (so it won't rot when fal URLs expire), and writes a screenshot-ready HTML grid.
// Usage: pnpm run demo
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { createCharacter } from '../src/pipeline/createCharacter.js'
import { render } from '../src/pipeline/render.js'
import { getCharacter } from '../src/store/db.js'

const SCENES = [
  'standing on the surface of the moon, Earth in the night sky',
  'as a Renaissance oil painting portrait, ornate gold frame',
  'eating ramen in a neon-lit Tokyo alley at night',
  'as a retro 8-bit pixel-art video game sprite',
  'giving a TED talk on a big stage under a spotlight',
  'relaxing on a tropical beach at sunset with sunglasses',
]
const OUT = 'out/demo'

async function download(url: string, path: string) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  writeFileSync(path, buf)
}

function html(name: string, refFile: string, cells: { scene: string; file: string }[]): string {
  const tiles = cells.map((c) => `
      <figure>
        <img src="${c.file}" alt="${c.scene}"/>
        <figcaption>${c.scene}</figcaption>
      </figure>`).join('')
  return `<!doctype html><html><head><meta charset="utf8"><title>Cast — ${name}</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#0b0b10;color:#e8e8ef;font:16px/1.4 -apple-system,Segoe UI,Roboto,sans-serif}
  .wrap{max-width:1100px;margin:0 auto;padding:40px 24px}
  h1{font-size:34px;margin:0 0 4px}.tag{color:#9aa;margin:0 0 28px;font-size:18px}
  .hero{display:flex;gap:24px;align-items:center;margin-bottom:32px;flex-wrap:wrap}
  .hero img{width:200px;height:200px;object-fit:cover;border-radius:16px;border:2px solid #2a2a3a}
  .hero .meta b{color:#fff}.hero .meta span{color:#8a8aa0}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
  figure{margin:0}figure img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px;border:1px solid #23232f}
  figcaption{color:#9aa;font-size:13px;margin-top:8px}
  .foot{margin-top:34px;color:#7a7a90;font-size:14px}
  @media(max-width:720px){.grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body><div class="wrap">
  <h1>Cast — ${name}</h1>
  <p class="tag">Same character. Any world. 30¢ a render, settled on X Layer.</p>
  <div class="hero">
    <img src="${refFile}" alt="reference"/>
    <div class="meta"><b>Locked once →</b> <span>summoned into every scene below, identity intact.</span><br/>
    <span>An on-chain Character Passport proves you own this persona.</span></div>
  </div>
  <div class="grid">${tiles}</div>
  <p class="foot">Built on OKX.AI · A2MCP · x402 gasless USDT0 on X Layer &nbsp;#OKXAI</p>
</div></body></html>`
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const owner = '0x0000000000000000000000000000000000000001' as const

  let charId: string | undefined
  let name = 'Detective Miso'
  let refUrl = ''
  if (existsSync('data/characters.json')) {
    const all = JSON.parse(readFileSync('data/characters.json', 'utf8')) as Record<string, any>
    const first = Object.values(all)[0]
    if (first?.charId) { charId = first.charId; name = first.name; refUrl = first.referenceUrl }
  }
  if (!charId) {
    const c = await createCharacter({ owner, name, description: 'a grumpy orange cat detective in a tan trench coat', mint: false })
    charId = c.charId; refUrl = c.portraitUrl
  } else {
    refUrl = (await getCharacter(charId))?.referenceUrl ?? refUrl
  }

  console.log(`Character: ${name} (${charId.slice(0, 12)}…)`)
  console.log('Downloading reference…')
  await download(refUrl, `${OUT}/reference.jpg`)

  const cells: { scene: string; file: string }[] = []
  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i]
    process.stdout.write(`Rendering ${i + 1}/${SCENES.length}: ${scene} … `)
    const r = await render({ charId, scene })
    await download(r.imageUrl, `${OUT}/scene-${i}.jpg`)
    cells.push({ scene, file: `scene-${i}.jpg` })
    console.log('✓')
  }

  writeFileSync(`${OUT}/index.html`, html(name, 'reference.jpg', cells))
  console.log(`\n✅ Demo written to ${OUT}/index.html — open it in a browser and screenshot the grid.`)
}

main().catch((e) => { console.error('demo error:', e?.shortMessage ?? e?.message ?? e); process.exit(1) })
