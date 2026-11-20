# The Bitcoin stamp, checked in the browser

Every sealed batch is stamped on Bitcoin with OpenTimestamps. The stamp file ends on a value
that one Bitcoin block's merkle root must be. Until now, "block N holds it" was a block
explorer's word: the check page didn't look, and the evidence bundle's offline `verify.html`
said it couldn't. Now both can check it themselves, with no explorer trusted:

- **block N's header carries the stamp's value** (the merkle root the stamp's steps end on);
- **it has Bitcoin's proof of work**: its double-SHA-256 hash is at or under the target its own
  `nBits` sets, and that target is no easier than Bitcoin's minimum;
- **it links to a checkpoint pinned in this release**: a chain of headers, each naming the
  hash of the one before, runs from block N to a block whose height and hash the site and
  `verify.html` carry in their own code (`bboard-ui/evidence-page/btc-checkpoints.json`).

Live where: in this pull request only; nothing here is on veilcore.org until it is merged and
deployed, and nothing is called live until it has worked once on mainnet.

## What the page says, and when

The check page's box "What each fact rests on" has a row for the Bitcoin stamp:

| What happened | The row says | Mark |
| --- | --- | --- |
| Nothing yet (the default) | VeilCore's registry says it is in block N; this page hasn't checked it on Bitcoin. A **Check on Bitcoin** button. | registry |
| Linked down to a later checkpoint | Checked in this browser: block N's proof of work and its link to checkpoint M, a block this website pins. The block holds this batch's stamp. Block time. | checked here |
| Linked up from an earlier checkpoint (no later one in reach) | The same, saying the link runs up through blocks mined at Bitcoin's real difficulty, and that a later checkpoint would check it more strongly. | checked here |
| Linked, but the link carries no proof code | The batch's stamp is checked; only the registry says this record is in that batch (as the date row says). | registry |
| Too far from every checkpoint | The block explorers' word (mempool.space, blockstream.info): block N holds this batch's stamp. This browser checked the block's own proof of work but couldn't link it to a checkpoint. | explorers' word |
| Any check failed | Nothing: why, in one of three plain reasons (the stamp file isn't about this batch; the named block doesn't hold it; the headers don't check out or the explorers disagree). | none |
| Explorers unreachable | The registry's word, and a **Try again** button. | registry |
| Stamp still pending | Nothing on Bitcoin yet: only the stamping servers' promise. | none |

Nothing is fetched until the visitor presses the button. The check asks two outside sites,
which see the visitor's internet address, that a VeilCore batch is being checked (the request
comes from veilcore.org), and which block; never the record. The note under the button says
so. In all five languages.

The evidence bundle does the same when it is made, **only if the holder ticks "Include Bitcoin
block headers"** (unticked by default; the option says what the two sites see), at most 20
seconds, every request aborted at the deadline. If the block links, the bundle carries
`proof/bitcoin-headers.json`, and `verify.html` checks those headers with no network. Without
them (not ticked, pending, too far, unreachable) the bundle is as before and the page says it
has no headers.

## How the check works

Code: `bboard-ui/evidence-page/btc-header-chain.js` (the checks; plain browser JavaScript with
no imports, copied into `verify.html` as it is) and `btc-header-fetch.js` (fetching from two
explorers). The site's glue is `bboard-ui/src/veilcore/bitcoin/stamp-check.ts`.

1. **Read the stamp.** `verify-core.js` `readStamp` (the same reader `verify.html` has always
   used): the stamp must start from SHA-256 of the batch root; its steps name block N and the
   merkle root N must have.
2. **Plan.** From the pinned checkpoints: the nearest checkpoint at or above N (walk **down**:
   headers N..M) **whenever it is within 2016 headers**, even if one below is nearer, because
   down can't be faked. Only when no checkpoint above is in reach, the nearest below (walk
   **up**: headers M..N). Too far either way: no link, only the explorers' word.
3. **Fetch.** One explorer supplies the headers, ten blocks a request (`GET /blocks/:height`,
   Esplora; each block's fields are rebuilt into its 80-byte header, which must hash to the id
   the explorer gives). The other explorer must give the same hash for block N
   (`GET /block-height/:height`). Agreement on that one hash is agreement on the whole run: the
   run is a hash chain ending at it, so anyone who has block N with that hash has the same
   headers below it. If the first explorer is down the second supplies the run and the first is
   asked for the hash; both must answer.
4. **Check**, in this order, so a failure is named by the rule it breaks:
   - the hash chain: each header's previous-block field is the hash of the one before, and the
     checkpoint's header hashes to the pinned hash;
   - going **up** only, Bitcoin's difficulty rule on every header: `nBits` unchanged inside a
     2016-block period, and at each adjustment exactly what Bitcoin Core's
     `CalculateNextWorkRequired` gives (the period took between a quarter and four times two
     weeks; never easier than the minimum). The period's first block, whose time sets the new
     difficulty, must itself be a pinned checkpoint (they are: see below). And times: once 11
     headers are in the walk, Bitcoin's rule (after the median of the 11 before); before that a
     floor this page sets, no more than three hours before the checkpoint's time. Bitcoin's times
     aren't in order, so the floor is loose on purpose: it can refuse a header, never pass one;
   - each header's proof of work.
5. **Compare.** Block N's header must carry the stamp's merkle root. A stamp that names two
   blocks (VeilCore's do: two calendars) needs one to check; the row names that one.

### Why each direction holds

- **Down** (N at or below a checkpoint): the pinned hash commits to the checkpoint's header,
  which commits to the one below it, and so on to block N. Finding another header N with the
  same descendants is a second preimage of double SHA-256. Proof of work is checked too, but the
  link doesn't rest on it.
- **Up** (no checkpoint above N within reach): an attacker who wants a fake block N with their
  own merkle root must mine every block from the checkpoint to N at Bitcoin's real difficulty,
  because the difficulty rule leaves them no easier target, and can't date it from well before
  the checkpoint. At October 2026's difficulty (block 971004's nBits) one block is about
  6 × 10^23 hashes, roughly one block reward. On the check page they also have to get both
  explorers to serve that fork; a forged bundle needs no explorer, so `verify.html` says what an
  up link rests on and asks the reader to look the block's hash up. This shows real work was
  spent on a chain from the checkpoint to N, not that Bitcoin's network follows it. That is why
  up is used only when no checkpoint above is in reach, and why fresh checkpoints matter.

### What it doesn't check

- That Bitcoin's network still agrees today (no light client, no peers).
- Block time beyond what the header says. A miner sets it, and Bitcoin allows about two hours
  either way; the page says "as its miner set it".
- Median-time-past and the other rules that don't bear on proof of work.
- Testnets. The difficulty rule here is mainnet's; a testnet's minimum-difficulty blocks fail it.

## Checkpoints: how they are chosen and updated

The file: `bboard-ui/evidence-page/btc-checkpoints.json`. The site, the bundle and
`verify.html` all take their pins from it. On the site the pins are the release's. In a bundle,
`verify.html` itself travels with the files, so someone who forges a bundle can edit its pins
too: the page therefore shows the checkpoint's hash and asks the reader to look it up on any
block explorer or node, rather than asserting it. Anyone can compare it with this file in the
public repository.

**The rule.** One pin at every height that is a multiple of `spacing` (144 blocks, about a day)
from `start` (969696, the first block of the difficulty period VeilCore's first stamps are in)
up to the explorers' tip minus `minConfirmations` (100). Every multiple of 2016 is a multiple of
144, so every difficulty period's first block is pinned, which the up direction needs. With a
pin a day, a record from any day the file covers links down in at most 144 headers (15
requests).

**The seed.** Block 971005: VeilCore's first stamps are in blocks 971004 and 971005, and both
mempool.space and blockstream.info gave the same header for 971005, with real proof of work,
on 15 October 2026, about 500 blocks deep (`docs/bitcoin-stamp-check-11oct.md`). The file
starts with this one pin. It can be compared with any copy of Bitcoin's chain:
`0000000000000000000042601b4858534f518c3fc526a6f1544a728d92f8ead4`.

**Updating** (the maintainer, before a release, on a computer with internet):

```
npm run btc:checkpoints             # adds pins; prints what it did
npm run btc:checkpoints -- --check  # changes nothing; asks both explorers about every pin
```

Then review the diff (it only ever adds pins, in order, and changes `updated`) and commit it.
A new pin is written only when all of these hold, none of them an explorer's word alone:

1. it is linked to the pins already in the file by the same code the page runs: below the
   lowest pin by the hash chain down to it, above the highest by the hash chain up from it with
   the difficulty rule on every header;
2. the second explorer gives the same hash for it;
3. it is at least 100 blocks deep at both explorers.

So every pin is as good as the seed plus real proof of work. (`--check` asks both explorers
about every pin; it doesn't re-link pins already in the file, so a hand-edited pin is caught by
the explorers, not by the links.) The first run fills in from 969696
(a few hundred requests, about a minute); later runs add a day's pin per day.

**What ships in this pull request:** only the seed. Run the update before merging; until then
most records fall back to the explorers' word. A deploy can't carry the browser tests' pins
(block 438, from the difficulty-1 era): `scripts/vercel-config.mjs` refuses such a build.

**How fresh is fresh enough.** A record stamped after the newest pin is checked up from it, at
most 2016 headers (about two weeks). Older than that and the row falls back to the explorers'
word, plainly marked. Running the update with each release keeps every record linkable.

## Using it elsewhere

`btc-header-chain.js` has no dependencies and no VeilCore code in it. Any OpenTimestamps
verifier that runs in a browser can use it:

```js
import { BtcHeaderChain } from './btc-header-chain.js';
const r = await BtcHeaderChain.verifyLink({ height, headers, checkpoints });
// r.ok, r.merkleRoot (compare with the stamp's), r.checkpoint, r.direction, r.time
```

Tests with real mainnet headers: `bboard-ui/src/veilcore/bitcoin/` (fixtures and their sources
in `fixtures/SOURCES.md`), and `scripts/btc-checkpoints.test.mjs` for the update script.
