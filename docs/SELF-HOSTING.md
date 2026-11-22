# Run your own copy of VeilCore

For a lab-software, registry or IT team that wants to run VeilCore themselves instead of using
veilcore.org. All the code is open (Apache-2.0). This page lists what you run, what each part
needs, every setting by name, and how to check it works on a test network before mainnet.

> **Status: nobody outside VeilCore has run this yet.** VeilCore runs every part below for
> veilcore.org and test.veilcore.org, on Railway and Vercel. This guide was written from the
> code, not from a second operator's run. If a step is wrong or missing, or something breaks,
> open an issue on [hunterincoming/veilcore](https://github.com/hunterincoming/veilcore/issues)
> or write to hunter@veilcore.org. We will fix the guide and the code.

## What you run

| Part | Code | What it does |
|---|---|---|
| **Registry** | [veilcore-api](https://github.com/hunterincoming/veilcore-api) (Node 24, SQLite) | Keeps each record sealed (VeilCore can't read it), batches proof codes, relays lab codes and licence messages, serves the public check data. |
| **Fee sponsor** | `sponsor/` in this repo (`node dist/main.js`) | Pays the Midnight network fee so nobody needs a wallet. Also runs the **anchoring job**: seals the registry's waiting records into a batch and writes the batch root on Midnight (`anchorBatch`). Without it nothing gets dated. |
| **Proof server** | Midnight's Docker image | Makes the sponsor's own proofs (its fee payments and `anchorBatch`). Visitors' proofs are made in their own browser. |
| **Indexer relay** | `sponsor/` again, read-only (`node dist/relay-main.js`) | Lets the browser read Midnight without a key in the page. Midnight's indexers are reached through Blockfrost, which needs a project id; the relay keeps it on the server. On a test network the sponsor serves this itself (`/indexer`); mainnet needs the separate relay. |
| **Site** | `bboard-ui/` in this repo | Static files. Seals records in the browser, makes proofs there, and shows check pages. Any static host works. |

Deploy in this order: registry, proof server, sponsor, relay, site. Each later part checks the
one before it.

## What you need first

- **Hosting** for three Node services (registry, sponsor, relay), one Docker container (proof
  server) and a static site. The registry and the sponsor each need a **disk that survives
  redeploys** (the registry's database, the sponsor's sync state). VeilCore uses Railway for
  the services and Vercel for the site; nothing in the code needs either.
- **A Midnight wallet for the sponsor**, made only for this, never your deployer wallet. It holds
  some NIGHT, which generates the DUST it pays fees with. Its seed sits on the sponsor's server,
  so keep in it only what you would accept losing.
- **A Blockfrost project** for Midnight ([blockfrost.io](https://blockfrost.io)): one for
  Midnight Preprod while you test, one for Midnight Mainnet later. The id is a secret.
- **Contract addresses** (next section).
- A computer with Node 24 and npm 11, and the Compact compiler **0.31.1** (to build the
  contract files the sponsor and the site need).

## The contracts: VeilCore's or your own

**Use VeilCore's deployed contracts (simplest).** Anyone may call them; nothing needs our
permission.

- `anchorBatch` (writing a batch root) is open to anyone, by design: a batch root dates a
  batch, it does not show who holds a record. Your sponsor writes your batches to the same
  contract ours writes to. A check page reads the contract right after each transaction, so
  the two never mix up.
- The **claims** contract (`ef763eb4…fd070d`) has no maintenance key at all.
- The **main** contract (`a04de0a2…a02347`) has a maintenance key, held by VeilCore. What it can
  and cannot do, and when it may be used: [maintenance-policy.md](maintenance-policy.md).
- Full addresses, and how to check what is on chain matches this source:
  [reproduce-build.md](reproduce-build.md).

**Or deploy your own.** On a test network: compile (`cd contract && npm run compact`), then
deploy with the operator tool (`cd bboard-cli && npm run preprod-remote`, then Deploy;
[ops/runbook.md](ops/runbook.md)). On mainnet the code accepts only VeilCore's contracts, on
purpose: the site's build reads them from `api/src/deploy-guard.ts`, and the sponsor refuses any
other (`sponsor/src/config.ts`, `MAINNET_CONTRACT`, `MAINNET_CLAIMS_CONTRACT`). Your own mainnet
contract means changing those in your copy, which is then a fork: records dated on it are not
checked by veilcore.org's pages.

## 1. The registry (veilcore-api)

```
git clone https://github.com/hunterincoming/veilcore-api.git && cd veilcore-api
npm ci
npm start        # node server.js
```

Settings (its README, "Environment", lists every optional one):

| Variable | What it is for |
|---|---|
| `PORT` | Port to listen on (default 8787). |
| `DB_PATH` | The SQLite file. **Put it on a disk that survives redeploys**, or every record is lost on the next deploy. |
| `PUBLIC_BASE` | This registry's own public https address. Defaults to VeilCore's: always set it. |
| `VEILCORE_OPERATOR_TOKEN` | A random secret, 32 characters or more (`openssl rand -hex 32`). Lets the sponsor seal and record batches. The sponsor gets the same value. |
| `VEILCORE_ANCHOR_NETWORK` | `preprod` or `mainnet`: the network batches are dated on. |
| `VEILCORE_ANCHOR_CONTRACT` | The **main** contract's address (64 hex). Not the claims contract. Set both, or no anchor is ever recorded. |
| `TRUST_PROXY_HOPS` | How many proxies are in front of it (1 behind one load balancer). Rate limits depend on it. |
| `LAB_RESULTS_DIR` | Where locked lab-result files go; on the same lasting disk. |
| `VEILCORE_TSA_URL`, `VEILCORE_TSA_SIGNER_SHA256` | Optional: an RFC 3161 timestamp authority for every batch, with its certificate pinned. |
| `VEILCORE_OTS` | `off` turns off the Bitcoin (OpenTimestamps) stamp of each batch. On by default. |
| `BACKUP_*` | Optional encrypted off-site backups (README, "Off-site backups"). Strongly advised. |
| `BILLING`, `BILLING_*` | Paid plans. Leave unset (off). |

Check: `https://<registry>/health` says `"ok":true` and lists features; the site uses those in
`scripts/registry-features.mjs`. `https://<registry>/.well-known/veilcore-registry` names your
network and contract under `anchors`.

## 2. The proof server

Midnight's image, pinned by digest, `midnightntwrk/proof-server:9.0.1`
(`@sha256:90e36a14f92c2004127f0ed1cfd6ee89d770cf1f6e9cd7f02026ffd4ecb42f37`; mainnet and preprod
both run Midnight's Ledger 9). Start command `midnight-proof-server -v`, port 6300. Keep it on a
private network that only the sponsor can reach.

## 3. The fee sponsor (and the anchoring job)

Build a folder to deploy from (it needs the compiled contract with its keys, which are not in git):

```
npm ci
cd contract && npm run compact && cd ..        # Compact compiler 0.31.1, full build with keys
npm run stage -w sponsor                        # writes ../veilcore-sponsor-deploy
```

Deploy that folder (`npm ci`, then `npm start`) to your host. At start it checks its
`anchorBatch` key is the one on chain; a contract built another way leaves the anchoring job off,
and the log says so. `docs/mainnet-sponsor.md` is how
VeilCore does it on Railway.

| Variable | What it is for |
|---|---|
| `SPONSOR_NETWORK` | `preprod` or `mainnet`. |
| `SPONSOR_SEED` | The sponsor wallet's hex seed. A secret. `npm run seed-from-phrase -w sponsor` turns a 24-word phrase into it. |
| `SPONSOR_FORBIDDEN_ADDRESSES` | Your deployer wallet's addresses, comma-separated. It refuses to run as that wallet. |
| `VEILCORE_CONTRACT_ADDRESS` | The main contract (on mainnet, only VeilCore's). |
| `VEILCORE_CLAIMS_ADDRESS` | Optional: the claims contract, to pay for "prove a fact". |
| `BLOCKFROST_PROJECT_ID` | Your Blockfrost Midnight project for this network. A secret. |
| `PROOF_SERVER_URL` | The proof server's private address, e.g. `http://proof-server:6300`. |
| `STATE_DIR` | A folder on a lasting disk: sync progress, the day's budget, the anchoring job's attempt. |
| `ALLOWED_ORIGINS` | **Your site's origin**, comma-separated (default is veilcore.org's: always set it). |
| `TRUST_PROXY_HOPS` | Proxies in front of it. |
| `REGISTRY_URL` | Your registry's address. The anchoring job is off without it, and refuses a registry whose `/.well-known/veilcore-registry` names another network or contract. |
| `REGISTRY_OPERATOR_TOKEN` | The registry's `VEILCORE_OPERATOR_TOKEN`. |
| `MAX_FEE_DUST`, `DAILY_BUDGET_DUST`, `LIMIT_PER_NETWORK_DAY` | Spending caps. Required on mainnet; defaults on test networks. |
| `SPONSOR_STATUS_TOKEN` | 32 or more random characters; shows the detailed `/sponsor/status`. Required on mainnet. |
| Optional | `ANCHOR_EVERY_MINUTES`, `ANCHOR_AT_PENDING`, `ANCHOR_RESERVE_DUST`, `LIMIT_PER_NETWORK_HOUR`, `LIMIT_REQUESTS_PER_MINUTE`, `POW_DIFFICULTY`, `QUEUE_DEPTH`, `MAX_TX_BYTES`, `MAX_TTL_MINUTES`, `ALERT_DUST_LOW_DUST`, `ALERT_FUEL_RUNWAY_DAYS`, `ANCHORER_ENABLED`, `PORT`, and on test networks `INDEXER_URL`, `INDEXER_WS_URL`, `NODE_WS_URL` in place of Blockfrost. Each one: [sponsor/README.md](../sponsor/README.md). |

It refuses to start, listing every problem, if anything is missing or unsafe: for example a
setting that looks like a maintenance key, or your deployer's seed.

Check: `https://<sponsor>/sponsor/status` says your network and contract, `"synced": true`
(the first sync can take an hour or more) and `"anchorer":{"enabled":true…`. Watch
`/sponsor/alerts` with an uptime monitor: **200** is fine, **503** names the problem.

## 4. The indexer relay (mainnet)

The same staged folder, started with `node dist/relay-main.js`. It holds no wallet, and refuses
to start if it sees one.

| Variable | What it is for |
|---|---|
| `RELAY_NETWORK` | `mainnet`. |
| `BLOCKFROST_PROJECT_ID` | Your Blockfrost Midnight Mainnet project. A secret. |
| `ALLOWED_ORIGINS` | Your site's origin. |
| `TRUST_PROXY_HOPS` | Proxies in front of it. |

Check: `/health` says `{"ok":true,"readsOnly":true,"network":"mainnet"}`; `/alerts` says
`{"ok":true,"problems":[]}`. More: [check-on-chain.md](check-on-chain.md).

On a test network, skip it: the sponsor's own `/indexer` does this.

## 5. The site

Settings are read when the site is **built**, not when it runs:

| Variable | What it is for |
|---|---|
| `VITE_API_BASE` | Your registry's https address. |
| `VITE_CANONICAL_ORIGIN` | **Your site's own https address**, e.g. `https://records.example.org`. Every shared link, QR code and label points here. A mainnet build with your own registry refuses to build without it; without it, labels would send people to veilcore.org, whose registry has never heard of your records. |
| `VITE_REAL_CHAIN` | `1`: the browser sends transactions through your sponsor. |
| `VITE_REAL_CHAIN_CONTRACT_ADDRESS` | The main contract (on mainnet, VeilCore's). |
| `VITE_REAL_CHAIN_CLAIMS_ADDRESS` | The claims contract, if your sponsor pays for claims. Needs the claims keys, and the k=15 and k=16 parameters. |
| `VITE_SPONSOR_URL` | Your sponsor's https address. |
| `VITE_INDEXER_URL`, `VITE_INDEXER_WS_URL` | Where the browser reads Midnight: on a test network `<sponsor>/indexer` and `wss://<sponsor host>/indexer/ws`; on mainnet `<relay>/indexer` and `wss://<relay host>/indexer/ws`. Never a Blockfrost address with a key in it: the page would publish it (the build refuses one). |
| `VITE_INDEXER_RELAY_URL` | Mainnet: `<relay>/indexer`, so check pages look the date up on Midnight. Test networks fall back to `VITE_INDEXER_URL`. |
| `VITE_NETWORK_ID` | Set by the build mode: `npm run build` is preprod, `npm run build:mainnet` mainnet. Export `mainnet` too for a mainnet build, so the header step below checks the mainnet rules. |
| Optional | `VITE_INDEXER_SECOND_URL` (a second, independent indexer), `VITE_DATING_PAUSED=true` (a "dating is paused" notice), `VITE_OFFLINE=off` (no offline copy), `VITE_ASK_MODEL=on` (the on-device helper), `VITE_PAID_PLANS=on` (needs the registry's `BILLING=on`), `VITE_CARDANO_RELAY_URL`. |

Build:

```
npm ci
cd contract && npm run compact && cd ..          # if not done for the sponsor
cd bboard-ui && node scripts/fetch-params.mjs && cd ..
# export the variables above in this shell, then one of:
npm run build -w bboard-ui                       # test network (preprod)
export VITE_NETWORK_ID=mainnet && npm run build:mainnet -w bboard-ui   # mainnet
```

The site's files are in `bboard-ui/dist`. Then write the security headers for those exact
settings, in the same shell:

```
rm -rf .vercel/output && mkdir -p .vercel/output/static
cp -r bboard-ui/dist/. .vercel/output/static/
node scripts/vercel-config.mjs
```

Despite its name, `scripts/vercel-config.mjs` only writes files: `.vercel/output/config.json`
lists the headers and routes, and it writes the page's headers into `sw.js`. Upload
`.vercel/output/static` to any static host and copy the rules from `config.json`:

- every page gets the headers listed there, `Content-Security-Policy` included (its
  `connect-src` names your registry, sponsor and relay; a call to anything else is blocked);
- `/sw.js` gets its `Cache-Control`;
- `/tools/passkey-check` serves `/tools/passkey-check.html`;
- any other path that is not a file serves `/index.html`.

The site needs https (for the camera, passkeys and the offline copy).

Check: open your site, seal a record, and copy its check link. It must start with your own
address, not veilcore.org.

## Test it on a test network first

Do the whole thing on **preprod** before mainnet. Test fees are free: the preprod faucet gives
tNIGHT ([sponsor/README.md](../sponsor/README.md), step 3).

1. Registry with `VEILCORE_ANCHOR_NETWORK=preprod` and your preprod contract.
2. Sponsor with `SPONSOR_NETWORK=preprod`, the same contract, your Blockfrost Midnight Preprod id.
3. Site built with `npm run build -w bboard-ui`, `VITE_INDEXER_URL=<sponsor>/indexer`,
   `VITE_INDEXER_WS_URL=wss://<sponsor host>/indexer/ws`.
4. On the site: seal a record. Within an hour (or set `ANCHOR_EVERY_MINUTES=5` for the test) the
   sponsor's log says `anchoring: anchored B-…`, and the record's check page says it is dated on
   Midnight preprod (a test network). Open the check link on a phone.

The pages say "test network" everywhere in a preprod build. Records made there carry no
evidential weight. To move to mainnet, build every part again with the mainnet settings: a
test-network record does not move across.

## What does not carry over

- **Your records live on your registry.** veilcore.org can't find them, and yours can't find
  ours. A check link works on the site that made it. The record file itself (the backup) checks
  anywhere, with no server: [without-veilcore.md](without-veilcore.md).
- **The pages still say VeilCore** and, in places, veilcore.org: it is VeilCore's site, run by
  you. A mainnet build with your own address asks search engines not to index it.
- **Your operations are yours**: backups, the sponsor's DUST, uptime monitors and updates. The
  release checklist VeilCore follows is [ops/release-checklist.md](ops/release-checklist.md).
