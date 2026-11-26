# The evidence re-stamp (25 Nov 2026)

**Status: built, not live.** The code is in the registry (`veilcore-api`, `lineage/restamp.mjs`),
off by default. Nothing here is live until a re-stamp has been made on the mainnet registry and
reached a Bitcoin block.

**In one sentence:** once a year, VeilCore would put one fingerprint of every lab signature, withdrawal,
key enrolment, timestamp token and batch on Bitcoin, so they still count if today's signatures
are ever broken.

## Why

The full reasoning is in [design/hash-based-signatures.md](design/hash-based-signatures.md),
section 4. Short version:

- Lab signatures (Ed25519), RFC 3161 tokens (RSA or ECDSA) and key enrolments rest on
  elliptic-curve or RSA maths. If that breaks, anyone can make a "lab signature" with any date.
- A Bitcoin date rests on SHA-256 and proof of work, with no signature anywhere on the path. It
  survives.
- A signature that Bitcoin shows existed **before** the break was made by whoever held the key
  then. A forger after the break can't put a new one into a tree already in an old block.
- Today only the hourly batch roots are on Bitcoin. A lab's signature is over a dated record; the
  signature itself has no date of its own. This fixes that.

This is the method long-term archives already use (RFC 4998, Evidence Record Syntax: renew the
timestamps over archived data before their algorithms weaken). Nothing here is new cryptography.

## What goes in

Every item the registry holds, of five kinds. Each item becomes one **entry**:

    entry = SHA256_hex( "veilcore:restamp:v1:" || kind || ":" || SHA256_hex(item bytes) )

hashed as UTF-8 text, the same way SPEC 5.2 hashes batch nodes (hex text, not raw bytes). The
item bytes are exactly what anyone holding the item can produce again:

| Kind | Item bytes | Where the registry keeps it |
|---|---|---|
| `batch-root` | The batch root as 32 raw bytes (`root.bin`, the file OpenTimestamps already stamps) | `batches.root` |
| `attestation` | The attestation as served (its signed fields and its Ed25519 signature), canonical JSON (SDK `canonicalise`, SPEC 4.4) | `attestations.body`, through `signedAttestation` |
| `withdrawal` | The signed withdrawal of an attestation, canonical JSON | `retractions.body`, through `signedRetraction` |
| `enrolment` | The key's registration exactly as it signed it (`registrationPayload`: type, publicKey, displayName, role, accreditation, issuedAt) | `attesters` (`registered_at` is the `issuedAt` it signed) |
| `rfc3161` | The token's DER bytes | `batches.tsa_token`, `batch_timestamps.token`, `record_timestamps.token` |

Lab report signatures and receipts are attestations, so they are in. Private ones too: their
entry is a hash of something carrying a 64-byte signature nobody can guess, so the entry itself
gives nothing away (see "Privacy" for what the counts do show).

An enrolment carries no signature here: the registry keeps none. Its entry dates the
**registry's record** of the key's registration (this key, under this name, by this date), not
the key's own signature. That is what is needed to carry a lab's identity across a break.

An item that can't be put in canonical form (a broken old row) is left out and counted in the
operator's answer, never guessed at.

**Canonical order and encoding.** The entries are 64 lowercase hex characters, de-duplicated and
sorted ascending by code point. That is SPEC 5.1's rule, so the order never depends on how the
rows were stored. The stored list is the sorted entries as 32-byte values back to back; the
published one is the same list as hex strings.

**Not in yet** (each is a new kind later, without changing old re-stamps): the `.ots` files
themselves, Midnight anchor transaction ids, lab website listings and domain checks, and earlier
re-stamp roots (the RFC 4998 chain, needed only if SHA-256 itself ever weakens).

## How the list becomes one root

Exactly as a batch: `buildBatch` from `veilcore-records`, SPEC 5. Leaves are
`SHA256_hex("00" || entry)`, nodes `SHA256_hex("01" || left || right)`, an odd node is carried up
unchanged. So a re-stamp proof **is** a SPEC 5 inclusion proof, and every checker that folds a
batch proof folds this one.

**Why a re-stamp root can't be passed off as a batch root.** The design note asks for the tree
to have its own tag. This build puts the tag in each entry instead and keeps the tree pure SPEC 5,
on purpose, so every existing checker folds a re-stamp proof unchanged. A re-stamp root therefore
looks exactly like a batch root (for the cryptographer: a deliberate change from the note). An
entry is the hash of a `veilcore:restamp:v1:` string, never a record's fingerprint. Nobody can
show a record inside a re-stamp root without a SHA-256 collision. And even if someone presented
one as a batch, all it would show is "this hash existed by that block", which is true.

The same set of items always gives the same root. The registry refuses to make a second re-stamp
when nothing changed since the last one.

## Where it is published

All public, hashes only, from the registry:

| Route | What |
|---|---|
| `GET /restamps` | Every re-stamp, newest first: id, root, when it was made, counts, status (`pending`, then `bitcoin` with the block) |
| `GET /restamps/:id/manifest.json` | The sorted entries, how many of each kind, the root, and the two rules above. **Enough to rebuild the root with nothing else** |
| `GET /restamps/:id/root.bin` | The root as 32 bytes |
| `GET /restamps/:id/root.bin.ots` | Its OpenTimestamps proof |
| `GET /restamps/:id/proof/:entry` | The SPEC 5 inclusion proof of one entry |

**Rebuild it yourself.** From the manifest alone: fold the entries with SPEC 5 and compare with
the root (`checkManifest` in `lineage/restamp.mjs` does it). From your own records: compute your
item's entry with the rule above, find it in the list, and take its proof from the route or
rebuild the tree.

Next step, not built: the mirror (`scripts/mirror` in `veilcore-api`) copying each re-stamp's
manifest, root and `.ots`, so the list outlives our registry. Until then, keep the manifest and
the `.ots` with your evidence.

## How it is stamped

OpenTimestamps, the same code as the hourly batch roots (`lineage/ots.mjs`): the same four public
calendars, every answer checked the way the reference client checks it, and upgraded to a Bitcoin
block only after every block explorer agrees on the header. No RFC 3161 token on the re-stamp root
yet (the design note calls it a convenience; it rests on the signatures this protects against).

## When it runs

- **Off** by default. Deploying the code changes nothing: no table is made, no calendar is asked,
  and every `/restamps` route answers 404 saying it is off (`POST /restamps` asks for the
  operator token first, so without it the answer is 401).
- **`VEILCORE_RESTAMP=manual`**: the maintainer makes one with `POST /restamps` (operator token).
  This is the "now" trigger, and the first act on any trigger in the design note.
- **`VEILCORE_RESTAMP=on`**: manual, plus one automatically when the newest is
  `VEILCORE_RESTAMP_EVERY_DAYS` old (365 by default; the design note says monthly is better once
  anything is on watch).
- In both, an hourly job retries a stamp that failed and upgrades pending ones to Bitcoin.
- It needs OpenTimestamps on (`VEILCORE_OTS` not `off`): a re-stamp is its Bitcoin stamp.

## How a checker proves "this signature existed before date X", offline

What you need: the item (say the lab's attestation JSON as it was served), its proof, the
re-stamp's `manifest.json`, `root.bin` and `root.bin.ots`, and Bitcoin block headers (or a
Bitcoin node).

1. **The item is in the re-stamp.** In a clone of `veilcore-api`:

       node scripts/restamp-check.mjs --kind attestation --item attestation.json \
         --proof proof.json --manifest manifest.json --root-bin root.bin

   It computes the entry, checks the proof is for it, folds the path to the root, and folds the
   manifest's entries to the same root. No network. It prints `IN THE RE-STAMP` and the root.
2. **`root.bin` is that root.** `--root-bin` checks it and says `root.bin is this root`. Without
   it, check by hand that `root.bin` (32 bytes) is the root printed in step 1, for example
   `od -An -tx1 root.bin | tr -d ' \n'`. This step matters: `ots verify` in the next step passes
   for whatever root is in `root.bin`, so a genuine `.ots` for some other root would pass beside a
   proof for this one.
3. **The root is on Bitcoin.** `ots verify -f root.bin root.bin.ots` (the official OpenTimestamps
   client), or the evidence bundle's `verify.html` with its Bitcoin headers, as for a batch today.
   The block's time is date X.
4. **The signature itself still checks** (Ed25519 today; after a break, it is steps 1 to 3 that
   give it weight, not the signature alone).

So: the signature existed by block time X, because its hash is in a tree whose root is in that
block, and changing either needs a SHA-256 second preimage or rewriting Bitcoin's proof of work.
What it does not prove: who held the key. A key stolen the ordinary way before X stays SPEC 7.3's
compromise rule.

Not built yet: the evidence bundle carrying each item's re-stamp proof and `.ots` (`proof/restamp/`
in the design note), and `verify.html` checking the path. Until then the steps above are by hand.

## Privacy

- Only hashes are published. An attestation or a withdrawal carries a 64-byte signature, and a
  token is signed by its TSA, so their entries can't be guessed or reversed.
- Batch roots and enrolments are public already (anyone can read them from the registry), so
  anyone can compute their entries. That shows nothing new.
- The list does not say which entry is which kind, but it gives **how many of each kind**. Anyone
  can compute the entries of every public item (batch roots, enrolments, public attestations and
  withdrawals, batch tokens) and subtract. So **the counts reveal how many private lab signatures
  and receipts, and proof-code tokens, the registry holds**, and comparing two re-stamps reveals
  **how many were added between them**. Once a year that is a yearly total, which the design note
  accepts (and asks the cryptographer to check).
- **So don't run manual re-stamps often.** Two made close together narrow that count to a short
  window, for example how many lab signatures arrived this week. Use the manual trigger for what
  it is for (a trigger in the design note, or the first one), not as a habit.
- Nothing about a record, a holder or a lab's clients is in it.

## What it never does

- No new cryptography: SHA-256, SPEC 5's tree, OpenTimestamps as already used.
- No private data published: no item, no record, no holder key.
- No wallet, no DUST, no NIGHT, no Midnight transaction, no fee. The sponsor is not involved.
- No change to a batch, a proof already issued, or the contracts.
- No new secret. It uses the existing operator token for the manual trigger.

## Where it lives, and why

In the registry (`veilcore-api`), as one module (`lineage/restamp.mjs`), one hourly job and five
routes in `server.js`, and one offline checker script. Not in the sponsor:

- every item it covers (attestations, withdrawals, enrolments, tokens, batches) is in the
  registry's database, and the sponsor can't read it;
- the OpenTimestamps code (`stampRoot`, `upgradeAnswer`, the calendar and explorer checks) is in
  the registry; the sponsor's `anchorer` and `sealer` only send Midnight transactions;
- the operator token, the routes the mirror reads, and the hourly upkeep pattern are already
  there.

A maintainer script was the other option. It would need a shell on the Railway volume to read the
database, and the list would still need a public route. The module is smaller.

## Turning it on (Hunter, from his Mac)

The code ships first, then the variable (CLAUDE.md, "Deploying veilcore.org").

1. Merge the `veilcore-api` pull request. Railway deploys it. Nothing changes: it is off.
2. Check it is off: `curl -s https://veilcore-api-production.up.railway.app/restamps` answers 404, "re-stamps are off".
3. In Railway, service `veilcore-api`, tab Variables: add `VEILCORE_RESTAMP` = `manual`. Deploy
   (a Restart does not apply new variables).
4. Make the first one:

       read -s TOKEN
       curl -s -X POST -H "x-operator-token: $TOKEN" https://veilcore-api-production.up.railway.app/restamps
       unset TOKEN; pbcopy < /dev/null

   It answers with the re-stamp id, root, counts and `"status": "pending"`.
5. A few hours later, `curl -s https://veilcore-api-production.up.railway.app/restamps` shows `"status": "bitcoin"` and the
   block. Only then change "built, not live" here and in [without-veilcore.md](without-veilcore.md).
6. Later, for the yearly run: set `VEILCORE_RESTAMP` = `on` (and `VEILCORE_RESTAMP_EVERY_DAYS`
   if not 365), then deploy.

To turn it off again: **only once the newest re-stamp shows `"status": "bitcoin"`** in
`curl -s https://veilcore-api-production.up.railway.app/restamps`. While it is off, no job runs, so a re-stamp still `pending` is never
upgraded to Bitcoin. Then remove `VEILCORE_RESTAMP` and deploy. Re-stamps already made stay
published.
