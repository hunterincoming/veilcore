# Claims on the website: the plan (29 Oct 2026)

**Goal.** A holder proves one fact about a record from veilcore.org, without showing the rest:
a value, that a number is at least or at most a bound, that two of their records differ in
enough marker values, that a correction changed only some values, or that a laboratory signed
the record. The claims contract that checks these is already on mainnet (`ef763eb4…070d`, no
maintenance authority). Design and limits: `docs/claims-design.md`, SPEC 4.5.

**Why it isn't on the site yet.** The claims contract proves facts about records sealed with a
field set (SPEC 4.5, `sha256/fields/v1`). The site seals every record as canonical JSON with a
key binding (SPEC 3.6.1). Nothing the site has sealed can be claimed about. So the work starts
with sealing, not with a screen.

## The pieces, in order

| # | Piece | Where | Size | Needs Hunter |
|---|---|---|---|---|
| 0 | **Proving spike**: prove each claims circuit (k 13 to 17) with the browser's WebAssembly prover, measure time and memory on a laptop and a phone | site | 1 day | allow `srs.midnight.network` for this session, or run a script on the Mac |
| 1 | **Key-bound field sets**: a record that names its key (3.6.1) and carries a field set (4.5). `contentHash` is the 4.5 commitment; the fingerprint is `H(keyrecord, keyBinding, commitment)`. A verifier maps a claim's commitment to the anchored fingerprint with the record's public `keyBinding`. SPEC text, vectors, TypeScript, Python, registry | SDK, site, registry | 3 to 4 days | merge, registry deploy |
| 2 | **Two published schemas**: `marker panel` (up to 16 SSR loci as allele pairs, comparable, the threshold k fixed) for distinctness; `lab values` (THC, CBD, germination as numbers with a scale, a viroid result as a code) for value and range claims | SDK, site | 2 days | the threshold k and which lab values: a decision |
| 3 | **Sealing values on the site**: "Add marker values" / "Add lab values" when logging, sealed with the record; the field secret kept with the record's keys and backup | site | 3 to 4 days | |
| 4 | **Proving files hosted**: the claims circuits' keys and circuits, and the parameters for k 15 to 17, pinned like k 13 and 14 | site | 1 day | |
| 5 | **The sponsor pays for claims**: the claims contract's address and a daily allowance per circuit | sponsor | 1 day | sponsor deploy |
| 6 | **The claims screen**: pick a record, a value and a claim; see what earlier claims on that value already gave away (SPEC 4.5 "disclosure accounting"); prove; share a link | site | 4 to 5 days | |
| 7 | **The check page shows claims**: read each claim per call from the indexer, recompute the schema id from the published schema, map the commitment to the record | site | 3 days | |
| 8 | **Laboratory-signed claims**: a laboratory signs a record with a Jubjub key (the claims contract's Schnorr check); labs on the site sign with other keys today | site, registry | 1 week | later |

About three to four weeks for 0 to 7. 8 comes after there is a laboratory asking for it.

## The risk that decides the shape

Memory for a proof roughly doubles with each step of k. `proveDistinct` and `proveUnchanged` are
k=17; on Hunter's 16 GB Mac through the proof server they took 8.6 s and 6.7 s and the server
peaked at 3.7 GB. The site proves in the browser instead (no proof server, nothing leaves the
device), where WebAssembly has at most 4 GB and phones have far less. The site's own circuits
are k=13 and 14. **Piece 0 answers whether k=16 and k=17 prove in a browser at all**, before
anything else is built on it. If a phone can't: value and range (k 15 and 16) may still work
there, and distinct and unchanged are offered on a computer only, said so on the screen.

## What it is not

- Not a verdict. "Differs in at least k values" is a count; whether that makes a variety
  distinct is the examining body's call.
- Not a way for two parties who won't show each other their markers to compare them.
- A value sealed by the holder proves the holder sealed it, not that it is true. That is what a
  laboratory's signature (piece 8) adds.
