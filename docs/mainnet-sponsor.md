# Turning on the mainnet sponsor (for the operator)

What it gives veilcore.org: batches dated automatically, and from the browser the record-key
stamp, "prove it by link" and the DNA pairing date, with VeilCore paying the network fee.
Licences and royalties stay practice-only.

What is safe about it: the sponsor wallet is a NEW wallet made only for this, holding a small
amount of NIGHT. Its key sits on Railway, so never put more NIGHT in it than you'd accept losing.
It pays only for VeilCore's pinned contract and only the three browser calls plus the anchoring
job. Each fee is capped, each day is capped, and so is each visitor. It refuses to start with
your deployer or 1AM addresses, with the maintenance key, or without every limit set. Worst
case: one day's budget is used up and it waits until the next day.

Do the steps in order. Each one says how you know it worked.

## 1. The relay (if not done yet)

`docs/check-on-chain.md`, steps 1 to 4. You need its address for steps 5 and 6.

## 2. The sponsor wallet: a new wallet in the 1AM app (done 18 Oct)

A separate wallet made in the 1AM app only for the sponsor, NOT the 1AM wallet that deployed
the contract. Put a small amount of NIGHT in it (about 100). In the app, its NIGHT makes DUST
for its own DUST address, so nothing needs pointing anywhere. Wait until the app shows DUST.

## 3. Its seed for Railway (your Mac, 2 minutes)

```
cd ~/Desktop/veilcore
git pull
npm run seed-from-phrase -w sponsor
```

Paste the NEW wallet's 24 words when asked (nothing shows). It prints the wallet's address
and DUST address: check both against the new wallet in the 1AM app. They must match. The seed
is put on your clipboard for step 4's `SPONSOR_SEED`; clear it after with `pbcopy < /dev/null`.

Also copy the MAIN 1AM wallet's two Midnight addresses (its address, `mn_addr1…`, and its DUST
address, `mn_dust1…`). They go in `SPONSOR_FORBIDDEN_ADDRESSES`, so the sponsor refuses to run
as that wallet.

## 4. Railway: the service (15 minutes)

In the VeilCore project: **+ Create → Empty Service**, name it `veilcore-sponsor-mainnet`.

**Variables → Raw Editor**, paste and fill the four marked lines:

```
SPONSOR_NETWORK=mainnet
SPONSOR_SEED=<paste from step 3>
SPONSOR_FORBIDDEN_ADDRESSES=<1AM mn_addr1…>,<1AM mn_dust1…>
VEILCORE_CONTRACT_ADDRESS=a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347
BLOCKFROST_PROJECT_ID=<your Midnight Mainnet Blockfrost id>
PROOF_SERVER_URL=http://proof-server.railway.internal:6300
STATE_DIR=/data
ALLOWED_ORIGINS=https://veilcore.org,https://www.veilcore.org
TRUST_PROXY_HOPS=1
MAX_FEE_DUST=5
DAILY_BUDGET_DUST=25
LIMIT_PER_NETWORK_DAY=30
SPONSOR_STATUS_TOKEN=<64 random characters: run `openssl rand -hex 32` on your Mac>
REGISTRY_URL=https://veilcore-api-production.up.railway.app
REGISTRY_OPERATOR_TOKEN=${{veilcore-api.VEILCORE_OPERATOR_TOKEN}}
ANCHOR_EVERY_MINUTES=60
```

The last token line is a Railway reference: it copies the registry's token without you
pasting it. Never add a maintenance key or the 1AM phrase.

- **Settings → Volumes:** add one, mount path `/data`.
- **Settings → Networking → Generate Domain.** Copy the address.

Upload it from your Mac:

```
cd ~/Desktop/veilcore
npm run stage -w sponsor
railway up ../veilcore-sponsor-deploy --path-as-root --service veilcore-sponsor-mainnet
```

It worked when the deploy log shows `sponsor wallet` with the DUST address from step 2, then
`listening`. Open `https://<its address>/sponsor/status`. Wait until it says
`"synced": true` (the first sync can take a while), with `"network":"mainnet"` and
`"anchorer":{"enabled":true…`.

If the log says the sponsor will not start, it lists every problem in plain words.

## 5. Deploy veilcore.org with it

```
cd ~/Desktop/veilcore
VITE_INDEXER_RELAY_URL=https://<relay address>/indexer VEILCORE_MAINNET_SPONSOR=https://<sponsor address> npm run deploy:mainnet
```

It checks the sponsor (mainnet, VeilCore's contract, synced, anchoring on) and the relay
before building, and stops with the reason if anything is off. Then commit the release list
as usual: `git add releases && git commit -m "Release list: mainnet" && git push`.

## 6. Test it together (20 minutes)

On veilcore.org, with made-up details you are fine having on mainnet:

1. Make a record. Within the hour its page shows the batch dated on Midnight.
2. Its record-key stamp goes through (the page says so).
3. Make a prove link and open it on your phone: it checks.
4. Add a DNA file and date the pairing.

Send me `/sponsor/status` with the token. From your Mac, without the token showing on screen
or in the shell's history: copy `SPONSOR_STATUS_TOKEN` from Railway, run `read -s TOKEN`,
paste, Enter, then
`curl -s -H "x-operator-token: $TOKEN" https://<sponsor>/sponsor/status; unset TOKEN; pbcopy < /dev/null`.
The fees it shows set the real caps.

## 7. The alarm (10 minutes, once)

On 31 Oct 2026 the stamping job failed for hours, "could not balance dust": the service was
still running a wallet with no DUST. The public status said `"alert":true`, but nothing was
watching it, and it was found only because a record stayed undated. So the sponsor has an
address for an outside monitor: `GET /sponsor/alerts` answers **200** when nothing needs you
and **503** with codes when something does:

- `anchoring-failing`: three stamping runs in a row failed.
- `sync-stalled`: the wallet sync has made no progress for 30 minutes.
- `not-synced`: still not synced three hours after starting.
- `fuel-low`: under `ALERT_DUST_LOW_DUST` DUST left (default 50, ten stamps at the default cap).
  The wallet holds no NIGHT of its own, so its DUST doesn't refill: top it up before this fires.

Codes only: no balances, no error text, no token.

1. Make a free account at uptimerobot.com (free plan: checks every 5 minutes, any use).
2. **Add New Monitor → HTTP(s)**. URL: `https://veilcore-sponsor-mainnet-production.up.railway.app/sponsor/alerts`.
   Name: `VeilCore stamping (mainnet)`. Interval: 5 minutes.
3. Alert contacts: your email, and the UptimeRobot app on your phone for a push.
4. Save. It shows **Up**. If it shows **Down**, open the address in a browser: the codes say why.

Optional: a second monitor on the test sponsor's `/sponsor/alerts`, so test-site problems
show up too.
