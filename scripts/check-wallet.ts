// Safe wallet check — derives the address from SIGNER_PK and reads on-chain balances.
// NEVER prints the private key. Run: pnpm run check:wallet
import { createPublicClient, http, formatEther, formatUnits, erc20Abi, getAddress, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { xLayer, USDT0, env, NETWORK } from '../src/config.js'

const client = createPublicClient({ chain: xLayer, transport: http(env.XLAYER_RPC) })

async function main() {
  console.log('Network        :', NETWORK, `(rpc ${env.XLAYER_RPC})`)
  if (!env.SIGNER_PK) { console.error('❌ SIGNER_PK is empty in .env'); process.exit(1) }

  let account
  try {
    account = privateKeyToAccount(env.SIGNER_PK)
  } catch {
    console.error('❌ SIGNER_PK is not a valid private key (need 0x + 64 hex chars)'); process.exit(1)
  }
  console.log('Deployer/buyer :', account.address)

  const okb = await client.getBalance({ address: account.address })
  const [rawUsdt, decimals] = await Promise.all([
    client.readContract({ address: USDT0, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] }),
    client.readContract({ address: USDT0, abi: erc20Abi, functionName: 'decimals' }),
  ])
  const usdt = formatUnits(rawUsdt as bigint, decimals as number)

  console.log('OKB (gas)      :', formatEther(okb))
  console.log(`USDT0          : ${usdt}   (token ${USDT0})`)
  console.log('PAY_TO         :', env.PAY_TO && isAddress(env.PAY_TO) ? getAddress(env.PAY_TO) : '(not set / invalid)')

  console.log('\nSanity:')
  console.log(okb > 0n ? '  ✅ has OKB for gas' : '  ❌ no OKB — passport mint / txs will fail')
  console.log((rawUsdt as bigint) > 0n ? '  ✅ has USDT0 to pay for renders' : '  ❌ no USDT0 — buyer cannot pay')
  if (!env.PAY_TO) console.log('  ⚠️  PAY_TO not set — set the address that should RECEIVE render payments')
  else if (env.PAY_TO.toLowerCase() === account.address.toLowerCase())
    console.log('  ℹ️  PAY_TO == buyer wallet: a paid test will pay yourself (fine to validate the flow;\n     use a different PAY_TO if you want to visibly see funds move).')
}

main().catch((e) => { console.error('RPC/read error:', e?.shortMessage ?? e?.message ?? e); process.exit(1) })
