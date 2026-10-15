# The evidence bundle

15 October 2026.

## In plain words

On a plant's page there is now **Download evidence bundle**: a link right under the
record's date, and a button under **Technical details** (next to Export record, Download
inclusion proof and Download Bitcoin stamp file). It saves one `.zip` with everything
someone needs to check the record's date **without VeilCore**: no site, no registry, no
account. Inside is `verify.html`, a page that does the checks on your own computer with
the internet off, and a `README.txt` that says what each file is, what it shows, and what
it doesn't.

Before this, the pieces existed separately (the record export, the inclusion proof, the
Bitcoin stamp file, the transaction ids, the spec), and nothing a non-technical person
could open offline put them together.

## What's in it

One folder, `VEIL-…-evidence/`:

| File | What it is |
|---|---|
| `README.txt` | Plain English: what each file is, how to check it, what it proves and what it does not. |
| `verify.html` | The offline check page. Everything it needs is inside it. |
| `EXAMINER-SUMMARY.html` | A printable summary for a lawyer, examiner or clerk: the record as sealed, fingerprint, batch, transaction and network, how and when it was checked, lab signatures and sample receipts (with the sample details each side wrote, when the holder's deliveries could be read), the Bitcoin stamp, and what it shows and doesn't. Text only: no script, nothing loaded, every value escaped (`evidence/examiner.ts`). Prints to PDF from the browser (two or three sheets for a record with a lab report and a receipt). |
| `DECLARATION-TEMPLATE.txt` | Fill-in-the-blanks sample text for a declaration by the record holder and, optionally, a technical witness, with the bundle's facts filled in and Schedule A listing every other file's SHA-256 (`evidence/declaration.ts`). "Sample text. Not legal advice." at the top and bottom. How to use both, and the sources behind the template: [`evidence-in-practice.md`](evidence-in-practice.md). |
| `evidence.json` | Everything below in one machine-readable file. `verify.html` carries a copy. |
| `record/sealed-fields.json` | The record exactly as it was fingerprinted. |
| `record/sealed-fields.canonical.json` | The exact bytes that were hashed (spec 4.4). |
| `record/fingerprint.txt` | The record's fingerprint. |
| `proof/inclusion-proof.json` | The path from the fingerprint to the batch root (spec 5.4). |
| `proof/batch-root.txt`, `proof/root.bin` | The batch root, as text and as the 32 bytes the Bitcoin stamp covers. |
| `proof/anchors.json` | Where the batch root was recorded (network, contract, transaction, block), and any earlier anchor the batch had, as the registry reported them. |
| `proof/root.bin.ots` | The batch's Bitcoin stamp file (OpenTimestamps), when the batch has one. |
| `lab/lab-report-pairing.json` | When a lab report is saved to the plant: the pairing fingerprint and the file's SHA-256. |
| `lab/report/<file>` | The lab report file itself, **only if the holder ticks "Include the lab report file"** and picks it. The site checks it is the saved file first. |
| `lab/signatures.json` | Lab signatures (receipts, lab reports) about this record's fingerprint. |
| `key/key-binding.json` | The record's key and its salt, **only if the holder ticks "Include the record's key"**. With them, anyone can tie the record to everything its key does on the network, so it is off by default and the dialog says so. Only offered for records sealed since 14 October 2026 (they name their key). |
| `spec/SPEC-sections.md` | The spec sections the checks follow (3.6.1, 3.7, 4.4, 5, 7, 9), with the spec's version line and the SDK commit they come from. |

Nothing from the holder's private notes on a record (delivery notes, lab references) goes
in: only the sealed fields.

## How to check it with no VeilCore at all

1. **Open `verify.html`** (double-click; Chrome or Firefox). It needs no internet: its
   Content-Security-Policy forbids every request, and it uses only the browser's own
   SHA-256 and Ed25519. It shows:
   - **Fingerprint matches**: it worked the fingerprint out again from the sealed fields,
     in the old form (SHA-256 of the canonical fields) or the key-bound form (spec 3.6.1,
     `H("veilcore:v1:keyrecord", keyBinding, contentHash)`), and it equals the record's.
   - **Proof leads to the batch root**: the proof is for that fingerprint and its path
     folds to the batch root in the bundle (spec 5.2 to 5.4, depth at most 64).
   - The record's key, when included: it is the one the record names.
   - The lab report pairing: the saved file's SHA-256 leads to the pairing fingerprint
     (spec 3.7).
   - Each lab signature: checked with the signer's key, whether it is about this record,
     and whether the same key withdrew it. A receipt's signed SHA-256 is the fingerprint of
     the lab's own record of the delivery, not a hash of the sample.
   - Each delivery of the plant, when the bundle has them (`custody` in `evidence.json`):
     the sample details the breeder and the lab wrote, and whether the lab's receipt covers
     them. The page works the digest out again, SHA-256 of the canonical JSON of
     `{ format: "veilcore/sample-custody/v1", transferId, sample, arrival }`, and compares it
     with the `_sc1_<digest>` end of the receipt's signed id. "Covered" only when they match
     and that receipt's signature checks and isn't withdrawn; "changed" when the id carries
     the digest of other values (the lab changed them after signing). What the lab wrote is
     labelled "not covered" otherwise. A lab code nobody used is said too.
   Under "Check other files" you can choose the bundle's own files (or someone's copy of
   them) to check those instead of the copy inside the page, plus the lab report file and
   `root.bin`.
2. **Date it.** Only if step 1 passed: if the fingerprint, the proof or an included key fails,
   the page says "Don't use this to date the record" and names the failed check instead of
   showing these steps. Otherwise the page says exactly what to look up: on a Midnight explorer for the
   named network, find the transaction, check it calls the named contract, and find the
   batch root in it. If it is there, the record existed, unchanged, by that transaction's
   time: whoever had it sealed held the record by then.
3. **Bitcoin**, when there is a stamp file: the page reads the stamp file itself (it must start
   from SHA-256 of `root.bin`) and names the Bitcoin block and merkle root it points to. It can't
   reach Bitcoin, so to finish: drop `root.bin.ots` and `root.bin` on
   opentimestamps.org, or run `ots verify root.bin.ots` in the `proof` folder with the
   official OpenTimestamps client (`ots upgrade` first if it was still pending).

Anyone who would rather not trust `verify.html` can read it (one file, plain JavaScript)
or redo the checks from `evidence.json` and the spec sections with any SHA-256 tool.

## How it is built

- The site makes the bundle in the browser (`bboard-ui/src/veilcore/evidence/bundle.ts`,
  `bboard-ui/src/components/EvidenceBundle.tsx`), zipped with fflate 0.8.2.
- It asks the registry once: `GET /records/:id/evidence` (holder key, like `/api/export`;
  at most 20 a minute per holder key). That returns the stored record, the registry's
  first-seen date, the inclusion proof with its anchors, the batch with every anchor it has
  had, the batch's `.ots` file, and the lab signatures about the record. A registry
  without that route is read through the public `/proof`, `/attestations/subject` and
  `/batches/:id/root.bin.ots` routes instead (then earlier anchors aren't known, and the
  README says so).
- Nothing from the registry is taken on trust: the proof must be about this record's
  fingerprint and fold to its root, the batch must be the proof's, the `.ots` must be an
  OpenTimestamps file. A record whose stored fields don't recompute to its fingerprint gets
  no bundle.
- `verify.html` is made from `bboard-ui/evidence-page/verify.template.html` and
  `verify-core.js`, plus the SDK's own `dist/canonical.js` (veilcore-records, copied in
  unchanged but for its one `export` keyword), so it canonicalises with the same code the
  site and registry use. The tests run its checks against the site's own for 24 practice
  records, old and key-bound, and for tampered records, wrong proofs and wrong roots
  (`verify-page.test.ts`), and open it from `file://` in a browser with the network off
  (`e2e/evidence-bundle.spec.ts`).

To run the browser test against a real registry, start one with an operator token and an
anchor network and contract (for example `DB_PATH=/tmp/e2e.db LAB_RESULTS_DIR=/tmp/e2e-lab
VEILCORE_OTS=off VEILCORE_OPERATOR_TOKEN=<32+ characters> VEILCORE_ANCHOR_NETWORK=preprod
VEILCORE_ANCHOR_CONTRACT=7a…7a PORT=8890 node server.js`), build the site for it, and run
with `E2E_API_BASE`, `E2E_OPERATOR_TOKEN` and `E2E_ANCHOR_CONTRACT` set. The test saves two
practice records, signs a practice lab report, seals and anchors a batch, then downloads.

## The limits

- **The files agreeing is not a date.** Until someone finds the batch root in the named
  transaction (or the Bitcoin stamp checks), nothing in the bundle dates the record. The
  transaction is the one VeilCore's registry operator reported; the bundle doesn't check
  the chain, and `verify.html` makes no requests at all, so it can't either. How an
  explorer shows the root inside a transaction varies by explorer.
- **A test network date carries no weight.** A record dated on preprod or Preview is
  practice data; the README and the page say so.
- **It doesn't show** that what the record says is true (name, breeder, stated date),
  who holds the plant or the record now, or that a key belongs to the lab it names.
  VeilCore doesn't vouch for anyone.
- **A lab report saved after sealing isn't dated by the batch**: it isn't inside the
  record's fingerprint. The bundle carries the pairing facts and the signatures, not a date
  for the pairing.
- **The registry's first-seen date and the device's sealing time** are each that party's
  word only, and labelled so.
- **A record sealed before nonces were kept** can't be recomputed, so it gets no bundle.
- **Lab report file**: the site doesn't keep lab report files, so the holder picks the
  file to include; it goes in only if its SHA-256 is the saved one's.
- **Firefox**: `verify.html` uses only standard WebCrypto (SHA-256, Ed25519). The browser
  tests ran it in Chromium; Playwright's Firefox could not be installed on the test
  machine, so a Firefox run is still to do. A browser without Ed25519 shows "Signature not
  checked here" for lab signatures; every other check still runs.
- **The bundle is a snapshot.** A batch anchored, a stamp upgraded to Bitcoin, or a lab
  signature withdrawn after it was made is not in it: download a new one.
