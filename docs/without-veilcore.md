# If VeilCore disappears (23 Oct 2026)

A standard people can rely on has to keep working if the company behind it stops: shut down,
bought, or just offline for a week. This page says, piece by piece, what a holder can still
do then, what they need in hand, and what isn't there yet. It is kept honest on purpose: the
gaps are listed, not hidden.

## The short version

With **their backup file** and nothing from us, a holder can still show any of their records,
recompute its proof code, show it sits in a batch, and point at the Midnight transaction
that dates that batch. A buyer, examiner or court can check all of it with free, open tools.

What a holder can't do without us yet: make *new* records the way the website does, or read
the private messages of a license deal.

## Piece by piece

| What | Where it lives | Without VeilCore |
|---|---|---|
| The record (name, breeder, notes, salts) | Sealed on our registry; **and, from 23 Oct, in the backup file** (`recordData`) | ✅ In the file. Restoring it puts the records back, each checked against its proof code |
| The keys (record keys, vault key, holder key) | The browser and the backup file | ✅ In the file |
| The inclusion proof (record → batch root) | Our registry; **and, from 23 Oct, in the backup file** (`proofs`), once the batch is sealed | ✅ In the file, for every record batched before the file was saved. A record saved after its last backup has to wait for the next one |
| The batch root's date | On Midnight mainnet (public), in the anchor transaction. The first batch is also stamped on Bitcoin | ✅ Public. Any Midnight indexer or explorer shows it |
| Checking a record | `npx veilcore-records verify` (open source, on npm), the evidence bundle's `verify.html` and `verify.py`, the Python and Rust implementations | ✅ No server, no account. Three implementations, all written by us so far |
| The format itself | SPEC.md in veilcore-sdk, Apache-2.0 | ✅ Anyone can implement it from the text and the 151 vectors |
| The website | This repository, Apache-2.0; every release has a manifest and can be rebuilt | ⚠️ Anyone can host it, but it needs a registry and a fee service to save and date records |
| The registry (stores sealed records, batches them, relays lab codes and deal messages) | Our server. Its code (`veilcore-api`) **is not public yet** | ❌ The biggest gap. Without its code, someone else can't run a compatible one |
| The fee service (pays the network fee so nobody needs a wallet) | Our server (`sponsor/`, in this repository) | ⚠️ The code is here; someone has to run it and fund it |
| License state (issued, active, revoked) | The main contract on Midnight | ✅ Public chain state; the verifier rules are in `docs/design.md` |
| License terms and royalty messages | Encrypted on our registry. The licensee's agreed copy is also on their device and in their backup file | ⚠️ The licensee keeps the terms they agreed to. The licensor's copy, the statements and the payment messages are on our registry only; "Download the signed record of this deal" saves them, but nothing does it automatically yet |

## What changed on 23 October

The backup file used to hold only keys. The records themselves lived only on our registry, so
if the registry went, a holder kept a key and a dated 32-byte code with nothing to show what
the code stands for. Now the file also carries:

- `recordData`: every record the browser holds open, with every field the holder wrote. On
  restore, each one is recomputed and put back only if it matches its proof code. A file with
  a record that doesn't match still restores the keys, and says what went wrong.
- `proofs`: the inclusion proof of each record whose batch is sealed, fetched when the file is
  made. Proofs are public data; the holder just keeps their own copy.

A passkey copy doesn't carry them: it lives on our registry, so it's no help if the registry
is gone, and leaving them out keeps it small. The backup file is the thing to keep.

## Still to do, in order

1. **Publish the registry's code.** Before that: check its history for anything secret, and
   rotate whatever was ever in it. Hunter's call on timing.
2. **Open a backup without the website.** A `veilcore backup <file>` command in veilcore-records:
   unlock the file (password files included), recompute every record, fold every proof, and
   say which Midnight transaction to look up. Then a holder needs no VeilCore page at all.
3. **The strain profile in veilcore-records**, so the command above and `verify` handle strain
   records like plant and animal ones.
4. **Deal messages in the backup**, so the royalty history is kept too, not only by a download.
5. **An implementation by someone else.** Everything an implementer needs is published; the
   vectors and the runner (`conformance/run-cli.mjs`) test any program that reads a JSON job
   on standard input and writes its answer on standard output. What's missing is a person outside VeilCore doing it.
6. **A home for the spec that isn't us.** See [spec-handover.md](spec-handover.md).
