# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
