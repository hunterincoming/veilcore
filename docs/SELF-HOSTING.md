# Run your own copy of VeilCore

For a lab-software, registry or IT team that wants to run VeilCore themselves instead of using
veilcore.org. All the code is open (Apache-2.0). This page lists what you run, what each part
needs, every setting by name, and how to check it works on a test network before mainnet.

> **Status: nobody outside VeilCore has run this yet.** VeilCore runs every part below for
> veilcore.org and test.veilcore.org, on Railway and Vercel. This guide was written from the
> code and checked against it on paper, not by a second operator's run. If a step is wrong or
> missing, or something breaks, open an issue on
> [hunterincoming/veilcore](https://github.com/hunterincoming/veilcore/issues) or write to
> hunter@veilcore.org. We will fix the guide and the code.

## What you run

| Part | Code | What it does |
|---|---|---|
| **Registry** | [veilcore-api](https://github.com/hunterincoming/veilcore-api) (Node 24, SQLite) | Keeps each record sealed (whoever runs it can't read it), batches proof codes, relays lab codes and licence messages, serves the public check data. |
| **Fee sponsor** | `sponsor/` in this repo (`node dist/main.js`) | Pays the Midnight network fee so nobody needs a wallet. Also runs the **anchoring job**: seals the registry's waiting records into a batch and writes the batch root on Midnight (`anchorBatch`). Without it nothing gets dated on Midnight. |
| **Proof server** | Midnight's Docker image | Makes the sponsor's own proofs (its fee payments and `anchorBatch`). Visitors' proofs are made in their own browser. |
| **Indexer relay** | `sponsor/` again, read-only (`node dist/relay-main.js`) | Lets the browser read Midnight without a key in the page. Midnight's indexers are reached through Blockfrost, which needs a project id; the relay keeps it on the server. On a test network the sponsor serves this itself (`/indexer`); mainnet needs the separate relay. |
| **Site** | `bboard-ui/` in this repo | Static files. Seals records in the browser, makes proofs there, and shows check pages. Any static host works. |

Deploy in this order: registry, proof server, sponsor, relay, site. The sponsor refuses a
registry that names another network or contract, and a mainnet build of the site checks your
registry, sponsor and relay before it builds (step 6). The relay checks nothing before it.

## What you need first

- **Hosting** for three Node 24 services (registry, sponsor, relay), one Docker container
  (proof server) and a static site on **a host name of its own** (the site can't live under a
  sub-path like `example.org/veilcore`). The registry and the sponsor each need a **disk that
  survives redeploys**. VeilCore uses Railway for the services and Vercel for the site; the code
  needs neither.
- **A Midnight wallet for the sponsor**, made only for this (step 3).
- **A Blockfrost project** for Midnight ([blockfrost.io](https://blockfrost.io)): one for
  Midnight Preprod while you test, one for Midnight Mainnet later. The id is a secret.
- **A build computer** (macOS or Linux) with Node 24, npm 11 and the Compact compiler
  **0.31.1** exactly. How to install the compiler, with its checksum:
  [reproduce-build.md, "Install compiler 0.31.1"](reproduce-build.md#install-compiler-0311).
- **Your own privacy policy and terms of use** at https addresses, and a contact email. Your copy
  links them instead of VeilCore's (step 6).

## The contracts: use VeilCore's

Deploying your own contract isn't possible today: both mainnet and preprod run Midnight's
Ledger 9, and a contract built with Compact 0.31.1 can't be deployed on them
([test-site.md](test-site.md)). Use VeilCore's. Anyone may call them; nothing needs our
permission.

| Network | Main contract | Claims contract | Where it's written down |
|---|---|---|---|
| mainnet | `a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347` | `ef763eb4ad1846b716dbfa90c00560a9a943ffb4d1fc638b0707df5adefd070d` | [deployments/mainnet.json](../deployments/mainnet.json) |
| preprod (practice) | `72fe33436d424fcf247919c8e2f0de224175cc55061739be0ebffb2d650f2f73` | `29d3ea80e121518f8fd8bd72533d856cf29cdbddbda1b6f322a661aa4f2484b6` | [deployments/preprod.json](../deployments/preprod.json) |

- `anchorBatch` (writing a batch root) is open to anyone, by design: a batch root dates a batch,
  it does not show who holds a record. Your sponsor writes your batches to the same contract ours
  writes to. A check page reads the contract right after each transaction, so the two never mix.
- Some state is shared too: the licence tree and its revocations. Your sponsor may pay to seal
  revocations made on veilcore.org, and ours may seal yours.
- The **claims** contract has no maintenance key. The **main** contract has one, held by
  VeilCore: what it can do and when it may be used is in
  [maintenance-policy.md](maintenance-policy.md).
- On mainnet the code accepts only these contracts: the site's build reads them from
  `api/src/deploy-guard.ts`, and the sponsor refuses any other.

## 0. Build the contract files, and check them against the chain

The sponsor and the site both need the compiled contract and its proving keys, which are not in
git. On the build computer, from a clean checkout of a commit on `main`:

```
git clone https://github.com/hunterincoming/veilcore.git && cd veilcore
npm ci
npm run check:compiler -- --strict                 # the compiler is exactly 0.31.1
cd contract && npm run compact && cd ..            # the full build, with keys; takes a while
npm exec --package=@veilcore/contracts@0.3.0 -- veilcore-keys check --dir contract/src/managed
```

`veilcore-keys check` compares every key and circuit with the published deployment record. If it
reports a mismatch (whether the keys come out the same on every computer has not been shown),
take the published files instead; each is checked as it downloads:

```
npm exec --package=@veilcore/contracts@0.3.0 -- veilcore-keys fetch --to contract/src/managed
```

That also brings the claims contract's keys ("prove a fact"). Never run a bare `npx veilcore-keys`:
VeilCore doesn't own that npm name. Keys that don't match the chain make every proof fail; the
sponsor then leaves its anchoring job off and its log says so.

The site's build doesn't carry the proving keys or the proving parameters (since 27 November
2026): visitors' browsers download them from a separate file host. Where that is, and how to
serve them yourself, is in step 6, "Where the proving files come from".

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
| `VEILCORE_OPERATOR_TOKEN` | A random secret, 32 characters or more (`openssl rand -hex 32`). Lets the sponsor seal and record batches, and you mark labs' keys. The sponsor gets the same value. |
| `VEILCORE_ANCHOR_NETWORK` | `preprod` or `mainnet`. |
| `VEILCORE_ANCHOR_CONTRACT` | The **main** contract's address for that network (table above). Set both, or no anchor is ever recorded. |
| `TRUST_PROXY_HOPS` | `0` if browsers connect straight to it; `1` behind one load balancer or reverse proxy (the default). Wrong either way and rate limits count the wrong address, or can be dodged. |
| `LAB_RESULTS_DIR` | Where locked lab-result files go; on the same lasting disk. |
| `VEILCORE_SEAL_TIMER` | `on` (recommended): the registry seals batches and asks for their Bitcoin and RFC 3161 dates on its own clock, so those keep coming while the sponsor is down. Keep `VEILCORE_SEAL_EVERY_MINUTES` equal to the sponsor's `ANCHOR_EVERY_MINUTES`. Its README, "The seal timer". |
| `VEILCORE_TSA_URL`, `VEILCORE_TSA_SIGNER_SHA256` | Optional: an RFC 3161 timestamp authority for every batch, with its certificate pinned. |
| `VEILCORE_OTS` | `off` turns off the Bitcoin (OpenTimestamps) stamp of each batch. On by default. |
| `BACKUP_*` | Encrypted off-site backups (README, "Off-site backups"). Do set them up, and try a restore once (`restore.mjs`, with the private key you keep offline) before anyone relies on your copy. |
| `BILLING`, `BILLING_*` | Paid plans. Leave unset (off). |

Check: `https://<registry>/health` says `"ok":true` and lists features;
`https://<registry>/.well-known/veilcore-registry` names your network and contract under `anchors`.

Labs ask whoever runs the registry to mark their key with their public licence or accreditation
(veilcore-api README, "Marking a lab's key"; [lab-name-checks.md](lab-name-checks.md)). On your
copy that's you, with your operator token.

## 2. The proof server

Midnight's image, pinned by digest, `midnightntwrk/proof-server:9.0.1`
(`@sha256:90e36a14f92c2004127f0ed1cfd6ee89d770cf1f6e9cd7f02026ffd4ecb42f37`; mainnet and preprod
both run Ledger 9). Start command `midnight-proof-server -v`, port 6300. Keep it on a private
network that only the sponsor can reach.

## 3. Fund the sponsor wallet

1. In a Midnight wallet app, make a **new wallet only for the sponsor**. Never your
   organisation's main wallet: the sponsor's seed sits on its server, so keep in this wallet
   only what you would accept losing.
2. Give it NIGHT. On preprod, from the faucet (link in [sponsor/README.md](../sponsor/README.md),
   step 3). On mainnet, VeilCore started its sponsor with about 100 NIGHT. The wallet's NIGHT
   keeps generating DUST, up to a cap set by how much NIGHT it holds, and DUST pays the fees: more
   NIGHT means more fees a day. Watch what yours spends (`/sponsor/status` with the token) and
   adjust.
3. Wait until the app shows DUST for the wallet.
4. Turn its 24 words into the seed for `SPONSOR_SEED`, on your build computer:

   ```
   npm run seed-from-phrase -w sponsor                    # a mainnet wallet
   npm run seed-from-phrase -w sponsor -- preprod         # a preprod wallet
   ```

   It asks for the words without showing them, prints the wallet's address and DUST address for
   that network (check both against the app), and puts the seed on the clipboard (pbcopy on a Mac,
   wl-copy or xclip on Linux). With no clipboard tool, add `-- --to-file <path>`: the seed goes in
   that file, readable by you only. Delete it once the seed is in your host's secret settings.
5. `SPONSOR_FORBIDDEN_ADDRESSES`: the address and DUST address of every wallet the sponsor must
   never be, for example your organisation's main wallet. It can't be empty; if you have no other
   wallet, make one in the app and list it, so a mix-up of seeds is refused.
6. Never change the wallet's DUST settings or register its NIGHT again once it is generating.

More on DUST running low and the alarm: [mainnet-sponsor.md](mainnet-sponsor.md), steps 2 and 7.

## 4. The fee sponsor (and the anchoring job)

Make a folder to deploy from (after step 0):

```
npm run stage -w sponsor                        # writes ../veilcore-sponsor-deploy
```

Deploy that folder (`npm ci`, then `npm start`). At start it checks its `anchorBatch` key is the
one on chain. [mainnet-sponsor.md](mainnet-sponsor.md) is how VeilCore does it on Railway.

| Variable | What it is for |
|---|---|
| `SPONSOR_NETWORK` | `preprod` or `mainnet`. |
| `SPONSOR_SEED` | From step 3. A secret. |
| `SPONSOR_FORBIDDEN_ADDRESSES` | From step 3. Comma-separated. |
| `VEILCORE_CONTRACT_ADDRESS` | The main contract for that network. |
| `VEILCORE_CLAIMS_ADDRESS` | Optional: the claims contract, to pay for "prove a fact". |
| `BLOCKFROST_PROJECT_ID` | Your Blockfrost Midnight project for this network. A secret. |
| `PROOF_SERVER_URL` | The proof server's private address, e.g. `http://proof-server:6300`. |
| `STATE_DIR` | A folder on a lasting disk: sync progress, the day's budget, the anchoring job's attempt. It needs no backup, but if it is lost the wallet syncs again from the start (an hour or more). |
| `ALLOWED_ORIGINS` | **Your site's origin**, comma-separated (the default is veilcore.org's: always set it). |
| `TRUST_PROXY_HOPS` | `0` if browsers connect straight to it; `1` behind one proxy (the default). Too high and it refuses every fee request ("did not come through the expected proxy"). |
| `REGISTRY_URL` | Your registry's address. The anchoring job is off without it, and refuses a registry whose `/.well-known/veilcore-registry` names another network or contract. |
| `REGISTRY_OPERATOR_TOKEN` | The registry's `VEILCORE_OPERATOR_TOKEN`. |
| `MAX_FEE_DUST`, `DAILY_BUDGET_DUST`, `LIMIT_PER_NETWORK_DAY` | Spending caps. Required on mainnet. VeilCore started with `MAX_FEE_DUST=5`, `DAILY_BUDGET_DUST=25`, `LIMIT_PER_NETWORK_DAY=30`. |
| `SPONSOR_STATUS_TOKEN` | 32 or more random characters; shows the detailed `/sponsor/status`. Required on mainnet. |
| `POW_SECRET` | Only if you run more than one sponsor process behind a load balancer: the same random value on each, or a challenge from one is refused by another. |
| Optional | `ANCHOR_EVERY_MINUTES`, `ANCHOR_AT_PENDING`, `ANCHOR_RESERVE_DUST`, `LIMIT_PER_NETWORK_HOUR`, `LIMIT_REQUESTS_PER_MINUTE`, `POW_DIFFICULTY`, `QUEUE_DEPTH`, `MAX_TX_BYTES`, `MAX_TTL_MINUTES`, `ALERT_DUST_LOW_DUST` (default 50), `ALERT_FUEL_RUNWAY_DAYS`, `ANCHORER_ENABLED`, `PORT`, and on test networks `INDEXER_URL`, `INDEXER_WS_URL`, `NODE_WS_URL` in place of Blockfrost. Each one: [sponsor/README.md](../sponsor/README.md). |

It refuses to start, listing every problem, if anything is missing or unsafe: for example a
setting that looks like a maintenance key, or a forbidden wallet's seed.

Check: `https://<sponsor>/sponsor/status` says your network, `contractAddress` = the main
contract, `"synced": true` (the first sync can take an hour or more), `"anchorer":{"enabled":true…`
and `"agreements": true`. Watch `/sponsor/alerts` with an uptime monitor: **200** is fine,
**503** names the problem.

## 5. The indexer relay (mainnet)

The same staged folder, started with `node dist/relay-main.js`.

| Variable | What it is for |
|---|---|
| `RELAY_NETWORK` | `mainnet`. |
| `BLOCKFROST_PROJECT_ID` | Your Blockfrost Midnight Mainnet project. A secret. |
| `ALLOWED_ORIGINS` | Your site's origin (https). |
| `TRUST_PROXY_HOPS` | As for the sponsor. |
| Optional | `CARDANO_BLOCKFROST_PROJECT_ID`, `INDEXER_URL`, `INDEXER_WS_URL`, `PORT`: [sponsor/README.md](../sponsor/README.md). |

It holds no wallet, and it refuses to start if any setting it doesn't know **looks like a secret**
(a name with TOKEN, SECRET, KEY, CREDENTIAL, SEED, PASSWORD and the like), naming each one in its
log. Railway's own `RAILWAY_*` settings are let through. Other hosts add their own: for example a
container with a cloud "task role" gets `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI`. Run the relay
without such a role or setting; it needs none.

Check: `/health` says `{"ok":true,"readsOnly":true,"network":"mainnet"}`; `/alerts` says
`{"ok":true,"problems":[]}`. More: [check-on-chain.md](check-on-chain.md).

## 6. The site

Settings are read when the site is **built**, not when it runs. `export` each one in the shell you
build in.

| Variable | What it is for |
|---|---|
| `VITE_API_BASE` | Your registry's https address. |
| `VITE_CANONICAL_ORIGIN` | **Your site's own https address**, e.g. `https://records.example.org`. Every check link, QR code and label points here. A mainnet build with your own registry refuses to build without it, or with a veilcore.org address. |
| `VITE_OPERATOR_NAME` | Who runs your copy, as people should see it. |
| `VITE_OPERATOR_EMAIL` | Where people write for help, to have their data deleted, or to have a lab's key marked. It replaces VeilCore's addresses everywhere in the site, except the page about VeilCore's founders. |
| `VITE_OPERATOR_PRIVACY_URL`, `VITE_OPERATOR_TERMS_URL` | Your own privacy policy and terms (https). `/privacy` and `/terms` then say who runs the copy and link these, instead of VeilCore's, in all five languages. |
| `VITE_REAL_CHAIN` | `1`: the browser sends transactions through your sponsor. **Required on mainnet**: licences, proving a record by link and key stamps need it, and the build refuses without it. |
| `VITE_REAL_CHAIN_CONTRACT_ADDRESS` | The main contract for the network. |
| `VITE_REAL_CHAIN_CONTRACT_VERSION` | Test networks only: `v1` or `v2`, the version of that contract, unless it is one of VeilCore's preprod contracts (`deployments/preprod.json`). Without it, check pages don't look a date up on Midnight: off mainnet a check names its contract version, and a defaulted one is refused. On mainnet the version comes from `deployments/mainnet.json`. |
| `VITE_REAL_CHAIN_CLAIMS_ADDRESS` | The claims contract, if your sponsor pays for claims (its `/sponsor/status` names a `claimsAddress`). Needs the claims keys from step 0 and the k=15 and k=16 parameters. |
| `VITE_SPONSOR_URL` | Your sponsor's https address. |
| `VITE_PROOF_FILES_URL` | Where the browser reads the proving keys and parameters, each checked against the SHA-256 pinned in the build: `https://keys.veilcore.org`, or your own host (`docs/proof-files.md`). A mainnet build with `VITE_REAL_CHAIN=1` refuses to build without it. |
| `VITE_INDEXER_URL`, `VITE_INDEXER_WS_URL` | Where the browser reads Midnight: on a test network `<sponsor>/indexer` and `wss://<sponsor host>/indexer/ws`; on mainnet `<relay>/indexer` and `wss://<relay host>/indexer/ws`. Never a Blockfrost address with a key in it: the page would publish it (the header step refuses one). |
| `VITE_INDEXER_RELAY_URL` | Mainnet: `<relay>/indexer`, so check pages look the date up on Midnight. Test networks fall back to `VITE_INDEXER_URL`. |
| `VITE_NETWORK_ID` | Set by the build: `npm run build` is preprod, `npm run build:mainnet` mainnet. Export `mainnet` too for a mainnet build, so the header step checks the mainnet rules. |
| Optional | `VITE_INDEXER_SECOND_URL` (a second, independent indexer), `VITE_DATING_PAUSED=true` (a "dating is paused" notice), `VITE_OFFLINE=off` (no offline copy), `VITE_ASK_MODEL=on` (the on-device helper, [ask-veilcore.md](ask-veilcore.md)), `VITE_PAID_PLANS=on` (needs the registry's `BILLING=on`). |

The four `VITE_OPERATOR_*` settings go together: all four or none. A mainnet build with your own
registry requires them.

**Build**, from the same clean checkout as step 0:

```
npm run build -w bboard-ui                                             # test network (preprod)
export VITE_NETWORK_ID=mainnet && npm run build:mainnet -w bboard-ui   # or mainnet
```

A mainnet build with your own registry first checks, and refuses to build on any problem
(`scripts/self-host-preflight.mjs`; run it alone with `node scripts/self-host-preflight.mjs`):

- your registry anchors on mainnet at VeilCore's main contract, and its `/health` lists every
  feature the site uses;
- licences are on in the code, so `VITE_REAL_CHAIN=1` is set;
- your sponsor says mainnet, the main contract, synced, anchoring on, and that it pays for licences;
- your relay answers for your site's address.

The site's files are in `bboard-ui/dist`. Then write the headers and the release list, in the same
shell:

```
rm -rf .vercel/output && mkdir -p .vercel/output/static
cp -r bboard-ui/dist/. .vercel/output/static/
node scripts/vercel-config.mjs                                  # the headers and routes
node scripts/release-manifest.mjs mainnet .vercel/output/static # or preprod: the release list
node scripts/nginx-headers.mjs > veilcore-site.conf             # if you serve it with nginx
```

- `scripts/vercel-config.mjs` only writes files, despite its name: `.vercel/output/config.json`
  (the headers and routes) and the page's headers inside `sw.js`.
- `scripts/release-manifest.mjs` lists every file with its SHA-256. It writes `release.json` and
  the list into the site, and a copy to `releases/<network>/<commit>.json` in your checkout: keep
  that with your release. Without it the site has **no offline copy** (the offline worker keeps
  only files it can check against the list) and `/check-this-site` has nothing to check. Build from
  a committed checkout, or the list says `uncommittedChanges: true` and can't be matched to code.

Upload `.vercel/output/static` to your host and serve it with the rules from `config.json`. With
nginx, `include veilcore-site.conf` inside your `server { … }` block, with `root` set to that
folder. Other servers need the same rules:

- every page gets the headers listed in `config.json`, `Content-Security-Policy` included (its
  `connect-src` names your registry, sponsor and relay; anything else is blocked);
- the two Ask model workers (`/assets/ask-model-download.worker-*.js` and
  `/assets/ask-model-engine.worker-*.js`) get their **own** `Content-Security-Policy`, from their
  routes in `config.json`;
- `/sw.js` gets its `Cache-Control`;
- `/tools/passkey-check` serves `/tools/passkey-check.html`;
- any other path that is not a file serves `/index.html`.

One thing to know: the headers include `Strict-Transport-Security` with `includeSubDomains` for
two years, which covers every name under your domain.

### Where the proving files come from

The proving keys and parameters (over 135 MB) are **not** in the build: `npm run build` deletes
`dist/keys` and `dist/params`. A visitor's browser downloads each one from the address in
`VITE_PROOF_FILES_URL`, as `<that address>/sha256/<the file's SHA-256>`, and uses it only if its
SHA-256 is the one pinned in the build (`bboard-ui/src/veilcore/chain/proof-files.json`). The
host only has to be reachable, not trusted. Pick one:

- **Use VeilCore's**: set `VITE_PROOF_FILES_URL=https://keys.veilcore.org` for the build. Nothing
  else to run. Your visitors' browsers then also connect to keys.veilcore.org, which sees what any
  file host sees (their IP address and which public file they asked for). Say so in your privacy
  policy.
- **Serve them yourself**: after step 0 (keys) and
  `cd bboard-ui && node scripts/fetch-params.mjs && cd ..` (parameters), from the repository root:

  ```
  node --input-type=module -e "import { readProofFiles, gatherLocal, mergedList, stageHost } from './scripts/proof-files.mjs'; const t = readProofFiles(); const l = gatherLocal(t.files); if (!l.ok) { console.error(l.problems.join('\n')); process.exit(1); } console.log(stageHost('proof-files-host', mergedList({}, t.files), l.bytes).out);"
  ```

  It checks every file against its pin and writes `proof-files-host/.vercel/output/static/`:
  `sha256/<SHA-256>` for each file, and `proof-files.json`. Serve that folder over https on a host
  name of its own (for example `keys.example.org`), with `Access-Control-Allow-Origin: *` on every
  file (the browser reads them from your site's pages, so without it every proof fails). Then
  build with `VITE_PROOF_FILES_URL=https://keys.example.org`, and keep it set for the header step
  (`scripts/vercel-config.mjs` adds it to the `connect-src` of your security policy).

With neither (no `VITE_PROOF_FILES_URL`), a test-network build reads the files from your own site's
`/keys/` and `/params/` without the check, and you would have to copy them into `dist/` after
`npm run build` by hand. A mainnet build that proves (`VITE_REAL_CHAIN=1`) refuses to build
without it. Use one of the two above.

Check, after the upload: `npm run check:site -- https://<site>` compares every file and header
with the release list. Then open your site, seal a record, and copy its check link: it must start
with your own address.

## Network access

For a locked-down network, these are the outside connections each part makes.

| Part | Connects to |
|---|---|
| Registry | OpenTimestamps calendars and the Bitcoin explorers in `VEILCORE_BTC_EXPLORER` (default blockstream.info and mempool.space); your timestamp authority, if set. |
| Sponsor, relay | `midnight-<network>.blockfrost.io` and `rpc.midnight-<network>.blockfrost.io`; the sponsor also your registry and proof server. |
| Build computer | The npm registry; GitHub releases (the compiler, `veilcore-keys fetch`); Midnight's proving parameters (`fetch-params.mjs`). |
| Visitors' browsers | Your site, registry, sponsor and relay; mempool.space and blockstream.info (only when someone checks a Bitcoin date); huggingface.co only with `VITE_ASK_MODEL=on`. |

## Test it on a test network first

Do the whole thing on **preprod** before mainnet. Test fees are free.

1. Registry: `VEILCORE_ANCHOR_NETWORK=preprod`,
   `VEILCORE_ANCHOR_CONTRACT=72fe33436d424fcf247919c8e2f0de224175cc55061739be0ebffb2d650f2f73`.
2. Sponsor wallet with faucet tNIGHT (step 3, `-- preprod`). Sponsor: `SPONSOR_NETWORK=preprod`,
   the same `VEILCORE_CONTRACT_ADDRESS`, optionally
   `VEILCORE_CLAIMS_ADDRESS=29d3ea80e121518f8fd8bd72533d856cf29cdbddbda1b6f322a661aa4f2484b6`, and
   your Blockfrost Midnight Preprod id.
3. Site: `npm run build -w bboard-ui` with `VITE_REAL_CHAIN=1`, the same contract,
   `VITE_SPONSOR_URL=<sponsor>`, `VITE_INDEXER_URL=<sponsor>/indexer`,
   `VITE_INDEXER_WS_URL=wss://<sponsor host>/indexer/ws`, and your `VITE_CANONICAL_ORIGIN` and
   operator settings (optional on a test network, but set them to see your pages as they will be).
   The automatic checks in step 6 are for mainnet builds; on preprod, check the registry and
   sponsor by hand as their steps say.
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
- **What your copy says about who runs it** comes from your operator settings: `/privacy`,
  `/terms` and every contact address. Some text still names VeilCore or veilcore.org, because it
  is VeilCore's software:
  - the page about VeilCore's founders (`/founders`), and the summary in the page's HTML that
    search engines read (your mainnet copy asks not to be indexed);
  - on a test-network build, the "What's live where" table calls its own column "This test site
    (test.veilcore.org)".
  Check every page before anyone outside your team uses your copy.
- **Your operations are yours**: backups and restores, the sponsor's DUST, uptime monitors and
  updates. The release checklist VeilCore follows is [ops/release-checklist.md](ops/release-checklist.md).
