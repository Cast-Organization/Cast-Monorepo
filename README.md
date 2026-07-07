# Cast — character-consistency ASP for OKX.AI

Lock a character once → summon it in any scene for ~$0.30, settled in **USDT0 on X Layer** via **x402**, with an on-chain **Character Passport** so the creator owns their AI persona.

A2MCP service for the **Art creation** category. See `../CAST-BUILD-BIBLE.md` for the full strategy/plan.

## Layout
```
cast/
├─ src/
│  ├─ server.ts              # Express + OKX x402 SDK (priced routes)
│  ├─ config.ts              # env, X Layer chain, USDT0, prices
│  ├─ prompts.ts             # Kontext templates + content guardrails
│  ├─ pipeline/              # fal FLUX Kontext: create / render / turnaround
│  ├─ chain/                 # viem: Character Passport mint/verify
│  └─ store/                 # character records (JSON now; swap for Postgres)
├─ contracts/CharacterPassport.sol
├─ scripts/smoke.ts          # end-to-end pipeline test (no payment/chain)
└─ .env.example
```

## 1. Install
```bash
cd cast
npm install
cp .env.example .env      # fill values (NEVER commit .env)
```

## 2. Fastest proof it works (no chain, no payments)
Only needs `FAL_KEY`:
```bash
npm run smoke
```
Prints a reference portrait + the same character in 3 scenes. Open the URLs — the character should be recognizably identical. **This is your demo core.**

## 3. Deploy the Character Passport (X Layer, chainId 196)
Using Foundry:
```bash
forge install OpenZeppelin/openzeppelin-contracts
forge create contracts/CharacterPassport.sol:CharacterPassport \
  --rpc-url https://xlayerrpc.okx.com \
  --private-key $SIGNER_PK
```
Put the deployed address in `.env` as `PASSPORT_CONTRACT`. (Gas is paid in OKB — hold a little.)

## 4. Run the paid ASP server
```bash
npm run dev        # http://localhost:4000
# GET  /health                 -> free
# POST /cast/create_character  -> $0.50  { owner, name, description | referenceUrl }
# POST /cast/render            -> $0.30  { charId, scene, shot?, mood?, style?, aspect? }
# POST /cast/turnaround        -> $1.00  { charId }
```
Payments settle in **USDT0** to `PAY_TO` on X Layer via the OKX facilitator (auth = `OKX_API_KEY/SECRET/PASSPHRASE`).

## 5. List on OKX.AI
Register + list as an **A2MCP** ASP (category: Art creation) — see build bible §9.

---

## ⚠️ Verify before you rely on it
- **`@okxweb3/x402-*` is v0.0.x.** Confirm import paths/constructor options against the installed package / `github.com/okx/payments → typescript/SELLER.md`.
- **fal model ids/params** (`fal-ai/flux-pro/kontext`, `fal-ai/flux/dev`) evolve — check `fal.ai/models`. Kontext has a `max` and multi-image variant; tune `guidance_scale` for identity retention.
- **Where `OKX_API_KEY/SECRET/PASSPHRASE` come from** — confirm it's the OKX **Web3 developer console** (works from India) vs the geo-blocked exchange. See build bible §"restricted region".
- **Secrets** live only in `.env` (gitignored) / host env vars. Never commit them.
- **Content guardrails** (`prompts.ts`) block NSFW / real people / trademarked characters — keep them on to pass OKX review and protect your rating.
