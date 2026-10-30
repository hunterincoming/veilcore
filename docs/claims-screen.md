# The claims screen: prove one number from a lab certificate without showing the rest

Status: DESIGN AND BUILD, 29 October 2026. Test networks first. The claims contract
(`docs/claims-design.md`) has been on mainnet since 8 October with no screen; this is the screen.

## What a person does

1. **Seal the results.** A grower has a certificate of analysis. They seal it as a document
   (`docs/document-profile.md`: the PDF's SHA-256, never the PDF) and type the numbers from it
   into a published form (a *schema*): total THC 0.21 %, total CBD 11.4 %, and so on. The
   numbers are sealed as a field set (SPEC 4.5): each one salted, under one root, inside the
   same record. Nobody can see them; nobody can change them later.
2. **Prove one fact.** Later a buyer, a regulator or a partner asks "is it under 0.3 % THC?".
   The holder picks the number and the bound, and their browser proves on Midnight that the
   sealed number is at most 0.3 %, without publishing the number. Or that a value is exactly
   what they say (that publishes the value).
3. **Show the proof.** The holder sends a link. The check page reads the claim from Midnight,
   checks it names the record and the schema it says, and shows: "Total THC is at most 0.300 %
   in record X, sealed on date D. The holder typed the numbers; no lab signed them."

## Why this shape (borrowed, and why)

- **The document and the numbers in one record.** The PDF's fingerprint and the numbers are
  sealed together, so the numbers can't be swapped for a different certificate's later, and
  "which certificate did these come from" has one answer. SPEC 4.5 already puts `fieldSchema`
  and `fieldSetRoot` in the committed JSON; the document profile allows the two.
- **Published schemas, not free-form numbers.** A claim names a schema id; the checker
  recomputes the id from the published schema document (SPEC 4.5, check 3), so "slot 0 is total
  THC in % × 1000" can't be reinterpreted. Two to start, both public in this repository and on
  the site at `/schemas/`:
  - `veilcore/schema/potency/v1`: cannabinoid potency (total THC, delta-9 THC, THCA, total CBD,
    CBDA, CBG, total cannabinoids, moisture), each % × 1000.
  - `veilcore/schema/seed-quality/v1`: germination, pure seed, other crop seed, weed seed, inert
    matter, moisture (the numbers on a seed analysis certificate, AOSCA and ISTA style), each
    % × 100.
- **Range and value only, to start.** `proveRange` (k=16) and `proveValue` (k=15) are the two a
  grower, a buyer and a regulator ask for. `proveDistinct` and `proveUnchanged` (k=17) answer an
  examiner's question and are the heaviest; they wait for someone who asks.

## The honest risks

- **Proving in the browser at k=16 has not been measured.** The proof server on a 16 GB laptop
  made `proveRange` in seconds (4 October). The browser's WebAssembly prover is slower and
  single-threaded; the main contract's largest circuit is k=14. k=16 needs about four times the
  memory and a 19.5 MB proving key, downloaded once. It may be fine on a laptop and too heavy
  on a phone. **This has to be tried on the test site on a real laptop and a real phone before
  it is offered on veilcore.org.** The page says "prove it on a computer" until then.
- **The numbers are the holder's statement.** A claim proves "the number this holder sealed is
  at most 0.3 %", not that a lab measured it. A lab-signed version (`proveAttested`, where the
  lab signs the record) is the strong form; it needs the lab's signing flow and comes next. The
  check page says which one it is, every time.
- **Range claims leak.** Each bound proved is public; a series narrows the number (SPEC 4.5,
  "Disclosure accounting"). The screen shows what earlier claims on that number already reveal
  before proving another.
- **The sponsor must pay for claims.** It pays for the main contract's calls today. Claims need
  the claims contract's address and circuits added to its allowance, and a sponsor redeploy.

## Build order, and where it stands

1. **Done (29 Oct).** Schemas, field-set sealing in the browser, the document profile allowing a
   field set (site, registry, SDK vectors).
2. **Done (29 Oct), not yet run on a network.** The claim call from the browser
   (`bboard-ui/src/veilcore/chain/claims-call.ts`): the claims contract named by
   `VITE_REAL_CHAIN_CLAIMS_ADDRESS`, its proving files copied into the build when they exist
   (`scripts/copy-claims-keys.mjs`), the public parameters k=15 and k=16 pinned (from Midnight's
   own `data_provider.rs`), and the sponsor paying for claims on the claims contract only
   (`VEILCORE_CLAIMS_ADDRESS`, `MAINNET_CLAIMS` off). Checked here: the claim's inputs pass the
   claims contract's compiled circuits, Midnight's own circuit checker accepts them, the sponsor
   policy would pay, and the number and its salt are not in what is sent. Not checked here: a
   real proof (the parameters can't be downloaded in this environment).
3. **Done (29 Oct).** The check page for a claim link (`/check-claim`): the claim read per call
   from the indexer on this site's claims contract, compared exactly with the link, the record
   dated by its proof code recomputed from the claim and the key binding.
4. **To do (Hunter).** On the test site: the test network's claims contract in the sponsor's
   settings (`VEILCORE_CLAIMS_ADDRESS`; the site takes it from the sponsor when it is built), the
   claims keys and the k=15 and k=16 parameters on the Mac (`deploy:test` refuses without them),
   then a real claim on a laptop and on a phone. How long each took and whether the phone managed it decides what
   veilcore.org offers.
5. **Later.** A laboratory signing a certificate's record (`proveAttested`), so a claim is about
   numbers a lab sealed, not the holder's typing.
