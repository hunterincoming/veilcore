# Contract version 2: design (fresh start)

**Status: DESIGN, 23 November 2026. Nothing here is built, compiled, deployed or live on any
network.** Version 1 (v1) of the main contract and of the claims contract is live on Midnight
mainnet. Version 2 (v2) exists only as this document, written so that a security auditor can
review the design before any code is written.

**What changed on 23 November.** An earlier draft of this document moved v1 identities into v2
(a v1 freeze, an on-chain snapshot, a carry-forward, an undo and a 12-month window). The chain
then showed that v1 holds almost nothing to move (section 0.1), so v2 is now a **fresh start**:
a new contract next to an untouched v1, with no carry. The carry design is kept, together with
the review findings that apply to it, in **Appendix A, for v3, the first upgrade with outside
users**.

**Maintainer decision, 23 November 2026 (Hunter Roberts).** v2 goes on mainnet for the team's
own use on the weekend of 28 and 29 November 2026, if the build and the preprod run pass, on
VeilCore's own review. Professional audits come later. In his words: "We will audit our self
and ... that's when we will do all professional audits." So condition 8 (an audit booked before
the team-only deploy) is waived, and v2 is deployed with a temporary single key, handed to the
2-of-3 committee once the third key holder is named. Until the professional audit: no outside
pilot or real user records on v2, and the public site and SDK stay on v1 (section 7).

**Founders' approval.** Decisions marked **pending the second founder's written approval** need
both founders in writing, because they change the approved maintenance policy
([maintenance-policy.md](maintenance-policy.md)). The list is in section 9.

Wording: a record shows **prior possession** of a genetic record by a date. The v1 circuit
`proveOwnership` keeps its deployed name; this document calls what it does a *control proof*.

---

## 0. Why a new contract, and why a fresh start

### 0.1 What v1 holds

The full history of v1 on mainnet, read from the chain from block 0 to 3,553,843 on
23 November 2026:

**Main contract** (`a04de0a2…2347`), 68 transactions:

| Call | Count |
|---|---|
| Deploy, plus key inserts, all on 8 Oct | 1 + 16 |
| `anchor` (date stamps) | 17 |
| `pairDna` | 3 |
| `issueLicense` + `countersignLicense` | 1 + 1 |
| `anchorBatch` | 29 (68 records) |
| Every other circuit: rotation, recovery, replace recovery, transfer, parent, obligation, discharge, revoke, control proof, `proveLicense` | 0 |

**Claims contract:** 14 proofs.

**Every one of these records is the team's own testing (confirmed 23 November 2026),**
including the founders' own checks of the site. The chain alone can't show who made a call,
because the sponsor pays for every visitor and nothing names the caller, so the founders
confirmed the count against their own records. Anyone can still make a v1 record today, so
the count is re-checked before the v2 code freeze and again before the public switch.

**What follows.** v1 holds no lineage, obligations, transfers, rotations or recoveries, and its
maintenance history is clean: 16 updates, all in the deploy minutes, matching counter 16 in
[deployments/mainnet.json](../deployments/mainnet.json). A freeze, a snapshot and a carry would
protect only the team's test data. They were most of v2's risk, most of the audit scope and
most of the timeline.

### 0.2 Why not an in-place upgrade

Midnight's default way to move a contract to the current compiler is in place. Its
maintenance authority inserts the newly compiled verifier keys with a maintenance update, and
clients then use the recompiled artifacts (paraphrased from the
[Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)).
A maintenance update can do exactly five things:

- replace the authority;
- remove a verifier key;
- insert a verifier key;
- remove a circuit's IR;
- insert a circuit's IR.

Nothing in it writes state, adds a ledger field or imposes a delay
([midnight-ledger `SingleUpdate`](https://github.com/midnightntwrk/midnight-ledger/blob/fc48053f1fd16201ed260b7f6d5743a77889d335/ledger/src/structure.rs#L3199-L3213)).
VeilCore's rule is that a version's rules never change ([upgrades.md](upgrades.md), *The
rules*). v2 fixes rules (the zero secret, the Schnorr range check) and adds version fields, so
it is a new version. Midnight publishes no procedure for moving state into a new contract
([updatability](https://docs.midnight.network/guides/updatability)).

### 0.3 What a holder of a v1 record sees

- **A v1 record keeps its date forever, on v1.** Nothing is moved or copied. A record names
  its own contract (SPEC 3.2, 3.6), and v1's 29 batch roots, its printed labels and its QR
  links keep verifying against v1.
- A v1 holder who wants v2's fixes seals again in v2 **with a new secret**. The team does
  this for its own records. v1 test secrets are never reused.
- **The stamp screen should warn now, under Technical details, that v1 is the current
  contract**, in plain words such as: "Records made now stay on version 1. They keep their
  date, and they are not moved." This PR doesn't change the UI. The line goes in all five
  languages in its own PR.

---

## 1. What v2 contains

### 1.1 Every v1 circuit, with the same behaviour

The main contract keeps its 24 keyed circuits: same names, arguments, disclosures and state
written. Its 6 pure hash circuits keep the same tags and give byte-identical output.

- Keyed: `anchor`, `anchorBatch`, `proveOwnership`, `pairDna`, `rotateRecordSecret`,
  `recoverRecordSecret`, `replaceRecoveryCommitment`, `issueLicense`, `countersignLicense`,
  `proposeTransfer`, `approveTransfer`, `withdrawTransfer`, `revokeLicense`, `sealRevocations`,
  `proveLicense`, `proposeParent`, `confirmParent`, `withdrawParent`, `proposeObligation`,
  `encumberOwnRecord`, `withdrawObligation`, `acceptObligation`, `rejectObligation`,
  `discharge`.
- Pure: `commit`, `recoveryCommit`, `licenseCommit`, `licenseKey`, `presentationTag`,
  `obligationKey`.

The claims contract keeps its 5 keyed circuits (`proveValue`, `proveRange`, `proveDistinct`,
`proveUnchanged`, `proveAttested`) and its Schnorr module. That makes 29 keyed circuits in all.

**The hash tags stay `veilcore:v1:*`.** They are the record format, not the contract version,
and the SDK vectors, SPEC 3.6.1 and every sealed record use them. So the same secret gives the
same commitment in both contracts. Rule 10 (3.1) makes that safe: the same commitment in v1
and v2 is **two records with two dates**, and nothing is joined across versions.

**The acceptance test for "same behaviour":** every v1 test suite runs against the v2 build and
passes. Only the lines naming the new version fields may change. The six hashes in
`contract/vectors/v1.json` come out of v2's compiled pure circuits byte for byte. Any other
difference is a bug until it is explained.

### 1.2 What the new toolchain forces

v1 was built with compactc 0.31.1, language 0.23 and runtime 0.16. v2 is built with Compact
toolchain **0.36.1** (language 0.28.0, runtime 0.21.0), the current release
([support matrix](https://docs.midnight.network/relnotes/support-matrix), updated 23 Nov 2026;
[releases](https://github.com/midnightntwrk/compact/releases)).

| Item | What it means for v2 |
|---|---|
| ZKIR v3 only, from 0.36.0 ([Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)) | Every prover and verifier key changes. There will be a new `docs/fingerprints-v2.md`, keyed by contract and version. v1's table stays as it is. |
| Key version slot | The ledger keeps old-format keys under `ContractOperationVersion::V3` and new ones under `V4` ([midnight-ledger](https://github.com/midnightntwrk/midnight-ledger/blob/fc48053f1fd16201ed260b7f6d5743a77889d335/ledger/src/structure.rs#L3033-L3038)). `scripts/committee/core.mjs` hard-codes `'v3'` (l.346, l.361), which is right for v1 only. The slot becomes a parameter, checked against the contract's era (section 5). The devnet confirms it. |
| Key generation bug for Jubjub circuits (#616) | Fixed in 0.36.1 ([CHANGELOG 0.36.104](https://github.com/LFDT-Minokawa/compact/blob/3bab3b9e214bc1de2321369a445281206d5dca86/CHANGELOG.md)). The claims contract must be built with 0.36.1. |
| Proof server | 9.0.0 and 9.0.1 can crash on some Jubjub circuits. Use **9.0.2**, pinned by digest ([support matrix](https://docs.midnight.network/relnotes/support-matrix)). |
| zkir-v3 | Override 3.2.0 with 3.2.1, which carries the #616 fix. |
| `Field` is no longer a supertype of `Uint`; literals need `as Field` | Affects the claims contract and the Schnorr module. The main contract uses no `Field`. |
| Fixes after 0.36.1 that are not released ([CHANGELOG](https://github.com/LFDT-Minokawa/compact/blob/3bab3b9e214bc1de2321369a445281206d5dca86/CHANGELOG.md), up to 0.36.110) | (1) The `sealed` write check missed tuple and vector literals and `map`/`fold` (#932). (2) `JubjubScalar` serialization (#938). (3) `resetToDefault` on depth 16 to 32 trees. (4) The runtime's `JubjubScalar` descriptor accepted out-of-range values. Compensating measures: a test that no circuit writes a `sealed` field, read from the compiled ZKIR; a round-trip test of the signature witness; no `resetToDefault`; and the range check in 1.3. If a release carrying these lands before the code freeze, v2 moves to it. That release raises the language to 0.28.100. |
| midnight-js 5.0.2 and later publish only under `@midnightntwrk/*` | New v2 client code imports `@midnightntwrk/*` wherever the package exists there. |
| `min_block_price` = 10 ([Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)) | Every fee and sponsor cap is recomputed for v2 (section 4). |
| 1,024-node transaction limit, no workaround (node #2386) | The deploy and the key inserts are measured on the devnet. Don't assume v1's 8-key first fragment. |
| Indexer subscriptions with no offset carry no history | Every checker passes an explicit offset. |
| Test harness | Runtime 0.21 is ESM-only with async simulator helpers. `createCircuitContext` takes a leading `circuitId` and an options object, and `CircuitResults.proofData` is gone. Seven test files need porting. |

### 1.3 Claims contract v2: the Schnorr response range check

- **We keep our own Schnorr port (decision 7, approved).** Our port and the standard library's
  `jubjubSchnorrVerify` hash the same struct with `transientHash`. Ours reduces the challenge
  mod 2^248 with the quotient bound and checks the key is in the prime-order subgroup. The
  standard library checks only `pk != identity`, and it takes the response as a `Field` cast to
  `JubjubScalar`
  ([standard-library.compact](https://github.com/LFDT-Minokawa/compact/blob/3bab3b9e214bc1de2321369a445281206d5dca86/compiler/standard-library.compact#L354-L389)).
  The choice between mod 2^248 and mod r goes to the auditor as a question.
- **The fix for A4, an internal attack-round finding** (`docs/audit/README.md`), not an
  outside audit result: **take the response as two parts.** In 0.36.1 every route into
  `JubjubScalar` reduces modulo the order (`Field`, `Uint` and, in the unreleased 0.36.109,
  `Bytes<32>`), and `Field` has no `<`. The released runtime (0.21.0) also used the `Field`
  descriptor for `JubjubScalar` (fixed only in 0.36.110,
  [CHANGELOG](https://github.com/LFDT-Minokawa/compact/blob/3bab3b9e214bc1de2321369a445281206d5dca86/CHANGELOG.md)).
  So typing the witness `JubjubScalar` constrains nothing. Instead:
  1. the signature carries the response as `hi: Uint<4>, lo: Uint<248>`;
  2. the circuit asserts `hi < 14 || (hi == 14 && lo < R_LO)`, where
     `R_LO = r − 14·2^248` and `r` is the Jubjub order (whose top four bits are 14);
  3. it recomposes `hi·2^248 + lo` as a `Field`;
  4. only then does it cast that to `JubjubScalar`. Below `r`, the cast reduces nothing.

  This uses the same boundary pattern as the existing challenge bound, so the tests cover both
  edges: `r − 1` is accepted, while `r`, `s + r` and `hi = 15` are refused. The audit pack says
  that today no circuit publishes or consumes the signature, so malleability changes no
  outcome. The fix closes the class.
- **The small-order (A6) and quotient-split (A5) tests are re-run** on 0.36.1's `ecMul`.
- **Claims v1 keeps working forever.** Its authority was retired on 8 October 2026.

### 1.4 Main contract v2: the changes

- **The zero secret is refused on every incoming secret.** One helper asserts
  `secret != default<Bytes<32>>`, called at every witness read. The secrets it covers:
  - `localGeneticSecret`, in `liveSelf`;
  - `incomingGeneticSecret`, in rotate and recover;
  - `recoverySecret`;
  - `licenseSecret`.

  This removes the stated limit in [design.md](design.md) (*Known limits*). There is one test
  per circuit, and mutation testing of each assert.
- **Version fields, as literals in the constructor:**
  - `sealed ledger contractVersion: Uint<16>` = 2;
  - `sealed ledger predecessor: Bytes<32>` = v1's address
    (`a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347`), kept for provenance.

  There are no constructor arguments, so `startsFromConstructor` works as it does for v1.
  `protocolVersion = 1` keeps meaning "hash protocol v1". **`predecessor` is not a trust link:**
  verifiers never follow it (rule 10).

---

## 2. What v2 deliberately does not add

- **No carry-forward, freeze, snapshot, undo, migration window or licence re-issue.** These
  are kept for v3 in Appendix A.
- **No new record features or ledger fields** beyond the version fields.
- **No Ledger 9 contract events.**
- **No cross-contract calls.** No opcode reads another contract's state
  ([impact opcodes](https://github.com/midnightntwrk/midnight-ledger/blob/fc48053f1fd16201ed260b7f6d5743a77889d335/spec/impact-opcodes.md)),
  and phase 1 calls can't run the callee's witness code
  ([MPS-0021](https://github.com/midnightntwrk/midnight-improvement-proposals/blob/eb626647515e1b66916869052fc8e5d23744004c/mps/mps-0021-phase2-contract-to-contract.md)).
- **No Ed25519, P-256 or `sha512` in circuits.**
- **No `kernel.self()` in the identity hash**, and no `kernel.caller()`.
- **No change to v1's documented limits** (F4, F7, the revocation window, no list of revoked
  licences, a presentation naming its issuer).
- **No royalties contract, no payment logic, no token moves.**
- **No router contract, and no re-key of v1.**

---

## 3. Checking records across two contracts

### 3.1 Rule 10, as SPEC text

This goes into the SDK's `SPEC.md` (the Python and Rust checkers follow SPEC), and as rule 10
into [design.md](design.md):

> **10. Several contracts.** A verifier holds, for each network, a pinned list of VeilCore
> contracts. Each entry gives the address, the kind (main or claims), the contract version,
> its verifier-key table, and every key state the contract may be in, each tied to the
> authority counter and block where it began, as published in VeilCore's deployment record.
> A contract state that matches none of its listed key states is refused.
>
> 1. **Pinned contracts only.** A record is checked only against the contract its
>    `anchor.contractAddress` or `ledgerIdentity.contractAddress` names, and only if that
>    address is on the pinned list. A contract found any other way, such as the registry or a
>    `predecessor` field, is refused.
> 2. **Decode by the contract called.** A transaction is decoded with the decoder for the
>    pinned contract it calls and for the ledger era of its bytes. A transaction that calls
>    more than one pinned contract is refused.
> 3. **Never join identities across versions.** The same commitment in two contracts is two
>    records with two dates. Neither inherits the other's date, parents, licences or
>    obligations. Every date is shown with the name of the contract that gave it.
> 4. **No default contract.** A batch check given no address tries every pinned contract.
>    Off mainnet, a check names its contract version explicitly; a defaulted version fails.

### 3.2 Every checker holds the pinned list

The site's check page today compares a batch transaction against one anchor contract. Once the
anchorer moves to v2, that would show either the new batches or every old link and printed
label as **failed**. So every checker gets the pinned list and rule 10:

- the site (`chain/config.ts`, `anchor-lookup.ts`, `anchor-decode.ts`, `evidence/bundle.ts`);
- `@veilcore/contracts` (the SDK and partner kit), including every default that takes the
  newest `MAINNET_CONTRACTS` entry (`.at(-1)`). `checkBatchAnchor` with no address tries every
  pinned contract and counts calls across all of them together;
- the CLI, `verify.html`, `verify.py` and the Rust checker;
- `api/src/deploy-guard.ts`.

**Off mainnet.** Today `pinnedContractFor` reads any address on preprod, preview and a local
network as v1. That would decode v2 rehearsal states with v1's layout. Non-mainnet checks take
an explicit version or a preprod pinned list, and a defaulted version fails the rehearsal.

**The decoder, chosen by the state's era tag:**

- `@midnightntwrk/ledger-v8` 8.1.3 for bytes in ledger 8's format (every v1 call before
  6 Nov 2026);
- `@midnightntwrk/ledger-v9` **1.0.2 or later** for ledger-9 bytes (every call since, v1 and v2).

The site's `v1-decoder.ts` pins ledger-v9 1.0.0 today. The Ledger 9 notes say clients on
earlier versions could fail to deserialize a contract's state after a map write (#857, fixed
client-side in 1.0.2;
[Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)). The move to 1.0.2 is in
the client patch.

**Ledger #865, assessed.** "A trie insert can produce a malformed trie that fails to
deserialize. There's no workaround, and the full fix needs a hard fork"
([Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)). VeilCore can't prevent
it, and both contracts are mostly maps. If it ever hits a VeilCore contract, its *state* can't
be read until Midnight's fork, so current-state questions (is this head live, is this licence
active) can't be answered. *Dates* are not affected: a record's date comes from its anchor
transaction and block, which bundles carry (3.4). What we do:

- date checks never depend on decoding the current state;
- a state that fails to decode is reported as "can't read the contract's current state", not
  as a failed record;
- the devnet decodes v1's full current state with 1.0.2;
- we watch Midnight's release notes for the fork that fixes it.

### 3.3 The state check: which key states are accepted

`verifierKeyMismatches` (`api/src/state-check.ts`) refuses a state that is missing a pinned
circuit, and on mainnet that can't be turned off. So each pinned contract lists the key states
it may be in, each tied to the published `(counter, block)` where it began:

| Contract | Accepted key states |
|---|---|
| v1 main | (a) all 24 keys matching [fingerprints.md](fingerprints.md), authority one key at counter 16. (b) After the seal: the same 24 keys, authority retired (empty committee), at the counter and block of the seal. |
| v1 claims | 5 keys matching fingerprints.md, authority retired (since 8 Oct 2026). |
| v2 main, v2 claims | Their keys matching `fingerprints-v2.md` (`V4` slot). Authority: (a) before the handover, the temporary single key, at the counter and block in the deployment record, shown by every checker as "one key, not yet handed to the committee"; (b) after it, the 2-of-3 committee at the counter and block of the handover. |

Any other state is refused. The v1 seal removes no keys (section 6), so v1 never enters a
state with keys missing. v2's table is its own, never `pinnedVerifierKeys('veilcore')`.

### 3.4 Checking in the long term

- **Bundles carry the transaction, the state after it and the block header** (raw bytes, with
  the block hash), for v1 and v2 alike. Batch dates already have OpenTimestamps and RFC 3161.
  Control proofs, licences and pairings have only the chain, so they need these bytes.
- **Archive all of v1 now.** v1 is 68 main-contract transactions, plus the claims contract's.
  VeilCore archives every transaction of both contracts, the state after each, the headers and
  the finality proofs, and mirrors the archive outside VeilCore. v2 is archived the same way
  from its first call. Proposed history pruning
  ([MPS-0032](https://github.com/midnightntwrk/midnight-improvement-proposals/blob/eb626647515e1b66916869052fc8e5d23744004c/mps/mps-0032-storage-management.md),
  status Proposed) is one more reason.
- **Old bundles are broken today, v2 or not.** `@veilcore/contracts` 0.2.0 and 0.3.0 depend on
  compact-runtime 0.16 and midnight-js 4.1.1, which can't read the ledger-9 states served for
  post-fork calls. `bundle.ts` still writes `@0.2.0` into every new bundle's check script.
  The fix, which ships **now** and not with v2:
  - publish 0.4.0, which reads both formats and both contracts and applies rule 10;
  - repoint `CONTRACTS_PACKAGE`;
  - test the published script from npm against a post-fork mainnet batch.

  0.2.0 is never unpublished. It checks only pre-fork batches, and only while an indexer
  serves their pre-fork bytes.

---

## 4. Switching the site and the sponsor

The public switch happens only after the audit closes (section 7). It is one release:

- **Registry, then sponsor, then site** (CLAUDE.md order). The sponsor code is deployed before
  any new variable.
- **The anchorer moves to v2's `anchorBatch`.** Old batch proofs keep naming v1.
- **The sponsor allowlist** gets v2's address and circuits. The policy fails closed: a new
  address or circuit is refused until a reviewed line names it. A switch line like
  `MAINNET_AGREEMENTS` stays off until the audit closes, so before then the sponsor pays for
  no v2 call on mainnet.
- **Limits:** per-ticket caps are per circuit (`perTicketDay` in `sponsor/src/limits.ts`;
  anything unnamed gets 0). The v2 circuits get their caps in the switch PR.
- **Fees:** every fee sum is redone at `min_block_price` 10 and measured on preprod. DUST
  settings are never touched, so the daily budget can't be raised quickly. When it runs out,
  the site says in plain words: "Busy. Try again tomorrow. Your record is safe on this device."
- **Pinning:** the v2 address goes into the pinned lists (signed SDK release, site,
  deploy-guard) only after `npm run verify:deployment` passes for it. A pinned list is never
  shortened, so a v2 replaced before the audit is never pinned. The pin comes from the signed
  SDK release (npm provenance plus a signed git tag). The VeilCore file in Midnight's MIP
  repository is not merged, so it is a mirror, not a pin source.
- **The integrator notice** goes out before the code freeze. A checker pinned to v1 only will
  show v2 batches as failed, so update to 0.4.0. It goes on the notice page, in the
  partner-kit release notes and in the deployment record.

## 5. Governance of v2: a temporary key, then a 2-of-3 committee

- **Who holds the keys (decision 2, pending the second founder's written approval).** The
  decision now applies to v2: no committee is installed on v1 (section 6). The options are in
  [runbooks/two-of-three.md](runbooks/two-of-three.md) (A: a named outside holder; B: a third
  key sealed by both founders together; C: one founder holds two keys for now). Under C, say
  openly which founder, and that this founder can act alone. Changing a holder later takes two
  signatures **and the 14-day notice** the policy requires. **Book one call for all three key
  holders across time zones** for the card checks and the confirmations of the handover.
- **The temporary key, and when it goes (maintainer decision, 23 November 2026).** There are
  29 keys to insert (24 main, 5 claims). Each maintenance update is one counter and one
  two-signature round, with a wallet sync. So:
  - **the route chosen:** a temporary deploy key, generated on the maintainer's Mac and kept
    age-encrypted on disk, never on paper or in a password manager. All inserts go in one
    wallet session. The key then **stays on v2 until the third key holder is named**, and
    `replace-authority` hands v2 to the committee. **The handover is a use of v2's key, so it
    needs the policy's 14-day notice: the earliest handover is 14 days after the notice is
    published.** Publish the notice as soon as the third holder is named. The temporary key
    is destroyed only after the handover is confirmed on chain. Until then, v2 has the same
    single-key exposure v1 has today. That is acceptable only while v2 holds team records
    alone (section 7, condition 4). The handover comes before the professional audit and
    before any outside record;
  - **only if the devnet shows all keys fit in one or two updates:** the committee in the
    deploy transaction (counter 0);
  - **or** a "sequence" request: N updates at consecutive counters, signed in one sitting on
    the day and sent in order in one wallet session.
- **`verify:deployment` refuses** a v2 whose history before the committee block holds any
  maintenance update other than the listed inserts and the handover. That means it refuses:
  - any key removal;
  - any inserted key not in `fingerprints-v2.md`;
  - any `IrInsert` or `IrRemove`.

  The team's own calls before the handover are allowed (maintainer decision). A circuit that
  could rewrite state would need an unlisted key insert, which is refused.
- **Key slot:** the slot (`ContractOperationVersion`) comes from the contract's address, never
  from the request: `V3` for v1's pinned address, `V4` for v2's address in the deploy-session
  record. `--key-slot` only names it for a test contract, and must agree. A request that states
  another slot is refused, and the slot of every key on chain is checked again right before
  sending, with tests that the wrong slot is refused.
- **The gate.** Every mainnet request refuses unless the contract shows 3 keys and threshold 2,
  with exactly two named exceptions:
  1. **"v2 before handover":** on v2 while it still has the temporary single key (and no
     committee), the inserts of the keys listed in `fingerprints-v2.md` (`V4` slot), and one
     `replace-authority` to the committee recorded in the go/no-go, with all three holders'
     confirmations; or one `retire`, alone, so a v2 that will not be finished can be closed for
     good (condition 7; runbooks/two-of-three.md, Part D). Nothing else. The tool takes v2's
     address from the deploy-session record, because v2 is pinned only after `verify:deployment`
     passes, and refuses a record that names a pinned v1 address; v1's address is matched first.
     The key slot comes from the address (v1 `V3`, v2 `V4`), never from the request.
  2. **"v1 retire with the single key"** (section 6): one `retire` on v1's pinned address, and
     nothing else.

  A go/no-go records the counter range and the exact ordered list of updates, so a sequence
  isn't refused. Tests:
  - a 3-of-3 committee and a 2-of-2 committee are each refused;
  - a single-key contract is refused outside the two exceptions;
  - the "v2 before handover" request is refused on a contract that already has a committee,
    for a key not in `fingerprints-v2.md`, for any removal or IR change, and for a
    replace-authority to anything but the recorded committee;
  - the v1 exception is refused for anything but `retire`, and on any address but v1's.
- **Never pre-sign** an update ahead of the day. The signed data covers only the address, the
  instructions and the counter (`scripts/committee/core.mjs`), so a signed update is usable by
  whoever holds it until the counter passes it.
- **A v2 maintenance policy** with v1's rules from day one: rules never change, every use is
  announced 14 days ahead, and every use is published.

## 6. Sealing v1: `retire` only

v1 still has one live paper key, and either sheet alone can rewrite v1's present state. The
seal removes that power for good.

- **When:** after v2 is public and audited, so the public site always has a working contract,
  with the 14-day notice.
- **How:** the existing single key, through `scripts/committee`, runs **`retire`** (replace the
  authority with an empty committee, which no signature set can satisfy;
  [deploy and operate](https://docs.midnight.network/guides/deploy-and-operate)). There is no
  committee install on v1 and no call across time zones.
- **No keys are removed.** Checkers refuse a v1 state missing pinned keys (3.3), and a key
  removal on ledger-v9 1.0.0 hits the fee bug (#2375). `retire` is a replace-authority. #2375
  is reported for key removal only, so **we infer** a replace-authority is priced the same by
  the old and the fixed wallet, and the seal doesn't need the client patch. That is our
  inference, not a Midnight statement; devnet question 1 tests it. After the
  seal, v1's 24 circuits stay callable but can never change. VeilCore's site and sponsor stop
  sending to v1 at the switch. Anyone paying their own fee can still make a v1 record, which is
  checked as a v1 record with v1's name on its date.
- **First:** a devnet test that the committee tool's `retire` on a pre-fork contract is
  accepted, and that every checker accepts state (b) in 3.3 afterwards.
  `retireMaintenanceAuthorityProvably` (`api/src/maintenance.ts`) builds a Ledger 8 update and
  is refused after the fork, so it is not used.
- **Archive now:** the exact v1 `.verifier` files with their SHA-256s (`managed/` is not in
  git).
- **This uses v1's key for a reason the approved policy doesn't list** (sealing), so it needs
  both founders in writing (section 9).
- **What changes in `deployments/mainnet.json`:** v1's main entry only. Edit
  `maintenanceAuthority` and add `keyStates` with the seal's counter and block. Leave everything
  else, including `deployment.record` at revision 4, as it is. The freeze test in
  `scripts/deployments.test.mjs` refuses any other change to v1's entries.

---

## 7. Order of work and launch

**[Hunter]** = maintainer only (merges, deploys, wallets, anything sent to a person).

### Now, independent of v2

1. **Ship the 0.4.0 kit and repoint the bundles** (3.4). Bundles are broken today.
2. **Archive v1** (3.4), and the v1 `.verifier` files (6).
3. **The stamp-screen line** (0.3), in its own PR, in five languages.
4. **Re-run the v1 record count** at each step below.

### Stage A (2 to 3 weeks)

5. The founders decide 2 and 9 (section 9). (The v1 record count was confirmed on 23 November
   2026.)
6. **Client patch PR:**
   - midnight-js 5.0.1, Compact JS 3.0.2, wallet SDK 2.0.1, on-chain runtime 4.0.2;
   - ledger-v9 1.0.2, including the decoder and the committee alias;
   - proof server 9.0.2 by digest, and the zkir-v3 3.2.1 override;
   - the lockfile by hand.

   **[Hunter]** merge, then sponsor, then site.
7. **Committee tool:** the key-slot parameter, the sequence request, the "v1 retire" exception
   and the counter-range go/no-go.
8. **Design reviews of this document: done 23 November 2026** (see *Review history*). These
   were reviews of the design, not of code. The code reviews come later (condition 1).

### Stage B (4 to 6 weeks)

9. A new `contract-v2/` workspace (decision 6). Two pinned compilers in CI.
10. Port the 7 test files, with the vector byte test on day one.
11. The v2 changes, tests first:
    - version fields;
    - the zero secret on every incoming secret;
    - the claims range check with its boundary tests;
    - the `sealed`-write check on the compiled ZKIR;
    - the `JubjubScalar` round-trip;
    - A5 and A6 re-runs;
    - mutation testing of every new assert.
12. Keys on the Mac, rebuilt byte for byte on a second machine, then `fingerprints-v2.md`.
13. In parallel: rule 10 in SPEC.md and every checker (3.1, 3.2), the state check's key states
    (3.3), and the site and sponsor switch release (4), held off.

### Stage C (1 to 2 weeks)

14. **Devnet** **[Hunter's Mac]**:
    - v1 on Ledger 8, then the fork;
    - deploy v2 (temporary key or counter 0, measure updates against the 1,024-node limit,
      confirm the `V4` slot), then the committee handover;
    - `verify:deployment`, and checkers on both contracts;
    - the v1 `retire` with the single key, and checkers on state (b).
15. **Preprod and the test site** with the exact build, including the committee handover and
    `verify:deployment`.

### Pre-audit: v2 on mainnet, team only (target the weekend of 28 and 29 November 2026)

The maintainer set this date on 23 November 2026. Stages A to C are compressed into the week
before it. The date holds only if the conditions below pass. Anything that doesn't pass moves
the date; it is never skipped. The temporary-key route needs no committee-tool change for the
deploy itself: midnight-js's current-era helpers insert keys into a ledger-9 contract with one
key. The tool changes (Stage A item 7) are needed for the handover.

**Conditions, all of which must hold before the deploy:**

1. **Own review closed.** Three independent adversarial passes on the frozen v2 **code and
   keys** (contract, verifier, operations), separate from the design reviews already done,
   with every finding fixed or rejected in writing, and all of these pass:
   - every v1 suite on v2;
   - the six hash vectors, byte-identical;
   - mutation testing, which must kill every new assert (zero secret, range check);
   - the Schnorr cast test and the A5 and A6 re-runs;
   - the `sealed`-write check, read from the compiled ZKIR;
   - verifier keys that rebuild byte for byte on a second machine and match
     `fingerprints-v2.md`.
2. **The devnet and preprod runs pass** with the exact build, including the temporary-key
   deploy, a committee handover on preprod, and `npm run verify:deployment`.
3. **Changed by maintainer decision, 23 November 2026.** v2 is deployed with a temporary single
   key, age-encrypted on the maintainer's Mac, and handed to the 2-of-3 committee once the
   third key holder is named. Until the handover, `verify:deployment` refuses any maintenance
   update other than the listed key inserts, and every checker shows "one key, not yet handed
   to the committee". The handover happens before the professional audit and before any
   outside record.
4. **No outside record can land in v2 before the audit closes:**
   - the public site, anchorer and SDK defaults stay on v1;
   - the sponsor pays v2 calls on mainnet only after a reviewed switch line, which stays off
     until the audit closes;
   - the team uses v2 through the CLI or a maintainer-only build.

   Anyone paying their own fee could still call v2. That is acceptable only because of
   condition 5.
5. **Wording:** "deployed on mainnet for testing by VeilCore; not yet independently reviewed;
   not for your records." Never "live" or "audited". No posts about v2 until the public switch.
6. **The pinned-list checkers ship before** any v2 record is printed, shared or bundled.
7. **Audit findings:** a finding in the contract means a fresh v2.x deploy and a re-seal by the
   team, never an in-place re-key, because v2's rules never change. A replaced v2.x is retired
   (and, once a committee holds it, may have its keys removed), and is never pinned. A finding in
   the off-chain code (checkers, tools) means an ordinary fix.
8. **Waived by the maintainer, 23 November 2026** (was: the audit is booked before the
   pre-audit deploy). The team-only deploy rests on VeilCore's own review (condition 1).
   **What still holds:** the public switch, and any pilot or real user record on v2, wait for
   the professional audit's written close.
9. **v1 is not sealed** until v2 is public and audited, so the public site always has a working
   contract.

**Before v2's first mainnet record, these also ship:**

- the 0.4.0 kit and the site with the post-fork bundle fix (3.4);
- the decoder by era tag on ledger-v9 1.0.2 (3.2);
- `checkBatchAnchor` trying every pinned contract (3.2). **Built, 23 November 2026, not
  published:** partner kit 0.5.0, the site's check page and the evidence-bundle check take the
  pinned list from `deployments/mainnet.json` (`api/src/pinned-contracts.ts`), each contract by
  its address, with version 2's decoder, key table and key states (`api/src/state-check.ts`).
  Adding v2's entries there is the switch. Still to do: 0.5.0 on npm before the next site
  deploy; and, on the devnet, that a v2 state's V4 verifier keys survive the kit's carry into
  runtime 0.16 (`contract/src/contract-state.ts`). **The other checkers, built 24 November 2026,
  not deployed or published:**
  - `api/src/deploy-guard.ts` and the CLI: the CLI reads version 1 only, so a join or finish of
    an address pinned as version 2 is refused by name (version 2 has its own tools), and the
    CLI's licence, ownership, pairing and claim checks count a call on any pinned contract;
  - `verify.html` (and the bundle's README and examiner summary): carries the pinned list from
    `deployments/*.json`, names the contract's version, and dates nothing on another contract;
  - `verify.py`: carries the list (veilcore-sdk, `_PINNED_CONTRACTS`) and fails an anchor on
    another contract. Needs the SDK release after 0.18.1 here; `scripts/deployments.test.mjs`
    then compares its list with `deployments/*.json`, so v2 is pinned only once that SDK names it;
  - the Rust crate (veilcore-rs) reads no ledger and holds no list: it has SPEC 9.4's choice of
    contract (`veilcore_records::pinned`), tested on the SDK's vectors;
- **before v2 is pinned** (open, 23 November 2026):
  - real v2 state test data from preprod or the devnet: run `checkBatchAnchor` with
    `contractVersion: 'v2'` on a real v2 anchorBatch and keep that transaction as a test
    fixture (today's v2 fixture is v2's ledger data in a v1 state, with v1's verifier keys);
  - the site shows v2's key state ("one key, not yet handed to the committee") beside its date,
    in all five languages. **Built, 24 November 2026, not deployed:** once more than one
    contract is pinned, the check page reads the maintenance authority from the state at the
    date stamp (`chain/anchor-decode.ts`) and judges it against the pinned entry's key states
    (`api/src/key-states.ts`), as the kit does on mainnet: a state in none of them is refused,
    and a v2 date says who can change that contract. With v1 alone the page is unchanged.
    Off mainnet no key states are pinned, so none are shown, as in the kit;
- rule 10 in SPEC.md (3.1).

16. **[Hunter]** deploys v2 and claims v2 from the Mac: the keys with the temporary key,
    `verify:deployment`, then the pin, then the deployment record revision 5. **Later, once
    the third key holder is named:** the committee handover ([runbooks/two-of-three.md](runbooks/two-of-three.md),
    Part D), `verify:deployment` again, then a deployment record revision.

### Stage D: the professional audit (4 to 8 weeks from booking)

17. Freeze the v2 source and write the audit pack. Its scope is the zero secret, the Schnorr
    range check, the committee tool and the checkers, which is much smaller than the carry
    design. **The audit is not booked yet. The public date follows the audit's close.**
18. Fixes, re-review and re-freeze, under condition 7.

### Public switch, after the audit's written close

19. **[Hunter]** The switch release (section 4): registry, then sponsor, then site, then the
    release list commit. v2 is called live on veilcore.org only once it has worked there.
20. **[Hunter]** With the 14-day notice, the v1 seal by `retire` (section 6), then the
    `deployments/mainnet.json` edit that section 6 describes (v1's `maintenanceAuthority` and
    `keyStates` only).

## 8. Questions for the devnet

1. Is a `retire` (replace-authority) on a pre-fork contract, built by our ledger-v9 tool,
   signed by the single key and **sent from a wallet on ledger-v9 1.0.0**, accepted by a real
   node with the fee that wallet worked out? Do the checkers accept the result?
2. Do 0.36.1 keys go in the `V4` slot, and does the committee tool insert them there?
3. How many of v2's 29 key inserts fit one update under the 1,024-node limit? Can a ledger-9
   deploy carry a committee at counter 0?
4. Do keys rebuild byte for byte on a second machine?
5. What does a plain v2 anchor cost at `min_block_price` 10, and what sponsor caps follow?
6. Does v1's full current state decode with ledger-v9 1.0.2?

## 9. Decisions and their status

| # | Decision | Status |
|---|---|---|
| 1 | Build v2 on a realistic timeline | Approved. Team-only on mainnet the weekend of 28 and 29 Nov 2026 if the build and preprod pass (maintainer decision, 23 Nov 2026); public after the professional audit closes. |
| 2 | Who holds the third key, now for **v2's** committee (A, B or C, and under C which founder) | **Pending the second founder's written approval** |
| 3 | Freeze v1 on launch day | **Dropped** under the fresh start. Kept for v3 (Appendix A). |
| 4 | Pre-approved undo | **Dropped.** Kept for v3. |
| 5 | A 12-month window, then seal; licences re-issued | **Replaced:** no window and no re-issue. The seal becomes decision 9. |
| 6 | v2 code in a new `contract-v2/` workspace | Approved (the written OK goes in the first code PR) |
| 7 | Keep our own Schnorr port, with the range check | Approved |
| 8 | An outside audit before the public switch | Approved. Not booked yet. |
| 9 | Seal v1 by `retire` only, after the public switch, with the 14-day notice. The approved policy doesn't list sealing as a use. | **Pending the second founder's written approval** |
| 10 | The fresh start itself, resting on every v1 record being the team's own | **Confirmed 23 Nov 2026**: every v1 record is the team's own testing |
| 11 | Team-only v2 on mainnet on VeilCore's own review, with condition 8 waived; a temporary single key until the third key holder is named | **Decided by the maintainer, Hunter Roberts, 23 Nov 2026** |

Still open:

- **How long the temporary key may stay on v2.** It stays until the third key holder is named
  (decision 2). There is no fixed date. A deadline would bound the exposure, for example
  "named before the first v2 record leaves the team, or the handover uses option C".
- **If outside v1 records appear** before the switch (the re-count), how many reopen the carry
  design (Appendix A) for those identities only.
- **The v2 maintenance policy text** (section 5), approved in writing by both founders before
  the deploy. It covers the temporary key's use until the handover.

## 10. Review history

All of these were **design reviews** of this document and its plan: independent, read-only
passes, each by a reviewer who didn't write it. None reviewed code, because there is none yet.
Code reviews come at condition 1 (section 7), and the outside audit after that.

| Date | Angle | Verdict | Where the findings went |
|---|---|---|---|
| 23 Nov 2026 | Contract attacker, toolchain, users and operations (three reviews of the first plan, carry design) | Four blockers (leaked origin re-anchored, lost lineage invariants, partial freeze, no rollback) and serious findings | Folded into the carry design, now Appendix A |
| 23 Nov 2026 | Contract attacker (this doc, carry design) | Blocker: origins missing from the snapshot leaf set; high: obligation double-discharge, non-membership order | Appendix A.2 (v3); the Jubjub range-check finding in 1.3 |
| 23 Nov 2026 | Verifier and checker (this doc, carry design) | Blockers: origins missing; checkers refuse a v1 state with keys removed | Appendix A.2 (v3); for v2: 3.1 to 3.4, the retire-only seal (section 6) |
| 23 Nov 2026 | Migration and operations, including the fresh start | The fresh start recommended; pre-audit mainnet launch safe under nine conditions | The fresh start throughout; section 7 conditions; section 5 |
| 23 Nov 2026 | Independent review of this document (fresh start) | Fail: older text in upgrades.md contradicted the fresh start; the gate refused the default deploy route; smaller wording and traceability points | upgrades.md rewritten; section 5 gate exceptions; this table; the runbook in the repo |

---

## Appendix A. For v3, the first upgrade with outside users

v3 is the first time real holders will need to move. The design below was written for v2 and
reviewed (see *Review history*). It is kept as the starting point, together with every finding
against it.
It is **not** part of v2.

### A.1 The design in brief

- **Freeze.** Committee signatures remove the verifier keys of every holder circuit in the old
  version except `proveLicense`, `revokeLicense` and `sealRevocations`. `anchorBatch` is kept
  until the new version's anchorer takes over. So four circuits are kept in all.
- **Snapshot.** The old version's state at the end of the finalized block holding the last
  freeze update, identified by block hash. It is rebuilt independently from that state and by
  replaying every transaction, and published with totals.
- **Two trees under one constructor argument:**
  - a commitment tree of linked leaves (each leaf names the next commitment, after Aztec's
    indexed Merkle tree), so that non-membership is one path;
  - an obligation tree for membership.
- **`carryForward` and `carryForwardByRecovery`:** prove the head secret, or the recovery
  secret, against the head leaf; install the counters, lineage and obligation counts. Each
  origin can be carried once.
- **Non-membership in `anchor` and every "unused" check,** so a leaked old secret can't be
  re-anchored, and nobody can rotate or recover into an old commitment.
- **A history check:** the snapshot builder walks the old version's maintenance history. Any
  key or update not in the published records is a no-go.
- **The carry happens only on the holder's own button,** with a forced backup after a carry by
  recovery. The browser downloads the leaves and builds its own path.
- **A pinned successor only**, revocations always honoured, and a seal after the window. The
  carry keeps working after the seal.

### A.2 Review findings v3 must fix (the 23 November 2026 design reviews)

Blockers:

- **The leaf set (contract C1, verifier B1).** v1's `anchor` writes `recoveryOf[c]`, never
  `originOf[c]`. `originOf` holds successors only. A tree built from `originOf` leaves out
  every origin, so an unrotated identity can't carry, and a leaked rotated-away origin can be
  re-anchored in the new version, bringing back squatting and handing over the old date.
  - *Fix:* the set is `keys(recoveryOf) ∪ keys(originOf) ∪ keys(headOf) ∪ values(headOf)`.
  - The builder asserts `keys(originOf) ∩ keys(recoveryOf) = ∅`, that every head is in the
    set, and that every `recoveryOf` key has exactly one head leaf.
  - Attack tests: re-anchoring a rotated-away origin, a never-rotated origin and a non-head
    successor are each refused.
- **The obligation double-discharge (contract C2, verifier M2).** A fixed root proves
  membership forever, so the same old obligation can be discharged again and again, which
  drives the installed count down while other obligations are still in force. A discharge
  before the record carries installs a phantom count later.
  - *Fix:* a `dischargedV1: Set<Bytes<32>>`, asserted absent and then inserted.
  - The route is refused unless both record and beneficiary have carried.
  - The leaf holds `(r, o, b)`, so the key is recomputed in the circuit.
  - The verifier rule: an old obligation is open iff it is open at the snapshot and not in
    `dischargedV1`.
  - Test: a second discharge of the same key is refused.
- **A 12-hour undo is not realistic (operations).** Re-inserting 20 keys at about one update
  each, with two signatures across the Pacific and a wallet sync, has never been tested on
  mainnet. *Fix:* fix forward. Hold the freeze for up to about 7 days with stamps queued, and
  undo only past that, using sequence signing.

High and medium:

- **Order of non-membership (C3).** Compact's `Bytes`→`Uint` casts are little-endian, and
  `Bytes<32> as Field` can't hold about half of all values. *Fix:* one exported pure circuit
  `snapLess(a, b)` defines the order, and the builder sorts with that compiled circuit's
  JavaScript. Property tests cover every leaf, random non-members, top byte `0xff`, and values
  differing only in the low half.
- **Tree capacity (C4).** One identity can make about 289 commitments, and a self-funded
  spammer isn't bound by the sponsor's caps. *Fix:* size the tree for commitments (depth 32);
  the builder refuses before the freeze if the count is over 1% of capacity; the count is a
  go/no-go input. Download the leaves in buckets by prefix, compressed.
- **Key states (verifier B2).** After a freeze, checkers refuse the old version's state as
  "missing keys". *Fix:* the versioned key states of 3.3, extended with the freeze's state,
  and a devnet check that re-inserted keys hash to the fingerprints as the indexer serves them.
- **Liveness across versions (H1).** For a carried identity, liveness is read from the new
  version only. An old control proof counts only if there is no carry, or the new head is the
  one that proved.
- **Revoking after a recovery (C6, H2).** An issuer who recovered in the new version can't
  revoke old licences, because `revokeLicense` needs the old head. *Fix:* a new-version circuit
  that revokes an old licence under the carried identity, honoured by the verifier rule, or
  refusing old presentations after the issuer's recovery block.
- **Long-term proof (H5).** Publish the snapshot with a storage proof at the snapshot block and
  its finality justification. Put the old anchor `(block, tx index)` in each head leaf.
- **The browser (M5).** The browser checks the published leaves against the on-chain roots.
  Rebuilding from the chain is for `verify:deployment`, the SDK CLI and the second machine,
  which reads a different indexer or its own node.
- **A half-applied freeze.** Sign all the freeze updates in one sitting, and order them so that
  every prefix is coherent.
- **The notice** announces a window, not a date, and says whether a retried freeze needs a new
  notice.
- **The partial new version after an undo (C12, M1).** Remove its keys, then retire it, and
  never pin it.

Low:

- C7: `carryForward`'s secret read gets its own zero-secret check.
- C8: write down `carryForwardByRecovery`'s preconditions (not already carried; recoveries
  left; rotations reset; new recovery different; new head unused in both state and snapshot).
- C9: `parentSetHash` needs a witness of at most 2 sorted origins.
- C10: refuse an obligation key that is open in the old version and not yet discharged.
- The kept-circuit count is four, not three.

### A.3 Prior art used

| Source | What we took |
|---|---|
| Aztec indexed Merkle tree ([docs](https://docs.aztec.network/aztec/concepts/storage/trees/indexed_merkle_tree)) | Linked leaves: non-membership with one path. |
| Aztec application state migration, Jan 2026 ([request](https://forum.aztec.network/t/request-for-grant-proposals-application-state-migration/8298), [Cardinal Cryptography](https://forum.aztec.network/t/secure-turnstile-application-state-migration-pattern-cardinal-cryptography/8414), [Andee Labs](https://forum.aztec.network/t/request-for-grant-proposals-application-state-migration-using-direct-proof-migration/8403)) | A safe snapshot height when old state may be tainted; one claim per identity; no central trusted party; claims bound to their arguments; proving it on a local network first. |
| Uniswap merkle distributor ([repo](https://github.com/Uniswap/merkle-distributor/tree/25a79e8ec8c22076a735b1a675b961c8184e7931)) | The root as an immutable constructor argument; a published list plus a script anyone runs to rebuild the root. |
| OpenZeppelin merkle-tree ([README](https://github.com/OpenZeppelin/merkle-tree/blob/98ff55dc7b6004a6e57ca0cb256cc0d08ecb6096/README.md)) | Sorted leaves; leaves hashed apart from inner nodes. |
| Zcash Sprout to Sapling ([migration](https://zcash.readthedocs.io/en/latest/rtd_pages/sapling_turnstile.html)) and the 2026 Sprout freeze ([report](https://cointelegraph.com/news/zcash-nu7-upgrade-sprout-funds-unspendable)) | Published totals. And the lesson that an old system frozen with no way out strands people, so the carry stays open after the seal. |
| MakerDAO single-collateral Dai shutdown ([report](https://www.theblock.co/news/markets/2020-05-12-makerdao-shuts-down-the-single-collateral-dai-system-64964)) and Uniswap v2 to v3 ([guide](https://support.uniswap.org/hc/en-us/articles/7423351004173-How-to-migrate-liquidity-from-Uniswap-v2-to-v3)) | Moves started only by the holder; a long window; a path that stays open after the old system closes. |

---

## Sources

Midnight, read 23 November 2026:

- Ledger 9 upgrade notes: https://docs.midnight.network/relnotes/ledger-9
- Support matrix: https://docs.midnight.network/relnotes/support-matrix
- Deploy and operate: https://docs.midnight.network/guides/deploy-and-operate
- Updatability: https://docs.midnight.network/guides/updatability
- midnight-js `c8d1667`: [migration guide, *If you keep ledger 8 contracts*](https://github.com/midnightntwrk/midnight-js/blob/c8d16679af4a3aac70da91ba8441093399ed84be/docs/releases/v5.0.0/migration-guide.md#L1312-L1325)
  (midnight-js refuses ledger-8 maintenance after the fork, which is why v1's seal goes through
  `scripts/committee`), [era dispatch](https://github.com/midnightntwrk/midnight-js/blob/c8d16679af4a3aac70da91ba8441093399ed84be/packages/contracts/docs/era-dispatch.md#L270-L300)
  (the fork keeps a contract's authority and counter), and
  [governance](https://github.com/midnightntwrk/midnight-js/blob/c8d16679af4a3aac70da91ba8441093399ed84be/packages/contracts/src/governance/unproven-tx.ts)
  (one signing key only).
- midnight-ledger `fc48053`: `ledger/src/structure.rs` (key versions, `SingleUpdate`),
  `spec/impact-opcodes.md`.
- Compact compiler `CHANGELOG.md` and `standard-library.compact` at LFDT-Minokawa/compact
  `3bab3b9`; releases at https://github.com/midnightntwrk/compact/releases (latest 0.36.1).
- Midnight improvement proposals `eb62664` (MPS-0021, MPS-0032).

VeilCore: [upgrades.md](upgrades.md), [design.md](design.md),
[maintenance-policy.md](maintenance-policy.md),
[maintenance-committee.md](maintenance-committee.md),
[committee-rehearsal.md](committee-rehearsal.md), [fingerprints.md](fingerprints.md),
`deployments/mainnet.json`, `scripts/committee/core.mjs`, `api/src/state-check.ts`,
`sponsor/src/policy.ts`, `sponsor/src/limits.ts`, `contract/src/veilcore.compact`.
