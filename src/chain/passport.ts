import { createPublicClient, createWalletClient, http, keccak256, parseEventLogs } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { env, xLayer } from '../config.js'
import { passportAbi } from './abi.js'

export const publicClient = createPublicClient({ chain: xLayer, transport: http(env.XLAYER_RPC) })

const account = env.SIGNER_PK ? privateKeyToAccount(env.SIGNER_PK) : undefined
export const walletClient = account
  ? createWalletClient({ account, chain: xLayer, transport: http(env.XLAYER_RPC) })
  : undefined

export function hashImage(bytes: Uint8Array): `0x${string}` {
  return keccak256(bytes)
}

/** Mint a Character Passport on X Layer. Returns the on-chain tokenId (charId) + tx hash. */
export async function mintPassport(
  owner: `0x${string}`,
  referenceHash: `0x${string}`,
  metadataURI = '',
): Promise<{ charId: string; txHash: `0x${string}` }> {
  if (!walletClient || !account) throw new Error('SIGNER_PK not set — cannot mint passport')
  if (!env.PASSPORT_CONTRACT) throw new Error('PASSPORT_CONTRACT not set — deploy the contract first (see README)')

  const txHash = await walletClient.writeContract({
    address: env.PASSPORT_CONTRACT,
    abi: passportAbi,
    functionName: 'mint',
    args: [owner, referenceHash, metadataURI],
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  const logs = parseEventLogs({ abi: passportAbi, eventName: 'Transfer', logs: receipt.logs })
  const tokenId = logs[0]?.args?.tokenId
  if (tokenId === undefined) throw new Error('Could not read minted tokenId from logs')
  return { charId: tokenId.toString(), txHash }
}

/** Prove an image matches a passport's locked reference. */
export async function verifyPassport(charId: string, referenceHash: `0x${string}`): Promise<boolean> {
  if (!env.PASSPORT_CONTRACT) return false
  return publicClient.readContract({
    address: env.PASSPORT_CONTRACT,
    abi: passportAbi,
    functionName: 'verify',
    args: [BigInt(charId), referenceHash],
  })
}
