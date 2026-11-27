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
visitor not to rely on the date. The same goes for a transaction the indexer doesn't have
once it is missing for good. The block and time the registry gives can only make that sooner,
never later, because they are the registry's word: it is missing when the indexer's latest block
is 600 blocks past the registry's block, or an hour past its time (either one); when the
registry's time is in the future; and, once the indexer is caught up with this browser's clock,
unless the registry's time is within the last hour (which backdates nothing) or when its block
is far ahead of the indexer's. Claim links, which anyone can write, follow the same rule.

Only what Midnight contradicts gets the cross. When the page couldn't read the answer, it says
so with a neutral ○ and the registry's date, labelled as its report, and asks again on the
next look (nothing is kept for the visit):
- **"Couldn't read the date from Midnight right now. Don't rely on this date until it's
  confirmed."** The indexer gave a contract state this build can't decode: usually a format
  Midnight brought in with a newer ledger, after this build. Midnight re-expresses old states in
  each new ledger's format, so until the site ships a decoder for it, every date reads this way,
  not as failed.
- **"Midnight's indexer doesn't show that transaction yet."** The indexer doesn't have it, or
  hasn't put it in a block, and its latest block isn't clearly past the registry's.
- **"Only one of the two Midnight indexers could confirm it, and both must."** With two
  indexers, one confirmed it and the other didn't answer, was behind, or couldn't read it.
  "The two indexers disagree" is only for two answers that were both read and differ.

Claim links, licence checks and "prove you hold it" checks follow the same rule: a state that
won't decode, or an indexer that didn't answer, is "try again", never a refusal.

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
- **veilcore.org (mainnet):** reads through a small read-only relay of its own
  (`veilcore-indexer-relay` on Railway): the same relay code, run alone, with no wallet,
  no seed and no fees. It is kept apart from the sponsor so the service that reads the
  chain for every visitor holds nothing worth stealing.

The relay is deployed, and the mainnet build has carried its address since the release of
3 November (`releases/mainnet/`). The site's "the check page reads Midnight itself" line
says "Yes." only in a build that has it. If the relay is down, the page says so and shows the
registry's report; nothing is shown as checked that wasn't. The steps below are kept for
redeploying it.

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
`{"ok":true,"readsOnly":true,"network":"mainnet"}`. Then open
`https://<relay address>/alerts`: `{"ok":true,"problems":[]}` means Blockfrost answered with a
recent Midnight block. Put an UptimeRobot monitor on `/alerts` (`docs/ops/outages.md`):
`/health` stays green when Blockfrost is down, `/alerts` doesn't.

**5. Rebuild veilcore.org with the relay's address.** From the repository folder:

```
VITE_INDEXER_RELAY_URL=https://<relay address>/indexer npm run deploy:mainnet
```

Deploy the registry before the site: the site's sample custody fields (the sample details a lab sees, and what it notes on arrival) use the registry's `/transfers/:id/custody` route.

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
plan runs out, check pages say "Couldn't reach a Midnight indexer". That is not the only thing
that stops: the site's own transactions read Midnight through this same relay too (dating a
record's key after it is sealed, proving a record by link, dating a DNA pairing, licences and
claims: `VITE_INDEXER_URL` in `scripts/deploy-mainnet.mjs`), so those fail until the plan is
back. Saving a record to the registry does not go through the relay.

## A second indexer (optional, later)

`VITE_INDEXER_SECOND_URL=https://…` adds a second indexer; then both must give the same
answer, or the page shows a failure. It only adds anything if it is independent: a second
relay to the same Blockfrost project is the same source twice. Today there is no other
mainnet indexer to point it at; one would be a Midnight indexer VeilCore runs, or another
provider when one exists.
