# A record that names its own key (14 Oct 2026)

**In one line:** the record names its own key, and the fingerprint covers that, so the key
can't be swapped.

## The problem

"Prove it" showed that whoever answered controls the on-chain key named in the link. Nothing
tied that key to the record: the link is written by the holder, so a holder could put any
key they control next to any record's fingerprint, and the check page would say "Confirmed".
The page said so ("the holder's statement"), but that made the check weak.

## What changes

When a plant is sealed, its key is made first (it always could be: the key's on-chain form,
its *identity*, is `commit(record secret)`, a plain hash, so nothing on chain is needed).
The record then carries one more sealed field, `keyBinding`, and its fingerprint is built
around it:

```
identity     = H("veilcore:v1:commit",    recordSecret)      the contract's commit(), unchanged
keySalt      = H("veilcore:v1:keysalt",   recordSecret)
keyBinding   = H("veilcore:v1:keybind",   identity, keySalt)  sealed inside the record
contentHash  = SHA-256(canonical JSON of the sealed fields, keyBinding included)
fingerprint  = H("veilcore:v1:keyrecord", keyBinding, contentHash)
```

`H` is SHA-256 over 32-byte pieces, the first the tag in UTF-8 padded with zeros to 32 bytes
(the same `H` as SPEC 3.7 and 4.5, and the contract's own `commit`). Every input is 64
lowercase hex characters.

- **Field name and place:** `keyBinding`, a top-level sealed field of the app record, next to
  `nonce`, `strainName` and the rest. Sealed only when present.
- **Version:** a bound fingerprint is a new form, named `sha256/key-bound/v1` wherever a
  fingerprint's algorithm is written (the export's registered-fingerprint block). Records
  without `keyBinding` keep `sha256/canonical-json/v1` and recompute byte for byte as before.
  The envelope format (`formatVersion` 0.1) does not change. SPEC section 3.6.1 describes it.
- **Why the salt:** the registry stores the whole record. With the identity itself in the
  record, the registry could match a holder's account to their on-chain activity (that is
  why `record-keys.ts` kept it off the record). The salt hides it: `keyBinding` says nothing
  about the key without `keySalt`. The salt comes from the record secret, so the backup
  file already brings it back; nothing new to keep. The salt never goes on the record.
- **Why two layers, not just a field:** a checker has only the fingerprint, not the plant's
  details. With the key folded in at the top, the link can carry `contentHash` (a hash; it
  shows nothing) and the checker recomputes the fingerprint without seeing anything private.
  Because `keyBinding` is also inside the JSON, one set of details can't be paired with two
  keys. This is the same shape as field sets (SPEC 4.5).

## What a checker does

The link names the record's fingerprint (`fp`), its key (`chain`, the identity), the key's
salt (`ks`) and the content hash (`cd`); both places that make such a link (the share
screen and the plant's prove panel) build it the same way (`veilcore/prove-link.ts`), and
make none for a bound record whose keys in this browser aren't the ones it named. The check
page:

1. confirms the registry reports the same fingerprint for this record as the link (as today);
2. recomputes `H("veilcore:v1:keyrecord", H("veilcore:v1:keybind", chain, ks), cd)` and
   requires it to equal `fp`; otherwise it refuses: "The key in this link isn't the one
   this record names.";
3. only then asks the holder to prove control of `chain`, and checks the answer on chain as
   before (`acceptOwnership`). The same recomputation runs again when each answer is
   checked, and in "Do it by hand".

The registry is never trusted for this: a lying registry can make a check fail, not pass.

## Older records

Records sealed before this have no `keyBinding`. They stay valid; their fingerprints are
unchanged. The check page shows today's wording, plus "Older record: key not bound to this
record." If the registry says a record *is* bound but the link leaves out `ks` and `cd`, the
page refuses rather than falling back to the weaker wording. (A registry that lied the other
way could only make a bound record look like an older one, which shows the weaker wording;
it can't make a check pass.)

## What "Confirmed" says, for a bound record

> Whoever answered controls this record's own key, right now. The record named that key
> when it was sealed, so it can't be swapped.
>
> It doesn't show who they are or who bred the plant.
>
> Checked … on the test network, which can be reset: practice only, no evidential weight.

What stays the holder's own statement: everything in the record (the name, who bred it,
when). The check shows control of the record's key, not who the person is, not who bred the
plant, and not that they ever had the plant.

## Dates: what the date stamp dates

Two different things get dated, and binding does not merge them:

- **The record's fingerprint** is dated when its batch is dated (`anchorBatch`). For a bound
  record that fingerprint covers the key too, so that date dates the record and its key
  together.
- **The key's date stamp** (`anchor`, the "Seal it and date stamp it" step on test builds)
  dates the key only. A key dated in May can still be named by a record sealed in October,
  so the key's date never dates the plant's details. The logging flow and the plant's next
  step now say "your plant's key" for that one. (Still to change, in a file another
  builder had open: the plant page's "Public date stamp" row on test builds shows the
  key's date; it should read "Key date stamped" or show the batch date.)

## Not covered

- Received records (a lab's record of what arrived) aren't date stamped or proved, so they
  aren't bound. A correction is a new record and gets its own key and binding.
- A holder who rotates the key on chain (command line only) must keep the salt: it comes
  from the first secret.
- The SDK (`veilcore-records`), its Python and Rust ports and their SPEC copy live in other
  repositories and are not changed here; the vectors for them are in
  `contract/vectors/key-bound-v1.json`.
