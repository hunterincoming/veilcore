# If VeilCore disappears (23 Oct 2026, updated 18 Nov 2026)

A standard people can rely on has to keep working if the company behind it stops: shut down,
bought, or just offline for a week. This page says, piece by piece, what a holder can still
do then, what they need in hand, and what isn't there yet. It is kept honest on purpose: the
gaps are listed, not hidden.

## The short version

With **their backup file** and nothing from us, a holder can still show any of their records,
recompute its proof code, show it sits in a batch, and point at the Midnight transaction
that dates that batch. A buyer, examiner or court can check all of it with free, open tools.

What a holder can't do without us yet: make *new* records the way the website does, or carry
on a license deal (the messages already exchanged are in the backup file; the channel they
travel over is on our registry).

The code for every part is now public: the website and the fee service in this repository,
and from 14 November the registry (`veilcore-api`). That closes the gap in code, not the gap
in practice: nobody but us runs a registry or a fee service, so if ours stop, there is nowhere
to save or date a new record until someone sets both up.

The files that check each batch's dates (its root, Bitcoin proof and RFC 3161 token) were
only on our registry. Now anyone can keep their own copy and check it with no
VeilCore server ([run a witness](https://github.com/hunterincoming/veilcore-api/blob/main/docs/run-a-witness.md)).
Nobody outside VeilCore does yet.

## Piece by piece

| What | Where it lives | Without VeilCore |
|---|---|---|
| The record (name, breeder, notes, salts) | Sealed on our registry; **and, from 23 Oct, in the backup file** (`recordData`) | ✅ In the file. Restoring it puts the records back, each checked against its proof code |
| The keys (record keys, vault key, holder key) | The browser and the backup file | ✅ In the file |
| The inclusion proof (record → batch root) | Our registry; **and, from 23 Oct, in the backup file** (`proofs`), once the batch is sealed | ✅ In the file, for every record batched before the file was saved. A record saved after its last backup has to wait for the next one |
| The batch root's date | On Midnight mainnet (public), in the anchor transaction. Every batch is also stamped on Bitcoin (OpenTimestamps) and, from 6 Nov, by an RFC 3161 time-stamping authority | ✅ Public. Any Midnight indexer or explorer shows it |
| The batch roots and the files that check their dates (root, Bitcoin `.ots`, RFC 3161 token) | Our registry; and any copy made with `scripts/mirror` in [veilcore-api](https://github.com/hunterincoming/veilcore-api) | ⚠️ Anyone can copy every batch and check it with Node alone. The copy is append-only and fetched again on every run: if our registry ever serves a changed root, anchor, token or proof, it keeps both and raises the alarm. Our own scheduled copy (a public repository GitHub updates) is ready but not switched on. A copy we run only shows what we served and when; it is independent only when someone else runs it, and nobody outside VeilCore does yet |
| Checking a record | `npx veilcore-records verify` (open source, on npm), the evidence bundle's `verify.html` and `verify.py`, the Python and Rust implementations | ✅ No server, no account. Three implementations, all written by us so far |
| The format itself | SPEC.md in veilcore-sdk, Apache-2.0 | ✅ Anyone can implement it from the text and the 181 vectors |
| The website | This repository, Apache-2.0; every release has a manifest and can be rebuilt | ⚠️ Anyone can host it, but it needs a registry and a fee service to save and date records ([SELF-HOSTING.md](SELF-HOSTING.md)); its check links and QR codes then point at its own address |
| The registry (stores sealed records, batches them, relays lab codes and deal messages) | Our server. Its code is public **from 14 Nov 2026**: [hunterincoming/veilcore-api](https://github.com/hunterincoming/veilcore-api), Apache-2.0 | ⚠️ Anyone can run a compatible one from the code and its README, and nobody else does yet. Someone has to host it, keep its database and backups, and pair it with a fee service to date its batches. A new one starts empty: nothing on ours moves to it, so the backup file is still what a holder relies on. Only we have ever run it, so setting one up without our help is untested |
| The fee service (pays the network fee so nobody needs a wallet) | Our server (`sponsor/`, in this repository) | ⚠️ The code is here; someone has to run it and fund it |
| License state (issued, active, revoked) | The main contract on Midnight | ✅ Public chain state; the verifier rules are in `docs/design.md` |
| License terms and royalty messages | Encrypted on our registry; **and, from 23 Oct, in the backup file** (`dealRecords`) | ✅ Each side's backup keeps every message of its deals as signed (terms, statements, replies, payments, confirmations), checkable by anyone with `npx veilcore-records deal <file>` (veilcore-records 0.18.0 on npm). Kept for the holder, not restored: a deal's channel itself stays on the registry |

## What changed on 23 October

The backup file used to hold only keys. The records themselves lived only on our registry, so
if the registry went, a holder kept a key and a dated 32-byte code with nothing to show what
the code stands for. Now the file also carries:

- `recordData`: every record the browser holds open, with every field the holder wrote. On
  restore, each one is recomputed and put back only if it matches its proof code. A file with
  a record that doesn't match still restores the keys, and says what went wrong.
- `proofs`: the inclusion proof of each record whose batch is sealed, fetched when the file is
  made. Proofs are public data; the holder just keeps their own copy.
- `sealedFields`: each record's sealed fields, exactly what its proof code is computed over.
  With these, any implementation of the format checks the file without knowing anything
  about this app.

**Opening a backup without the website:** `npx veilcore-records backup <file>` (veilcore-sdk,
on npm from version 0.17.1, with provenance) checks every record in the file, opens password-locked files, and names
the transaction that dates each batch. It was checked against a real backup made by the app,
and the published package was checked again after release.

A passkey copy doesn't carry them: it lives on our registry, so it's no help if the registry
is gone, and leaving them out keeps it small. The backup file is the thing to keep.

## Still to do, in order

1. ~~Publish the registry's code~~: done 14 Nov
   ([hunterincoming/veilcore-api](https://github.com/hunterincoming/veilcore-api), Apache-2.0).
   Still open under it: **a registry and fee service run by someone else.** The code and its
   README are public, and [SELF-HOSTING.md](SELF-HOSTING.md) (22 Nov) is the write-up of running
   the registry, fee service, relay and site from a fresh start. What's missing is a second
   operator: nobody outside VeilCore has followed it yet.
2. ~~Publish the backup command to npm~~: done 23 Oct (veilcore-records 0.17.1, built and
   signed by CI, approved by a person with 2FA before it went live).
3. ~~The strain profile in veilcore-records~~: done 23 Oct (SPEC 11.9 and 30 vectors in
   veilcore-sdk; TypeScript and Python check the profile, Rust computes the fingerprints).
4. ~~Deal messages in the backup~~: done 23 Oct (`dealRecords`).
5. **An implementation by someone else.** Everything an implementer needs is published; the
   vectors and the runner (`conformance/run-cli.mjs`) test any program that reads a JSON job
   on standard input and writes its answer on standard output. What's missing is a person outside VeilCore doing it.
6. **A home for the spec that isn't us.** See [spec-handover.md](spec-handover.md).
7. **A witness outside VeilCore.** The mirror and its checker are public (veilcore-api
   `scripts/mirror`, with a one-page
   [how to run your own witness](https://github.com/hunterincoming/veilcore-api/blob/main/docs/run-a-witness.md)).
   Still open: switching on our own scheduled copy (a public repository, archived weekly by
   Software Heritage; a Zenodo deposit later), and a university or lab running the checker.
   The second is the one that makes the copy independent.
