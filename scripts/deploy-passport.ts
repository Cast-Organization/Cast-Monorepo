// Deploy CharacterPassport.sol (compiled by `forge build`) to the active X Layer network.
// Usage: forge build && pnpm run deploy:passport
import { readFileSync } from 'node:fs'
import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { env, xLayer, NETWORK } from '../src/config.js'

const ARTIFACT = 'out/CharacterPassport.sol/CharacterPassport.json'

async function main() {
  if (!env.SIGNER_PK) throw new Error('SIGNER_PK not set in .env')
  const artifact = JSON.parse(readFileSync(ARTIFACT, 'utf8'))
  const abi = artifact.abi
  const bytecode = artifact.bytecode.object as `0x${string}`

  const account = privateKeyToAccount(env.SIGNER_PK)
  const wallet = createWalletClient({ account, chain: xLayer, transport: http(env.XLAYER_RPC) })
  const pub = createPublicClient({ chain: xLayer, transport: http(env.XLAYER_RPC) })

  console.log(`Deploying CharacterPassport on ${NETWORK} from ${account.address}…`)
  const hash = await wallet.deployContract({ abi, bytecode, args: [] })
  console.log('deploy tx:', hash)
  const receipt = await pub.waitForTransactionReceipt({ hash })
  if (!receipt.contractAddress) throw new Error('no contractAddress in receipt')
  console.log('\n✅ Deployed CharacterPassport at:', receipt.contractAddress)
  console.log('   Set in .env →  PASSPORT_CONTRACT=' + receipt.contractAddress)
}

main().catch((e) => { console.error('deploy error:', e?.shortMessage ?? e?.message ?? e); process.exit(1) })
