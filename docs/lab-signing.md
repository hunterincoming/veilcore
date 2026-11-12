# Numbers a laboratory signs

Status: built, on the test network only (`LAB_SIGNING_ENABLED` in `bboard-ui/src/config/network.ts`).
Not on veilcore.org until the whole journey has run once on the test site by hand, and then
once on mainnet.

## What it is for

A breeder wants to show a fact about a lab result, like "this variety is at most 95 % similar to
variety X" or "this calf's sire has 0 conflicts", without handing over the genotype or the other
numbers, and with the lab's name behind the number rather than the breeder's typing.

The problem is documented: the US seed trade (ASTA) says genetic data can reveal confidential
business information and proposes stating whether a threshold is met instead; UPOV's seed industry
paper (BMT/20/5) says breeders fear molecular data leaking; offices still need a trusted party to
vouch for the statement. What makes a lab's signature count in the end is a body saying which lab
keys are real (as ISTA does for seed certificates and ICAR for parentage labs). Until one does,
VeilCore says exactly what it can check and nothing more.

## How it works

1. **One lab identity.** A lab already has an attester key on VeilCore (`attester-keys.ts`),
   registered with its name and its own accreditation claim, and, when VeilCore's operator has done
   one, a dated name check against a public licence or accreditation listing
   (`docs/lab-name-checks.md`). The key the claims contract checks (Jubjub, `proveAttested`) is
   derived from it (`claims-key.ts`), so there is no second key or backup.
2. **The lab writes the record.** When it sends a report back through the lab results flow, the lab
   can add numbers from it under a published form. Its browser builds a document record whose every
   sealed field it wrote: its result name, its registered name, the breeder's name from the plant
   record, the date, the report file's SHA-256, the plant by name, and the numbers with a fresh
   field secret. It signs the record's commitment with its claims key.
3. **It binds the key, per record, to its report.** It signs the report as always, then publishes an
   ordinary attestation from its attester key (type `other`, id ending `_ck1_` + an owner proof):
   about the numbers record, naming the claims key, the plant's proof code and that report
   signature's id. The owner proof is the claims key's own signature naming the attester, so no
   other registered lab can post a binding to a key it doesn't hold. A checker names the lab only
   while that report signature stands: withdrawing the report, from any device, withdraws the name.
   Only fields the commitment covers ever reach the breeder's record.
4. **Locked into the report.** The record and signature travel inside the report, locked to the
   breeder (a third padding trailer, `lab-results.ts`); the report's bytes and its own signature
   are unchanged. Withdrawing or correcting the report withdraws the binding too.
5. **The breeder adds it.** Opening the report shows the numbers, checked (form, plain numbers,
   root, signature, this plant, this report file), and one press adds them as a record. Its page
   names the lab through the binding and publishes the signature on Midnight.
6. **Claims.** "Prove one number" works as on any document. Each claim link also names the
   `proveAttested` transaction, the key and the plant's proof code. The check page reads both
   calls on Midnight, finds the binding, checks it in the browser, and prints the lab with the
   same wording every page uses for signers ("a key named … (name not checked)", or the operator's
   dated match). A withdrawn binding, two labs claiming one key, or none: the numbers read as the
   holder's own.

## Version 2: a result bound to its sample (7 November 2026)

Status: built, on the test network only (the same `LAB_SIGNING_ENABLED` switch). Specified in the
SDK's SPEC 11.12 (draft), with 133 vectors computed there from the text alone; this app checks
them (`lab-result.test.ts`).

Version 1 names the plant only by a name the lab typed; the link to the record lived in the
registry binding, outside what the lab signed. Version 2 keeps the same record, signature and
claims contract, and adds a **result statement** inside what is signed: the tested record's
proof code, the sample ID, the lab's accession number, the method and its version, the panel and
its version, QC figures, the dates tested and received, the call, and optionally an earlier result
of the lab's it replaces (re-test, correction or retraction). The statement's canonical bytes are
a `lab-result.json` entry in the record's `files`, so the signature covers it; its call is in the
field set too (`/schemas/pathogen-v1.json`, `genetic-match`, `lineage-check`, `dna-mark`,
`lab-retraction`), so a holder can prove "not detected" or "consistent" on Midnight without
showing the rest. Code: `veilcore/lab-result.ts`.

- **Kinds:** numbers under a form; a pathogen or viroid test (HLVd first: target, method, detected
  or not, optional target Ct, sample type, run and QC details such as the Ct cut-off, limit of
  detection, controls and run ID); a genotype comparison "a sample sent under record A gave the same
  calls as a sample sent under record B, at the markers compared, by method M"; a parentage check
  "the sample is consistent with the parents named"; a DNA mark; a withdrawal. Records are named by
  proof code only: no genotype is in the result or anywhere else. The record named is the one the
  sender gave for the sample: the lab didn't see where the sample was taken.
  A pooled sample (several plantlets in one test, routine for TC labs) names the one record the
  sender gave for the pool.
- **What a claim on Midnight shows:** only the call and counts ("not detected", "same genotype").
  What was tested for, or compared, is in the result file. The claim check (`/check-claim`) says so
  for these forms and lets the checker choose the result file, which is checked against the claim's
  record and not sent. Putting the target and the compared records into the field set was weighed
  and not done: each would need its own claim on Midnight (one more transaction per identifier,
  against the 10 a day a browser may make) and text slots the claims path doesn't take.
- **DNA marks:** the sequence is sealed as SHA-256 of a tag, a 32-byte salt and the sequence. The
  lab downloads a sequence file (sequence and salt) and keeps it; VeilCore never has it. Nothing
  else can be signed, and leaving the page asks first, until it is saved. The check page shows the
  seal, and in a dispute checks the sequence file against it. A match shows the lab sealed that
  sequence by the result's date, not that a disputed plant carries it. VeilCore doesn't mark, test
  or watch for DNA.
- **Where a lab signs:** with a report on a delivery (`LabResults.tsx`, which now makes version 2;
  a corrected report's result names the result it corrects), or on `/lab/results`: one result, or a
  CSV of up to 100 rows (pathogen, comparison or parentage), each row its own signed result. A file
  with more rows is refused whole, never cut short. The CSV takes qPCR exports as they come
  ("Undetermined" or "N/A" for no Ct, QuantStudio and CFX column names, a panel of targets per
  sample); a Ct with more than two decimals, an inconclusive result or an ambiguous date is refused,
  not rounded or guessed. Each result is kept as a record the lab holds, so it is dated in the next
  hourly batch, and the lab posts a binding naming its key on it (`claims-key.ts resultBindingHash`;
  it stands on its own, without a report signature). The binding is salted with the statement's
  `bindingSalt`, 32 random bytes per result (SPEC 11.12): the key is in every result file and the
  result's code is the binding's subject, so an unsalted binding let anyone with a list of proof
  codes see which records a lab tested. A checker gets the salt in the result file (or on a claim
  link), so it can confirm the name; nobody else can. Results signed before the salt still check,
  without the lab's name, and the old unsalted bindings are not read. After the registry refuses twice for its write
  limit the run stops posting names; "Add your lab's name" posts them later. A result that replaces
  one of the lab's own withdraws that one's binding, whether or not its own name posted, and a
  withdrawal that fails is shown. The lab gets one file per result (per row, or a zip of separate
  files: no file holds two clients' results), an archive for its own records, and a summary CSV for
  its LIMS that also lists the rows not signed.
- **Checking:** `/check-lab-result` (test network only, like signing) checks a result file in the
  browser (form, binding, call, signature). It looks up the lab's name only when asked, since that
  sends the result's code to the registry, and shows "replaced by" only for a later result signed by
  the same key, about the same record, not tested earlier. A replaced result reads as replaced, not
  as unsigned. The page reads the holder's own records only when asked (that sends the holder key),
  and then offers to add the result to the record it was sent under.
- Version 1 results keep checking exactly as before.

### A viability result: a sample before or after a kill step (12 November 2026)

Status: built, on the test network only (the same switch). SPEC 11.12, "Viability" (draft).

Who asked: a producer that grows a production fungus and sells the dried meal heat-treats it (a
kill step) so no live culture leaves its site, and has a lab test samples before and after it.
The same shape fits inactivated vaccines and cell lines, heat-treated seed and sterilised substrate.

- **What the lab signs** is what a microbiology report holds (USP <71>, ISO 11737-2, a plate count,
  an enrichment culture, PDA plating for fungi): the batch or lot; whether the sample was taken
  before or after the kill step; for an after-sample, the kill step's method and parameters as the
  sender states them; what the test recovers; the portion tested; each medium with its incubation
  time and temperature (up to four: USP <71> uses two); the limit of detection; whether viable
  organisms were recovered and, optionally, the count with its unit; the positive control (what it
  was, and that it grew) and, if run, the negative control (no growth); the date sampled. The
  method and version, sample ID, accession number, the dates received and read, and other run
  details (`qc`) are the statement's own fields.
- **An invalid run isn't signed.** A positive control that didn't grow, or a negative control that
  did, is refused on the form and by the statement's own check: "none recovered" on a test that
  couldn't recover anything would be worse than no result.
- **The strain, without showing it.** `strain` is the proof code of the strain record the batch
  was made from (it can be the record the sample was sent under). Only the code is in the result:
  nothing in the strain record. A claim on Midnight shows neither.
- **The pair.** An after-sample can name its before-sample's result (`before`). The check page
  takes several files at once, and shows the two as a pair only when the same key signed both, the
  named one is a before-sample, the batch and the strain record are the same, and it wasn't sampled
  later. If the before-sample also had none recovered, it says the pair doesn't show the kill step
  changed anything.
- **The words.** Every page says the lab reported no viable organisms recovered from the portion,
  under the method and with the limit of detection stated, and that a test recovers only what grows
  under its conditions. No page calls a batch dead or sterile, or says a result proves it; the unit
  tests check that in all five languages. The claim check adds that a claim on the call doesn't
  show the method, the media, the portion or the limit.
- **On Midnight:** the call and the stage are the field set, under `/schemas/viability-v1.json`
  (slot 0: 1 recovered, 0 none; slot 1: 0 before, 1 after), so a holder can prove "none recovered"
  with the lab's signature. The claims contract is unchanged.
- **Where:** `/lab/results` (one result; not in the CSV) and the delivery flow's result form.

## The forms (public, at `/schemas/`)

- `variety-similarity/v1`: similarity to ONE named variety (% × 100), markers compared, markers
  differing, missing calls, the compared variety's registration number, the marker panel code.
- `variety-identity/v1`: match to the variety's reference profile (% × 100), units tested,
  off-types, the variety's registration number, the panel code (INASE's 56-SNP soybean set is one).
- `animal-parentage/v1`: ICAR's 2023 SNP parentage terms: species, panel size, SNPs compared and
  conflicts and outcome for sire, dam and trio.

Only a lab is offered these; a holder typing them would prove nothing. Identifiers are numbers so
a claim can disclose which variety was compared (`proveValue`).

## What it does not show

- Whose key it is beyond what the lab's registered key, the operator's name check and the lab's
  own website say. A lab can now list its keys on its own website (`/.well-known/veilcore-lab.json`
  or a DNS record, `docs/lab-domain-keys.md`); a body publishing which lab keys count is the next
  step and needs no contract change.
- That the method was sound or the certificate genuine.
- The lab knows the numbers and the field secret, so it could prove things about them itself.

## Reviews

Built after four independent reviews on 4 November 2026 (animal genetics, plant varieties, the lab
key trust model, a skeptic) and an independent attack on this design, all of whose nine changes
are in. The first version (a separate /lab page with files) was withdrawn the same day. A third
independent attack on the finished build found two real holes (a lab could add uncommitted fields
to the breeder's record; a withdrawal could miss the numbers if the lab's browser had lost its
note), both fixed with tests, plus smaller ones: a self-named lab no longer gets a green box, the
genetic forms require what was compared (and parentage now names the sire and dam), and only an
Ed25519 key is read for the derived key.
