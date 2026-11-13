# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### A change undone before it is saved is saved undone (13 Nov 2026, not deployed yet)

- A holder who changed a record and changed it back before the first save was answered had the
  change-back skipped: it matched the copy last saved, and the change still on its way wasn't
  counted. The registry kept the change while the page showed the original. A save now skips a
  row only when nothing sent above the copy last saved is still unanswered (on its way, or its
  answer lost); otherwise the row is sent again, one rev above.

### Two quick saves of a record keep the newer copy (13 Nov 2026, not deployed yet)

- A save's rev was taken after its hashing finished, and hashing can finish in any order. A
  record saved as made and saved again a moment later (with its DNA pairing and its sealed
  secrets) could give the older copy the higher rev, and the registry kept that one. A
  correction made next was built on it, so the pairing and the sealed secrets were lost there.
  Saves of one kind are now sealed one at a time, in the order they start; the requests still
  go out without waiting on each other.

### Royalty payments: overdue in the open, and stablecoin pay built (8 Nov 2026)

- An accepted royalty report not paid by its due date shows as Overdue on both sides, with
  in-app reminders when a payment is due within a week. The licensor's record's public check
  page says "A royalty statement is overdue since <date>", nothing more, as the holder's word
  (needs the registry's `license-notices-v1` to `-v3`). Revoking for non-payment takes a signed notice
  of breach first and 30 days to pay (the cure period); only then is "Revoke for non-payment"
  offered. It revokes on Midnight as before, then sends the licensee a signed notice, and the
  public page says a license was revoked for non-payment. The licensee can answer with "I paid"
  or a short dispute, which the public line shows beside it. Every deadline is a UTC date. The
  public lines are worked out from the deal's signed messages and the chain, so any device, a
  cleared browser or a plain "Revoke" leaves the same public page. Every line is signed with the
  licensor's deal key; the licensee's page registers each report at the registry with its due
  date, and a notice of breach is filed only for a registered report after that date. The
  licensee's page shows every public line about their deal.
- Paying a USD royalty in USDCx or USDM on Cardano, straight from the licensee's own wallet to
  the licensor's signed address, with a CIP-20 reference; a payment found on Cardano settles
  the report without "received" (SPEC 11.10 draft, "Settled on chain"). Addresses screened
  against a bundled OFAC list first. Off everywhere unless switched on: on mainnet only by
  `STABLECOIN_PAY_ON_MAINNET` in code, on a test network only with `VITE_STABLECOIN_PAY=on` and a
  test token. A Cardano payout the page can't pay never hides the bank details and "I paid". One
  new package, @emurgo/cardano-serialization-lib-browser 17.0.0.
- The NIGHT payment check (test networks) compares with the report's amount less declared
  tax, not the payer's figure. Details: `docs/royalty-pay.md`.

### Lab results: a viability result for a sample before or after a kill step (test network only)

- A lab can sign a test for viable organisms in a sample taken before or after a kill step (a
  heat treatment, an inactivation): the batch, the stage, the kill step's method and parameters,
  what the test recovers, the portion tested, each medium with its incubation time and
  temperature, the limit of detection, whether anything was recovered and the count, the controls
  and the date sampled (SDK SPEC 11.12, "Viability", draft). A run whose positive control didn't
  grow, or whose negative control did, can't be signed.
- The batch is tied to the strain record it was made from by proof code only. An after-sample can
  name the before-sample's result; the check page takes several files at once and shows the two as
  a pair only when the same key signed both for the same batch and strain record.
- The check page, the record and the claim check say "no viable organisms recovered" with the
  method, the portion and the limit of detection, and what a test can't show. They never call a
  batch dead or sterile. A new call form, `/schemas/viability-v1.json`; the claims contract is
  unchanged. In all five languages.
- Fixes from an independent check: a withdrawn or replaced result no longer reads as paired (the
  page says which one was withdrawn); a pair needs both tests to look for the same thing, and says
  so when the methods differ; the lab form refuses "1,000", "1.000", "0,5" and other separated
  numbers, with how to type them, instead of reading "1,000" as 1; none recovered has no count and
  reads as "< {limit of detection}", never 0, and some recovered may leave the count out
  (an enrichment test gives none: "no count reported"); the claim note says a claim doesn't show whether the
  sample was taken before or after the kill step; Japanese no longer calls that claim a proof; the
  standards are cited correctly; Spanish, German and French wording fixed.
- Fixes from the final check: a signed result whose limit of detection or count reads like a
  thousands point ("1.000", "12.500") is refused by its own check too, as in the SDK; an
  after-sample that itself replaces its before-sample no longer reads as paired in the SDK either
  (the page already said so); the pair no longer says the before-sample "also" had none recovered
  when the after-sample recovered something; what the test recovers is quoted in the pair line; a
  count unit with no count is refused instead of dropped; the number hint shows under the count
  too; a missing control choice no longer marks the positive control's name.
- Last fixes: a limit or count with any whole part but 0 and exactly three decimals ("1234.567",
  "1000.000") is refused too, as in the SDK ("0.125" stands); the claim note says a claim covers
  the result only, instead of "proves" it, in all five languages; the word check reads every lab
  string in all five languages instead of a list of keys; a result that replaces its own pair
  says so, instead of naming the same result twice.
- Lab signing stays on the test network only.

### Lab signatures: private unless the holder shows them (not live yet; ships with the registry)

- The registry is changing to keep a lab's receipts and reports about a record private: only
  the holder, the delivery's parties and the lab can read them. This site update goes with it.
- Show someone has a "Lab signatures" section under "Whether a DNA report is saved": one switch
  per lab receipt or report, "Show that … signed this on your check link", off by default. When
  the saved DNA report matches a lab report and the link carries its lab salt, showing that
  report is suggested. The choice is kept with the record's sealed copy and sent in the grant as
  `values.sharedAttestations`; ids no longer about the record are left out before sending.
- The check page reads `sharedAttestations` from `/verify`, checks each signature and
  withdrawal in the browser, keeps only those about the record, and uses them like the open
  list (the lab report line, receipt lines, the signer footer). A custody line that names no
  receipt is still shown, without the lab.
- It no longer says "No lab's receipt or lab report has been signed about this record". It says
  the holder hasn't shown any lab signatures, and that they are private unless the holder
  shows them. The DNA report lines and the claim check's "lab not identified" line say the same.
- Against a registry from before this change (every lab signature public), the site works as
  before: the grant is sent again without the field when the registry refuses it.
  In all five languages.
- `deploy:mainnet`, `deploy:test` and `deploy:prod` refuse a registry whose `/health` doesn't
  list `private-lab-signatures-v1`, so the site can't go out before the registry.
- Wording that still called a lab's signature public now says it is private unless the holder
  shows it: the note a breeder gets when a lab report arrives (plants, animals, strains; shown
  once more to those who dismissed the old one), the lab's "Sent" screen and its name help, the
  partners page, "We don't vouch for results", and the privacy page (what the server keeps;
  on veilcore.org also "What strangers can see"). Docs: privacy terms, simple flow, lab
  signing, and the partner guide. In all five languages.
- Final review fixes (12 Nov 2026):
  - The share screen says what "Whether a DNA report is saved" already shows without any
    signature shown: for each lab receipt, that a lab received a sample and whether what
    arrived matches what was sent, without the lab's name. Said under that switch, in the
    "Lab signatures" intro (which now says the delivery's sender sees them too), on the lab's
    Sent screen and in the privacy page. In all five languages.
  - The share list and the grant read every page of the holder's signatures, not only the
    first 100.
  - A lab key's genetic-fingerprint and inspection signatures can be shown too, when the
    registry marks them private.
  - A lab's signed report carries its key's proof (`x-lab-key-proof`), which the registry now
    needs for a first report on a delivery with no receipt.
  - The partner field keeps custody lines that name no receipt (`unnamedCustody`), so a seal
    mismatch is not lost when the holder hasn't shown the receipt.
  - Wording: a withdrawn lab report is "every one shown"; French "joint à cet enregistrement".

### Lab results v2: the lab's name link is salted (8 Nov 2026, test network)

- The binding a lab posts to put its name on a result no longer gives away which record it
  tested. It was a hash of the lab's key and the record's proof code; the key is in every result
  file, so anyone with a list of proof codes could match them. It now also covers a random salt
  made for each result and kept in the signed statement (SDK SPEC 11.12, `bindingSalt`). A checker
  gets the salt in the result file, or on a claim link, and still sees the lab's name.
- Results signed before this still check, without the lab's name; the check page and the
  record page say so and don't look the name up. A lab that wants its name on one signs it again.

### Dating again after the fork; licences and royalties on veilcore.org (8 Nov 2026)

- The mainnet sponsor uses proof server 9.0.1 (`proof-server-ledger9`), pinned by digest
  `sha256:90e36a14…2f37`. There is no 9.0.0 image; every place that named it now says 9.0.1.
- The scheduled anchoring job dated a batch on mainnet on its own (`B-20261108-0AF6`, block
  3370721). `SCHEDULED_ANCHORING_RUN_ON_MAINNET` is on: veilcore.org says batches are anchored
  automatically, and names no interval.
- A licence and a royalty report (sent, answered, paid, received) worked end to end on
  veilcore.org. `ROYALTIES_RUN_ON_MAINNET` is on: the home page's veilcore.org cell says "Yes",
  and that handing a licence on hasn't been tried there yet. In all five languages.

### Where it came from, and real batches (7 Nov 2026)

- A plant logged as a landrace or heirloom, or as material received from a breeder, a seed
  bank or a collection, no longer needs a breeder: "Bred by" becomes "Breeder, if known",
  optional, with no "your name" placeholder. A "Where it came from" step asks for the source in
  the holder's own words, a collection or community name, the country of origin, the date
  received, and permit, SMTA, IRCC and GLIS DOI numbers, all optional. They are sealed in the
  record's notes as labelled lines (`bboard-ui/src/veilcore/origin-notes.ts`): no new sealed
  field, no new profile version, and no record hashes any differently.
- Every check page says: "The date shows the holder had this record by then. It doesn't show
  who bred it or where it came from."
- The bulk import maps a genebank passport sheet's MCPD columns by name (ACCENAME, ACCENUMB,
  GENUS, SPECIES, SAMPSTAT, COLLSRC, ORIGCTY, ACQDATE, PUID); SAMPSTAT 300 is sealed as
  "Landrace / heirloom".
- The terms of use ask nobody to register other people's traditional varieties as their own
  breeding.
- Record offspring: each young animal's sex, ID and date of birth before Save; a sire not on
  VeilCore typed in, with an optional semen code for artificial insemination. An animal's sex
  and individual ID can be corrected afterwards, as a new record that supersedes the sealed one.
- Cut clones: a lot name and size sealed in each clone's notes, and a plant tag for each clone,
  numbered on from the first. Clones of a plant logged with no breeder need none either.
- After two reviews: a repeat litter or clone cut is numbered on by name and by each child's
  own details, never "saved" as the old records; IDs and tags already on the holder's records
  are refused; each young animal can name its own dam; sex is one tap; IDs number on like tags;
  the semen code is asked only for cattle, sheep and goats; a newborn's tag correction no longer
  warns about offspring and agreements it hasn't got; the holder's own notes can't pose as an
  origin block; wild and traditional import rows never take the default breeder; MCPD codes
  show their meaning and the donor columns import; on a phone the Ask bubble stays off forms.
- All new words in English, German, Spanish, French and Japanese.

### Midnight's Ledger 9 fork: midnight-js 5 (6 Nov 2026)

- Mainnet moved to Midnight Ledger 9 on 6 November 2026. The site, sponsor, client API,
  partner kit, CLI, VeilCore-run and committee tools move to midnight-js 5.0.0 and wallet SDK
  2.0.0, and call the same Ledger 8 contracts on a network before or after the fork. The
  contracts are not changed or recompiled.
- Contract state written by either ledger is read (`contract/src/contract-state.ts`).
- The sponsor reads and checks a transaction with the ledger that wrote it; every policy
  refusal is tested on both.
- The browser proves with zkir-v2, which proves these contracts' circuits in a Ledger 9
  transaction (zkir-v3 refuses them).
- Contract maintenance (circuit keys, authority, retirement, the committee tools) is refused
  on a network past the fork, before anything is built: midnight-js 5 cannot maintain a Ledger
  8 contract there.
- Proof server: 9.0.1 on mainnet (9.0.0 was never published), 8.1.3 on test networks until they fork.
- A switch for a notice that dating is paused (`VITE_DATING_PAUSED`), off by default, in all
  five languages.
- Lockfile review: `docs/log/ledger-9-lockfile.md`.

### Claims: prove one number from a sealed certificate, test networks (29 Oct 2026)

- A certificate's numbers can be sealed with it, under a published form (cannabinoid potency,
  seed quality), each salted under one root (SPEC 4.5). Only the form's id and the root are in
  the record.
- "Prove one number": at most or at least a bound (the number is never published), or exactly
  (it is), proved in the browser on the claims contract and paid for by the sponsor. The page
  shows what earlier claims on that number already made public.
- A claim link and its check page (`/check-claim`): the claim read from Midnight for that one
  call, compared exactly with the link, and the record dated by its own proof code.
- Not yet run on a network: needs the claims keys in the build and the claims contract in the
  site's and sponsor's settings (docs/claims-screen.md).

### Document records, test networks (29 Oct 2026)

- Seal a document (`/documents/new`): a permit, a COA, a contract, a transport document. Each
  file is hashed in the browser; only its SHA-256, name and size are sealed. Draft profile
  `veilcore/profile/document/v1` (SPEC 11.11), test networks only (`DOCUMENT_RECORDS_ENABLED`).
- A document's page: what was sealed, its date on Midnight, "Is this the same file?", and a
  check link that carries the sealed fields after the `#`. The check page (`/check-document`)
  recomputes the proof code from the link, looks up that proof code's date, and compares the
  file byte for byte. Nothing is uploaded and nothing in the link is believed.
- Test-site deploys require a registry that lists `document-profile-v1`.

### Licenses on animal and strain records (29 Oct 2026)

- An animal or a strain record can now be licensed, with terms in its own words. An animal:
  breed only; breed and collect semen or embryos; breed, collect and sell; royalty per dose,
  per offspring born or per unit sold. A strain: use only; use and subculture; use, subculture
  and make derived strains; royalty per production batch or per unit sold. A royalty on
  offspring (animals) or on derived strains (strains) works as it does for plants.
- The terms seal what the record is about (`subject`), so the licensee's page, the license
  page and the certificate use the same words without holding the record. A plant's terms carry
  no `subject`: every plant agreement already made keeps its fingerprint.
- Same transactions as a plant license; no contract change. The record summary now counts
  agreements for animals and strains too.

### Ready to switch licenses on at veilcore.org (25 Oct 2026)

- The switch is two lines: `AGREEMENTS_LIVE` (site) and `MAINNET_AGREEMENTS` (sponsor). The
  public pages in all five languages, the "What's live where" table and the crawler summary
  follow them; nothing else to edit (`docs/agreements-live.md`, "Going live").
- `deploy:mainnet` refuses to put licenses live without the sponsor, or with a sponsor that
  doesn't pay for license transactions (its `/sponsor/status` now says `agreements`).
- A practice agreement made before the switch stays marked "Practice" where agreements are real.
- The test site no longer calls licenses, lab agreements and breeder shares practice only or
  simulated: every type is made with real transactions there. The license screens dropped the
  "Simulated…" line where agreements are real.

### Licenses with royalties, on the test network (21 to 24 Oct 2026)

- Real licenses from the website on test.veilcore.org: the licensee's key is made on their own
  device, both sides read a 6-digit code aloud, the breeder issues and the licensee activates
  on chain. Switched off on veilcore.org until a final test run (`docs/agreements-test-run.md`).
- A private channel per deal: every message signed (Ed25519) and locked (AES-GCM); the registry
  relays what it can't read. Terms, royalty statements with an optional sales report, accept or
  dispute, paid and received, W3C credentials.
- Payment straight from payer to payee, through a payment partner or in NIGHT on Midnight
  (test networks only); VeilCore never holds money.
- Royalties on declared offspring; handing a license on with the breeder's approval (the new
  holder must sign the terms before the breeder can approve); a pack for lenders, checked with
  `npx veilcore-records deal`; lenders' claims on a record (`/claim`).
- A passkey copy of the backup, for a lost phone.
- Every license screen in Spanish, Japanese, German and French (drafts until signed off).

### Repository tidy (17 Oct 2026)

- README opens with what is live: both mainnet addresses, what works on veilcore.org, what is
  practice only, no audit, no users yet. Stale lines ("not deployed yet", "does not anchor
  yet", "simulated") corrected; the privacy paragraph is a short list.
- `docs/README.md` indexes the docs; dated run records moved to `docs/log/`, operator
  procedures to `docs/ops/`.
- Operator messages in the CLI, API and scripts point to the maintainer (hunter@veilcore.org).
- CONTRIBUTING rewritten for VeilCore; Code of Conduct reports go to hunter@veilcore.org; the
  empty SUPPORT.md is removed.

### Mainnet (8 Oct 2026)

- `veilcore` deployed at `a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347`
  (block 2922687; all 24 circuit keys on chain by 06:50 EDT) and `veilcore-claims` at
  `ef763eb4ad1846b716dbfa90c00560a9a943ffb4d1fc638b0707df5adefd070d` (block 2922871; maintenance
  authority retired to an empty committee in block 2922874). Both pinned in
  `api/src/deploy-guard.ts` (`5722fdb`). Details: `docs/deployment-record-revision-4.md`.
- First mainnet batch `B-20261011-FE71` anchored by hand on 11 October (Midnight block 2973563;
  our own test records) and also stamped on Bitcoin
  (blocks 971004 and 971005; `docs/bitcoin-stamp-check-11oct.md`).

### Proof server 8.1.3 (11 Oct 2026)

- Every pinned proof server image moves from 8.0.3 to `midnightntwrk/proof-server:8.1.3`
  (`sha256:0f4ab0716985eaebbe55a970348f52ff05ffd8a96631ed7232bd0c4ba02c115c`), Midnight's
  2 October security patch for GHSA-wr7g-rr4v-jmj8 and the version Midnight's support matrix
  pairs with midnight-js 4.1.1 and Compact 0.31.1. The digest is from Midnight's signed build
  manifest (key fingerprint 2D55 ACA7 93E9 495E 4288 9A35 4523 91B0 57AD D8C7), checked here.
  To check it independently: `docker pull midnightntwrk/proof-server:8.1.3` prints the same
  digest.
- The advisory concerns contracts that use a `Set` or `Map` keyed by a `Field`,
  `MerkleTreeDigest` or `JubjubPoint` as a one-time guard. VeilCore's contracts key every map
  and set by `Bytes<32>` or `Uint<64>`, and the claims contract keeps no state: not affected.

### Preprod through Blockfrost (9 Oct 2026)

- Midnight shut its own preprod indexer and RPC (`indexer.preprod.midnight.network`,
  `rpc.preprod.midnight.network`) at 22:00 UTC on 9 October 2026, as it did on mainnet on
  30 September. Preprod is now reached through Blockfrost everywhere, with its own project
  id: the CLI (`VEILCORE_BLOCKFROST_PREPROD_PROJECT_ID`, kept out of the log and the
  terminal as on mainnet), VeilCore-run (asked hidden, or the same variable), and the
  partner kit (`endpointsFor('preprod', …, { blockfrostProjectId })`, `blockfrostEndpoints`,
  `BLOCKFROST_ENV`). Breaking for kit users on preprod: a project id, or all four endpoints,
  is now required. Preview is unchanged. The faucet is Nethermind's, as before.
- Docker images pinned by digest (proof-server 8.0.3, midnight-node 0.22.3,
  indexer-standalone 4.0.1).

### Bound DNA pairing (9 Oct 2026)

- **No contract change.** `pairDna` still publishes any non-zero 32 bytes, so a raw
  report hash can be copied, even from a pending transaction, and paired to another record
  first. The clients now pair `H("veilcore:v1:dnapair", reportHash, identity, salt)`
  instead (`contract/src/pairing.ts`): it hides the report, verifies only for the
  identity inside it, and needs the report hash to make. Verifier rule 9
  (`acceptPairing`): whoever controlled this record's identity at the block's date had
  this report, or its SHA-256, by then; it does not show who controls the record now.
- **Hostile review, same day.** The verdict flags a report hash paired raw before the
  bound pairing (from the contract's history, `api/src/pairing-history.ts`) and key
  changes or recoveries of the identity since; checking without the report file is
  refused; one wording everywhere; a pairing whose confirmation failed can be found from
  its binding (CLI option 45); `checkPairing` reads the state now from the second indexer
  too; weak salts are refused; evidence files need their binding and a plain file name.
- **API and partner kit:** `pairReport` (salt saved in private state before sending),
  `pairings()`, `checkPairing` (pinned keys, second indexer, state now for rotated
  records), `commit.reportPairing`, `pairingEvidence` / `readPairingEvidence`,
  `reportHashOf`. Raw `pairDna` stays, documented as copyable. The lab example uses the
  bound pairing. Not in `@veilcore/contracts` 0.2.0.
- **CLI:** option 3 pairs a report file bound to the record and writes an evidence file;
  44 checks one (hashing the report given); 45 shows saved pairings; 43 is the raw pairing.
- **Vectors and docs:** the binding's vector in `contract/vectors/v1.json` and in the
  SDK's conformance set (SDK `1b46728`, SPEC 3.7); design.md (hashes, `pairDna`, rule 9),
  PARTNERS.md, the site's pairing paragraph and vendored docs.

### Fixes from the 8 October review (8 Oct 2026)

- **Site:** copy on what a DNA pairing shows, what the maintenance key can do, anchoring
  and privacy, with the translations; the verify page shows a grey seal unless an anchor
  is checked on chain, times in UTC; a not-found page and robots.txt; a smaller build.
  Docs vendored from veilcore-sdk `33fa929`. The translation worksheets are out of date
  and need regenerating.
- **Client checks:** every verdict's lookup compares the circuits' verifier keys with the
  pinned build (always on mainnet) and reports the maintenance authority (committee,
  threshold, counter; `authorityCounter` can require one). An optional second indexer
  must agree on call, block and state. The partner kit refuses a network name that does
  not match its indexers or address. Rule 5 has an issuer-scoped form
  (`acceptPresentationScoped`) for a caller who supplies the history since the last seal;
  the strict rule stays the default. Licence requests are built against the issuer's
  current head (`licenseRequest`). Claims check 8 refuses a mask over every described
  slot and matches `supersedes` beyond `recordId`. The package's canonical JSON refuses
  what the SDK refuses.
- **CLI:** one CLI per private-state store (`private-state.lock`); every secret it shows
  is redacted from then on. Proof server containers bind 127.0.0.1 only.
- **Partner kit:** a remote proof server is refused unless `allowRemoteProofServer`, then
  https only; credentials in endpoint URLs are kept off the terminal (`scrubTerminal`).
  These need a 0.3.0 release of `@veilcore/contracts`, not yet published; 0.2.0 on npm
  does not have them.
- **Docs:** design, partner guide, maintenance policy and deployment record match the
  above. Still open then: the mainnet authority counter to expect (not yet recorded), and
  Docker image digests (all three images were on tags; pinned by digest on 9 October).
- **Deploy tool:** Vercel CLI stays on 62.2.0 with `tar` overridden past the critical
  advisory.

### VeilCore-run, managed service v1 (6 Oct 2026)

- New folder `veilcore-run/` and `npm run managed`: VeilCore operates on chain for partners
  with no developers, through the partner kit's public exports only. Each partner's secrets
  are in their own encrypted store (scrypt N=2^17, AES-256-GCM, owner-only files, a password
  per partner), never in the operator's own private state; the chain clients run with
  in-memory private state. Every partner operation, a hash-chained audit log per partner
  with no secrets, export bundles encrypted to the partner's passphrase, printable sheets.
- Recovery secrets stay with the partner by default: one master sheet made on their own
  computer (`partner-keys`), VeilCore given only commitments.
- Exit: self, or assisted (the partner's recovery commitment replaces VeilCore's, then each
  record is rotated to a secret made in the run and sealed straight into the partner's
  bundle); resumable; the partner's own recovery (`partner-recover`, `partner-check`) is the
  required last step, and `exit-check` shows it on chain. The store is then retired and every
  operation refused; `purge` deletes the remaining secrets and the bundle files.
- After a fresh-session AI review (same day; not an audit): bundles sealed to an X25519 key derived from the
  partner's master (no passphrase typed on VeilCore's computer, no plaintext sheets there);
  pools and exit answers confirmed by a fingerprint the partner reads out; "can act" status
  from what VeilCore actually holds; audit log anchored on chain with receipts; lock before
  read; `change-password` fixed; obligation terms never on the command line.
- After the re-check: an exit reconciles with the chain before acting (a hand-over that landed
  late is done, from the bundle that holds it; a recovery replacement that landed unrecorded is
  applied, also before a self exit); `exit-cancel` for an exit that sent nothing;
  `partner-check-receipt`, with the log's raw lines in every bundle; `purge` anchors the log
  after the purge line; unusable bundle keys refused.
- `docs/MANAGED.md`; `docs/PARTNERS.md` now lists three options at launch;
  `docs/legal/managed-service-agreement-DRAFT.md` (draft, for a lawyer).

### Partner integration kit (6 Oct 2026)

- New workspace `partner-kit/`: the package `@veilcore/contracts` (Apache-2.0, ESM, Node 24)
  for labs, registries, certifiers and vendors to call VeilCore's contracts from their own
  systems. `connect` (network, endpoints, a wallet and private state they supply, or
  `seedWallet` and `encryptedPrivateState`), `VeilCore.join` and `VeilCoreClaims.join`
  (mainnet: the pinned addresses only), every partner operation of both contracts, and
  checks that need no wallet (`checkPresentation`, `checkOwnership`, `checkBatchAnchor`,
  `readClaim`). Deploying, circuit keys and the maintenance authority are not exported.
- Proving keys and circuits are not shipped: they are loaded from a folder or a URL and
  every file is checked against the deployment record's fingerprints (`veilcore-keys`).
  The compiled contract code ships byte for byte as fingerprinted.
- `docs/PARTNERS.md`; three runnable examples (lab, breeder licence, claims); `npm run
  partner-check` runs all three on preprod through the public package only.

### Claims contract ready for mainnet (5 Oct 2026)

- `docs/fingerprints.md` has a second table for the claims contract, written by
  `npm run fingerprints:claims` (refuses unless the same build of the main contract still
  matches its table); `npm run fingerprints:check` checks both and writes nothing. Each
  contract's build is checked against its own table only. The claims table is not yet
  generated (the keys need proving parameters; runbook C0).
- A claims deploy off a test network is allowed only when it ends with an empty-committee
  maintenance authority, the deployment record revision is declared, and the build matches
  the committed claims fingerprints; it was refused everywhere off a test network before.
- Joining (and so reading claims from) the claims contract on mainnet accepts only
  `MAINNET_CLAIMS_ADDRESS` (empty until the deploy). CLI options 35 and 36 check the claims
  build first on mainnet; the mainnet start-up warns if the claims build does not match.
- The claims deploy prints its deploy transaction id.

### Security (round D, 4 Oct 2026: operator tooling before mainnet)

- The maintenance key and one-call secrets (recovery secret, incoming record secret,
  licence secret, presentation challenge) are never written to the local private-state
  store; they are held in memory for the call. "Finish a deploy" always asks for the key
  from paper.
- The private-state store moved from `bboard-cli/midnight-level-db` to
  `~/.veilcore/<network>/private-state` (folders 0700, files 0600). An old folder is
  detected and its live entries can be copied (without maintenance keys); the old folder
  is never changed or deleted by the CLI.
- Replacing the recovery secret checks whether it landed, and says which secrets to keep.
- Join checks the contract started from the constructor's state; on mainnet it accepts
  only the pinned address (`MAINNET_VEILCORE_ADDRESS`, empty until the deploy).
- A secret change is believed landed only on two agreeing chain reads 30 s apart; new
  menu options 41 (use a record secret you hold) and 42 (check a recovery secret).
- State-stream errors no longer crash the CLI; rule 5 refuses presentations older than an
  hour or older than their challenge; circuit names match exactly; the password is kept
  out of the environment and git runs with a minimal environment; the main contract
  retires provably (empty committee).
