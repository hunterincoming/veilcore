# If VeilCore disappears (23 Oct 2026, updated 26 Nov 2026)

A standard people can rely on has to keep working if the company behind it stops: shut down,
bought, or just offline for a week. This page says, piece by piece, what a holder can still
do then, what they need in hand, and what isn't there yet. It is kept honest on purpose: the
gaps are listed, not hidden.

## The short version

With **their backup file** and nothing from us, a holder can still show any of their records,
recompute its proof code, show it sits in a batch, and point at the Midnight transaction
that dates that batch. From 26 Nov the file also holds the batch's Bitcoin stamp file and its
RFC 3161 tokens, and each record's own RFC 3161 tokens, so the two dates that don't depend on
Midnight survive too. A buyer, examiner or court can check all of it with free, open tools.

What a holder can't do without us yet: make *new* records the way the website does, or carry
on a license deal (the messages already exchanged are in the backup file; the channel they
travel over is on our registry).

The code for every part is now public: the website and the fee service in this repository,
and from 14 November the registry (`veilcore-api`). That closes the gap in code, not the gap
in practice: nobody but us runs a registry or a fee service, so if ours stop, there is nowhere
to save or date a new record until someone sets both up.

The files that check each batch's dates (its root, Bitcoin proof and RFC 3161 token) were
only on our registry. Now each holder's backup file carries the ones for their own records
(`stamps`, from 26 Nov), and anyone can keep a copy of all of them and check it with no
VeilCore server ([run a witness](https://github.com/hunterincoming/veilcore-api/blob/main/docs/run-a-witness.md)).
Nobody outside VeilCore runs a witness yet.

## Piece by piece

| What | Where it lives | Without VeilCore |
|---|---|---|
| The record (name, breeder, notes, salts) | Sealed on our registry; **and, from 23 Oct, in the backup file** (`recordData`) | ✅ In the file. Restoring it puts the records back, each checked against its proof code |
| The keys (record keys, vault key, holder key) | The browser and the backup file | ✅ In the file |
| The inclusion proof (record → batch root) | Our registry; **and, from 23 Oct, in the backup file** (`proofs`), once the batch is sealed | ✅ In the file, for every record batched before the file was saved. A record saved after its last backup has to wait for the next one |
| The batch root's date | On Midnight mainnet (public), in the anchor transaction. Every batch is also stamped on Bitcoin (OpenTimestamps) and, from 6 Nov, by an RFC 3161 time-stamping authority | ✅ Public. Any Midnight indexer can return it (`proof/check-on-midnight.mjs` asks one). We haven't confirmed that any explorer shows it: it sits inside the contract's state |
| The batch roots and the files that check their dates (root, Bitcoin `.ots`, RFC 3161 token), and each record's own RFC 3161 tokens | Our registry; any copy made with `scripts/mirror` in [veilcore-api](https://github.com/hunterincoming/veilcore-api); **and, from 26 Nov, in the backup file** (`stamps`), for the holder's own records | ✅ For the holder's own records: in the file for every batch sealed before it was saved, as the registry served them then. A Bitcoin stamp still pending (only a calendar's promise) is kept, and the next backup takes the finished one once the registry has it. On restore each file goes back only once it checks against its batch root or proof code, and an evidence bundle made with the registry gone still carries `root.bin.ots` and `root.tst`. What came only from a backup file is kept as one sealed section per file, carried into every later backup, and labelled on every page of a bundle as not confirmed (below). A record saved after its last backup has to wait for the next one. ⚠️ For everyone's batches: anyone can copy every batch and check it with Node alone. The copy is append-only and fetched again on every run: if our registry ever serves a changed root, anchor, token or proof, it keeps both and raises the alarm. Our own scheduled copy (a public repository GitHub updates) is ready but not switched on. A copy we run only shows what we served and when; it is independent only when someone else runs it, and nobody outside VeilCore does yet |
| Dates for lab signatures, withdrawals, key enrolments and RFC 3161 tokens (the evidence re-stamp) | **Built, not live** (25 Nov 2026): our registry would put one fingerprint of all of them on Bitcoin once a year, and publish the list (`/restamps`). Not switched on yet, so none exists | ⚠️ Once one exists: anyone with the item, its proof and the re-stamp's `manifest.json` and `.ots` checks it offline (`node scripts/restamp-check.mjs ... --root-bin root.bin` in veilcore-api, then `ots verify`). How, step by step: [restamp.md](restamp.md). The mirror doesn't copy re-stamps yet, so keep those files with the evidence |
| Checking a record | `npx veilcore-records verify` (open source, on npm), the evidence bundle's `verify.html`, the SDK evidence package's `verify.py`, the Python and Rust implementations | ✅ No server, no account. Three implementations, all written by us so far. A test opens `verify.html` and runs `verify.py` with every VeilCore address cut off, on every change ([offline.md](offline.md), "If VeilCore is gone") |
| The format itself | SPEC.md in veilcore-sdk, Apache-2.0 | ✅ Anyone can implement it from the text and the published conformance vectors. The numbers count different sets: 121 is the core set of SPEC section 10 (100 record-format, 1 report-pairing, 20 for records that name their own key), the one all three implementations pass; 181 adds the animal (30) and strain (30) profiles; `conformance/` in veilcore-sdk now also has vectors for documents, profile forms, lab results and choosing among several contracts, so the full published set is larger than either |
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
- `heldEvidence` (from 26 Nov): each record's lab signature, the Midnight call that published
  it, and the claims made on its numbers. Before, these came back only from our registry. On
  restore, each goes back only onto its own record, and only if it checks against it. Found by
  the restore drill ([runbooks/backup-restore-drill.md](runbooks/backup-restore-drill.md)),
  which also lists what the file still doesn't bring back.
- `stamps` (from 26 Nov): for each batch the holder's records sit in, its root, its Bitcoin
  stamp file (OpenTimestamps `.ots`) and its RFC 3161 tokens; for each record, the RFC 3161
  tokens on its own proof code. Before, these were only on our registry, so a holder with a
  perfect file and no registry kept only the Midnight date.
- **Your backup file on your own device is never changed by restoring; keep it — it's the
  lasting copy.** Everything below is about what a browser keeps, not about the file.
- **Two parts, never mixed.** The browser keeps what *our registry* answered (each record's
  proof, its batch's files and its own tokens, each checked against the record or the root).
  Only that counts as VeilCore's answer, and only that goes in the file's `proofs` and in
  `stamps.batches`/`stamps.records`. Proof codes are public, so anyone can make a file that puts
  your records under a batch root of their own: so what a restored backup file brings never
  goes there.
- **One sealed section per restored file.** Each restored file's date proofs (its own, and
  every section it carried from earlier files) are kept together as ONE section, exactly as
  they passed the checks below, each proof rebuilt from its known fields only, in a fixed order,
  and named by the SHA-256 of their canonical bytes: the same evidence in another order is
  recognised as already kept. One file takes one place, however many sections it carries.
  Sections are never merged, edited, upgraded or evicted: a later file can't change or remove an
  earlier one. Every later backup file carries every section as it is (`stamps.carried`). At
  most 8 sections and 512 KB (compressed) are kept. Past that, a new file's section is refused,
  nothing already kept changes, and the restore page says so and offers **Clear copies from
  backup files** (also in the evidence bundle dialog under Technical details): it removes only
  these copies, never what our registry gave, after asking, and your backup files are
  unchanged, so you can restore the right one again. A single file whose date proofs alone are
  bigger than the limit is refused with its own message.
- **What is checked about a section.** Only its form, so junk stays out: each proof must lead
  from one of your records to the root it names (one batch per record per section), a Bitcoin
  file must start from SHA-256 of that root, a token must verify against what it stamps and be
  signed by a timestamp authority the site pins, within that certificate's dates, and each file
  or token is at most 16 KB, four tokens per item.
- **When it is used.** Only for an evidence bundle when our registry can't be reached and it has
  no answer of its own for the record. One case counts as the registry's: a section's proof that
  leads to a root our registry gave the same batch (for another of your records). Then only the
  path is taken from the file; the transaction, block, times and the rest come from the
  registry's own proof for that batch. The bundle then carries *every* section that covers the
  record, each in its own folder (`proof/backup-file-*`) with all its files (the proof, the
  root, the Bitcoin file, the tokens, the Midnight check), none ranked first. Every page says
  so: README.txt, EXAMINER-SUMMARY.html, evidence.json and verify.html (which reads
  `registry.source` and lists the sections side by side) say the batch data was "restored from a
  backup file, not yet confirmed with VeilCore's registry or Midnight", and that the holder's
  backup file, not our registry, names the transaction. If the sections give more than one root,
  every page says your backup files disagree and to look each up on Midnight, and the restore
  page tells you. Midnight settles it: only one root is written there.
- **If our registry ever gives another root for a sealed batch** (an honest registry never
  does), the browser keeps the first root and its stamps (a finished Bitcoin stamp is never
  deleted), carries the new answer as a section without trusting it, and the backup page warns
  you.
- What the browser keeps goes only when its record is deleted on that browser (a section, once
  none of the records it covers is held there).
- `npx veilcore-records backup` doesn't read `stamps` yet (a change for veilcore-sdk); the files
  inside are the same `.ots` and `.tst` files the registry serves, base64, for `ots verify` and
  `openssl ts -verify`.

**Opening a backup without the website:** `npx veilcore-records backup <file>` (veilcore-sdk,
on npm from version 0.17.1, with provenance) checks every record in the file, opens password-locked files, and names
the transaction that dates each batch. It was checked against a real backup made by the app,
and the published package was checked again after release.
Version 0.18.1 reports a document with sealed numbers (a certificate) as not matching: its
fingerprint leaves out the field-set step (SPEC 4.5). The record is fine, and the evidence
bundle's `verify.html` checks it; the fix belongs in veilcore-sdk.

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
