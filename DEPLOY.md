# Deploying Cast on Railway

Cast runs as a single always-on Node server. Railway builds from this repo, runs `pnpm start`
(`tsx src/server.ts`), and gives you a public HTTPS URL — which is your A2MCP endpoint for OKX.AI.

## 1. Create the service
1. Railway → **New Project → Deploy from GitHub repo** → select `Cast-Organization/Cast-Monorepo`.
2. Railway auto-detects Node + pnpm and uses `railway.json` (start = `pnpm start`, healthcheck `/health`).

## 2. Add a Volume (IMPORTANT — durable images)
Railway containers have an **ephemeral filesystem** wiped on every redeploy. Cast stores the
character reference + every render under `data/`. Without a volume, those are lost on redeploy.
- Service → **Variables/Settings → Volumes → New Volume**, mount path: **`/app/data`**
- (When you later move to serverless, swap `src/store/images.ts` for Blob/S3 instead — see its TODO markers.)

## 3. Set environment variables
Service → **Variables** → add these (do NOT commit them):

| Var | Testnet value | Notes |
|---|---|---|
| `FAL_KEY` | your fal key | fal.ai/dashboard/keys |
| `SIGNER_PK` | your relayer key | mints passports / pays gas |
| `PAY_TO` | your receiving address | gets USDT0 |
| `OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE` | your OKX API creds | x402 facilitator auth |
| `PASSPORT_CONTRACT` | `0xdc48e5e5c3cf91b6db9ec0f329a14188174632c2` | testnet passport (redeploy for mainnet) |
| `X402_NETWORK` | `eip155:1952` | testnet (`eip155:196` = mainnet) |
| `XLAYER_RPC` | `https://testrpc.xlayer.tech/terigon` | mainnet: `https://xlayerrpc.okx.com` |
| `PUBLIC_BASE_URL` | *(optional)* | auto-detected from Railway domain; set explicitly to be safe |

> Do **not** set `PORT` — Railway injects it and the server reads it automatically.

## 4. Get a public domain
Service → **Settings → Networking → Generate Domain**. You'll get e.g.
`https://cast-production.up.railway.app`. The server auto-uses it (`RAILWAY_PUBLIC_DOMAIN`)
for image URLs; or set `PUBLIC_BASE_URL` to it explicitly.

## 5. Verify the live deploy
```bash
curl https://<your-domain>/health          # -> {"ok":true,...,"network":"eip155:1952"}
# test a real paid render against the live URL from your machine:
CAST_BASE_URL=https://<your-domain> pnpm run pay:flow
```

## 6. Mainnet cutover (when ready to list for real)
1. Get a little **OKB** (gas) + **USDT0** onto **mainnet** X Layer (bridge from another chain — the OKX exchange is blocked in India).
2. Redeploy the passport to mainnet:
   ```bash
   X402_NETWORK=eip155:196 XLAYER_RPC=https://xlayerrpc.okx.com pnpm run build:contract
   X402_NETWORK=eip155:196 XLAYER_RPC=https://xlayerrpc.okx.com pnpm run deploy:passport
   ```
3. Update Railway vars: `X402_NETWORK=eip155:196`, `XLAYER_RPC=https://xlayerrpc.okx.com`, `PASSPORT_CONTRACT=<mainnet address>`. Redeploy.
4. Verify `/health` shows `eip155:196`, run one `pay:flow` on mainnet (~$0.80 real).
5. Register + list the ASP on OKX.AI with your Railway URL as the x402 endpoint (see `../CAST-BUILD-BIBLE.md` §9).

## Notes
- `tsx` is a runtime dependency (Railway needs it to run the TS server). No build step required.
- `forge`/OpenZeppelin are dev-only (contract compile) and are not needed on Railway.
