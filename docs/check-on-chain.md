# The check page looks the date up on Midnight itself

15 October 2026.

## What changed, in plain words

A record's date comes from its batch. The registry puts the batch's fingerprint (the
"batch root") on Midnight in one transaction, and that transaction's block is the date.

Until now the check page took the registry's word for that transaction. Now the visitor's
own browser looks it up on Midnight:

1. It finds the transaction the registry names.
2. It checks that the transaction worked, and that it made exactly one call on VeilCore's
   contract (the address built into the site, not one the registry sends): the date stamp
   call, `anchorBatch`.
3. It reads what that one call wrote. The contract keeps only the latest batch root, so it
   reads the contract right after that transaction, not as it is today.
4. If what was written is this record's batch root, the page says:
   **"Checked on Midnight: this batch root was written by transaction … in block … at … UTC."**
   with a tick, and the mark at the top turns teal (amber, with a test-network heading, when the
   record is on a test network, which carries no evidential weight).

If no Midnight indexer can be reached, the page says **"Couldn't reach a Midnight indexer"** and
gives the registry's reported date (UTC), labelled as the registry's report, with a neutral ○.

If the transaction wrote a different root, failed, or isn't a date stamp on VeilCore's
contract, the page says **"Not confirmed on Midnight: …"** with a cross and tells the
visitor not to rely on the date.

If the browser can't reach Midnight, the page says **"Couldn't reach a Midnight indexer; the
date shown is VeilCore's registry's report."** Nothing is ticked, and the mark stays grey.

What it proves: the batch (and every record in it) existed by that block. It does not say
who wrote the transaction (anyone may date a batch root), or who holds a record.

What it still trusts: the indexer it asks (the service that answers questions about
Midnight's blocks). One indexer could lie. A second, independent one can be added; then
both must give the same answer (see "A second indexer" below).

The code: `bboard-ui/src/veilcore/chain/anchor-check.ts` (the lookup) and
`bboard-ui/src/pages/VerifyPage.tsx` (the page).

## Why mainnet needs one more service

Midnight's keyless indexers are gone for preprod (9 October) and mainnet (30 September).
Both are now served by Blockfrost, which needs a project id on every request
(docs.midnight.network/relnotes/network). A project id inside the website would be public,
so the browser can't ask Blockfrost directly.

- **Test site (test.veilcore.org):** already works. It reads through the sponsor's
  indexer relay, which holds the preprod Blockfrost id on its server. Redeploying the test
  site is enough (`npm run deploy:test`).
- **veilcore.org (mainnet):** needs a small relay. The sponsor can't do it: it
  refuses mainnet, because it holds a wallet and pays fees. So the same relay code now
  also runs alone, read-only: no wallet, no seed, no fees, nothing else.

Until that relay is deployed and the site is rebuilt with its address, veilcore.org keeps
saying exactly what it says today: the date is the registry's report and the page has not
looked it up. Nothing is shown as checked that wasn't.

## What Hunter deploys (about 20 minutes, from the Mac)

**1. A Blockfrost mainnet project.** On blockfrost.io, create a project for **Midnight
Mainnet** and copy its project id. It is a secret: it goes only into Railway, never into the
website or this repository. A preprod id does not work on mainnet.

**2. A new Railway service** in the VeilCore project, named `veilcore-indexer-relay`.

Variables (Railway → the service → Variables):

| Name | Value |
|---|---|
| `RELAY_NETWORK` | `mainnet` |
| `BLOCKFROST_PROJECT_ID` | the id from step 1 |
| `ALLOWED_ORIGINS` | `https://veilcore.org,https://www.veilcore.org` |
| `TRUST_PROXY_HOPS` | `1` |

Nothing else. Do not copy the sponsor's variables: the relay refuses to start if it sees a
seed, a mnemonic, a private key, a maintenance setting or an operator token.

Settings → Deploy → **Custom Start Command:** `node dist/relay-main.js`

Settings → Networking → **Generate Domain**. Note the address, for example
`https://veilcore-indexer-relay-production.up.railway.app`.

**3. Upload it.** From the repository folder, the same staging the sponsor uses:

```
npm run stage -w sponsor
railway up ../veilcore-sponsor-deploy --path-as-root --service veilcore-indexer-relay
```

**4. Check it.** Open `https://<relay address>/health`. It must say
`{"ok":true,"readsOnly":true,"network":"mainnet"}`.

**5. Rebuild veilcore.org with the relay's address.** From the repository folder:

```
VITE_INDEXER_RELAY_URL=https://<relay address>/indexer npm run deploy:mainnet
```

The address must be given on every mainnet deploy from now on. Left out, the site still
works and goes back to calling the date the registry's report. The deploy refuses an
address that isn't https or that carries a key.

The same address also switches the landing page's wording: a build with it says the check
page reads Midnight itself; a build without it says that's coming. After the first deploy
with the relay, change `m.live.chain.main` in `bboard-ui/src/i18n/en.ts` to "Yes." so the
test site's table agrees.

**6. Check it on the live site.** Open the check link (the one ending in `?fp=…`) of a
record in batch `B-20261011-FE71` (anchored on mainnet 11 October, transaction
`e13c88f5…96bcbf`, block 2973563). The page should show "Checked on Midnight: …" with a
tick and the teal mark. If it says "Couldn't reach a Midnight indexer", look at the relay's
logs on Railway: the relay's question to Blockfrost has only been tested against a
stand-in from here, not against Blockfrost's mainnet indexer itself.

## Cost and limits

Each check page asks one question per indexer. The relay allows 240 questions a minute per
visitor address and counts against the Blockfrost plan of the project in step 1. If the
plan runs out, check pages say "Couldn't reach a Midnight indexer" and nothing else breaks.

## A second indexer (optional, later)

`VITE_INDEXER_SECOND_URL=https://…` adds a second indexer; then both must give the same
answer, or the page shows a failure. It only adds anything if it is independent: a second
relay to the same Blockfrost project is the same source twice. Today there is no other
mainnet indexer to point it at; one would be a Midnight indexer VeilCore runs, or another
provider when one exists.
