# The claims screen: prove a fact from a lab certificate without showing the rest

Status: DESIGN AND BUILD, 29 October 2026. Test networks first. The claims contract
(`docs/claims-design.md`) has been on mainnet since 8 October with no screen; this is the screen.

## What a person does

1. **Seal the results.** A breeder, grower or seed company has a lab certificate. They seal it
   as a document (`docs/document-profile.md`: the PDF's SHA-256, never the PDF) and type the
   numbers from it into a published form (a *schema*): a seed lot's germination 94.5 %, its
   moisture 8.2 %, or a plant's total THC 0.21 %, and so on. The numbers are sealed as a field
   set (SPEC 4.5): each one salted, under one root, inside the same record. Nobody can see them;
   nobody can change them later.
2. **Prove one fact.** Later a buyer, a regulator or a partner asks "is germination at least
   85 %?" (or "is it under 0.3 % THC?"). The holder picks the number and the bound, and their
   browser proves on Midnight that the sealed number is at least (or at most) that bound,
   without publishing the number. Or that a value is exactly what they say (that publishes the
   value).
3. **Show the proof.** The holder sends a link. The check page reads the claim from Midnight,
   checks it names the record and the schema it says, and shows: "Germination is at least
   85.00 % in record X, sealed on date D. The holder typed the numbers; no lab signed them."

## Why this shape (borrowed, and why)

- **The document and the numbers in one record.** The PDF's fingerprint and the numbers are
  sealed together, so the numbers can't be swapped for a different certificate's later, and
  "which certificate did these come from" has one answer. SPEC 4.5 already puts `fieldSchema`
  and `fieldSetRoot` in the committed JSON; the document profile allows the two.
- **Published schemas, not free-form numbers.** A claim names a schema id; the checker
  recomputes the id from the published schema document (SPEC 4.5, check 3), so "slot 0 is
  germination in % × 100" can't be reinterpreted. Two to start, both public in this repository and on
  the site at `/schemas/`:
  - `veilcore/schema/potency/v1`: cannabinoid potency (total THC, delta-9 THC, THCA, total CBD,
    CBDA, CBG, total cannabinoids, moisture), each % × 1000.
  - `veilcore/schema/seed-quality/v1`: germination, pure seed, other crop seed, weed seed, inert
    matter, moisture (the numbers on a seed analysis certificate, AOSCA and ISTA style), each
    % × 100.
  - Added 4 November 2026: `soybean-snp-similarity/v1`, `maize-snp-similarity/v1`,
    `genetic-similarity/v1` (docs/lab-signing.md).
- **Range and value only, to start.** `proveRange` (k=16) and `proveValue` (k=15) are the two a
  grower, a buyer and a regulator ask for. `proveDistinct` and `proveUnchanged` (k=17) answer an
  examiner's question and are the heaviest; they wait for someone who asks.

## The honest risks

- **Proving in the browser at k=16: measured on a laptop, not on a phone.** On 31 October a real
  `proveRange` claim went from the test site in a laptop's browser to the test network in about
  80 seconds (block 3205450), and its check link confirmed it. Phones haven't been tried, so
  the screen and veilcore.org's "What's live where" say to use a computer.
- **The numbers are the holder's statement.** A claim proves "the number this holder sealed is
  at least 85 %", not that a lab measured it. A lab-signed version (`proveAttested`, where the
  lab signs the record) is the strong form; it needs the lab's signing flow and comes next. The
  check page says which one it is, every time.
- **Range claims leak.** Each bound proved is public; a series narrows the number (SPEC 4.5,
  "Disclosure accounting"). The screen shows what earlier claims on that number already reveal
  before proving another.
- **The sponsor must pay for claims.** It pays only on the claims contract its
  `VEILCORE_CLAIMS_ADDRESS` names, on mainnet only VeilCore's pinned one (`MAINNET_CLAIMS`, on
  since 2 November), and only for `proveRange`, `proveValue` and `proveAttested`.

## Who can tell which record a claim is about

A claim names the record's commitment, not its name. The record's proof code is made from that
commitment and the record's key binding, and VeilCore's registry holds both for every record,
beside the holder key that sent them. So VeilCore can tie any claim to its record and to that
holder key, and anyone who has the record's check link can tie the claim to the record. "Prove
a fact" says so before the button, for every record, in five languages (`app.claim.tie`).

## Build order, and where it stands

1. **Done (29 Oct).** Schemas, field-set sealing in the browser, the document profile allowing a
   field set (site, registry, SDK vectors).
2. **Done (29 Oct), not yet run on a network.** The claim call from the browser
   (`bboard-ui/src/veilcore/chain/claims-call.ts`): the claims contract named by
   `VITE_REAL_CHAIN_CLAIMS_ADDRESS`, its circuits copied into the build (`scripts/copy-claims-keys.mjs`) and its proving keys
   read from keys.veilcore.org (`docs/proof-files.md`), the public parameters k=15 and k=16 pinned (from Midnight's
   own `data_provider.rs`), and the sponsor paying for claims on the claims contract only
   (`VEILCORE_CLAIMS_ADDRESS`, `MAINNET_CLAIMS` off). Checked here: the claim's inputs pass the
   claims contract's compiled circuits, Midnight's own circuit checker accepts them, the sponsor
   policy would pay, and the number and its salt are not in what is sent. Not checked here: a
   real proof (the parameters can't be downloaded in this environment).
3. **Done (29 Oct).** The check page for a claim link (`/check-claim`): the claim read per call
   from the indexer on this site's claims contract, compared exactly with the link, the record
   dated by its proof code recomputed from the claim and the key binding.
4. **Done (31 Oct).** On the test site: a real claim from a laptop's browser, about 80 seconds,
   confirmed by its check link. Not tried on a phone.
5. **veilcore.org (2 Nov).** The mainnet sponsor pays for claims once its Railway settings have
   `VEILCORE_CLAIMS_ADDRESS` set to VeilCore's claims contract
   (`ef763eb4ad1846b716dbfa90c00560a9a943ffb4d1fc638b0707df5adefd070d`) and it is redeployed from
   this code. `npm run deploy:mainnet` then reads that from the sponsor's status, checks it is the
   pinned contract and that the claims keys and parameters are on the Mac, and builds the site
   with claims on; with no claims contract on the sponsor, the site has none. Then one real claim
   on veilcore.org from a laptop, and its check link opened in another browser.
6. **Built (4 November 2026).** A laboratory signing a certificate's record (`proveAttested`), so
   a claim is about numbers a lab signed, not the holder's typing, with three genetic similarity
   forms (soybean, maize, any crop or strain): docs/lab-signing.md.
7. **Built (26 November 2026), not yet run on Midnight's main network.** Two claims about a pair
   of the holder's own records (`bboard-ui/src/veilcore/two-record-claims.ts`, folded under
   "More ways to prove" on the page of a record with sealed numbers; not a page of its own):
   "Show these two records are different" (`proveDistinct`: they differ in at least k of the
   numbers their form compares; k and the compared numbers are the form's, 1 for every form
   today) and "Show a correction only changed what it says" (`proveUnchanged`: outside a published
   list, both records hold the same numbers). Offered only on the forms a holder types in
   (potency, seed quality, grow batch, harvest lot), never on a lab's result form
   (`marker-claims.ts` rule 4), and never for a record kept on this device only. The check page
   (`/check-claim#p=…`) reads the claim per call, compares it exactly with the link, refuses a
   list that covers every number the form describes (SPEC 4.5 check 8), dates both records and
   says what the claim doesn't show. Its top line, like the one-number claim page's, is a warning and never green while a record the claim names has no date confirmed on Midnight (SPEC 4.5 check 2). Before a correction is proved, the panel lists what earlier claims on the earlier record already made public, which then holds for the correction too for every number left unticked (SPEC 4.5, disclosure accounting). Not offered on a lab's copy of its own result. Checked here: the inputs pass the claims contract's compiled
   circuits and Midnight's own circuit checker, and a pair the contract would refuse is refused
   in the browser first. **Not yet possible on any network:** the sponsor doesn't pay for these
   two circuits (`sponsor/src/policy.ts` `CLAIMS_CIRCUITS`), so the button stays off
   (`TWO_RECORD_CLAIMS_SPONSORED`, held to the sponsor's list by a test); the site doesn't host
   the k=17 public parameters (`bboard-ui/scripts/fetch-params.mjs`) or copy these two circuits'
   proving files (`bboard-ui/scripts/copy-claims-keys.mjs`). Until a real run on veilcore.org,
   the page says "Built, not yet run on Midnight's main network" (`TWO_RECORD_CLAIMS_RUN_ON_MAINNET`).
