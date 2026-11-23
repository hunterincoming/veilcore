# Contract version 2: design

**Status: DESIGN, 23 November 2026. Nothing here is built, compiled, deployed or live on any
network.** Version 1 (v1) of the main contract and the claims contract are live on Midnight
mainnet. Version 2 (v2) exists only as this document. It is written so that a security
auditor can review the design before any code is written. Three independent adversarial
reviews (contract, verifier, migration and operations) come next, and their findings are fixed
before code (plan step 6).

**Founders' approval.** Decisions 1, 5, 6, 7 and 8 are approved as recommended. Decisions 2, 3
and 4 change the approved maintenance policy, so they need both founders in writing. This
document assumes the recommended answers to them, and each place that depends on one is marked
**pending the second founder's written approval**. The list is in section 7.

What this covers:

- v2 of the main contract and of the claims contract;
- how a v1 identity is carried into v2;
- how v1 is frozen and later sealed;
- how verifiers read both versions;
- how v2 is deployed and governed.

It builds on [upgrades.md](upgrades.md) (why VeilCore ships versions, not edits),
[design.md](design.md) (v1's circuits, hashes and verifier rules 1 to 9),
[maintenance-policy.md](maintenance-policy.md) and
[maintenance-committee.md](maintenance-committee.md).

Wording: a record shows **prior possession** of a genetic record by a date. The v1 circuit
`proveOwnership` keeps its deployed name; this document calls what it does a *control proof*.

---

## 0. Why a new contract, and not an in-place upgrade

Midnight's default way to move a contract to the current compiler is in place. "Its
maintenance authority inserts the new verifier keys through a maintenance update, and clients
then attach with the recompiled artifacts"
([Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)). A maintenance update can
do exactly five things:

- replace the authority;
- remove a verifier key;
- insert a verifier key;
- remove a circuit's IR;
- insert a circuit's IR.

Nothing in it writes contract state, adds a ledger field or imposes a delay
([midnight-ledger `SingleUpdate`](https://github.com/midnightntwrk/midnight-ledger/blob/fc48053f1fd16201ed260b7f6d5743a77889d335/ledger/src/structure.rs#L3199-L3213)).
OpenZeppelin's Compact library says the same: "There is no ledger migration: a layout change
ships as a fresh deployment"
([ARCHITECTURE.md](https://github.com/OpenZeppelin/compact-contracts/blob/f85f1a23685c6bbedfc8c2589ae3aa128aff7c46/ARCHITECTURE.md#upgrade-and-versioning)).

v2 is a new deployment for two reasons:

1. **It needs new state.** v2 adds the snapshot root, the version fields and the
   carried-forward identity state. No maintenance update can add these.
2. **VeilCore's rule is that a version's rules never change** ([upgrades.md](upgrades.md),
   *The rules*). An in-place re-key would leave v1's key holding power over v1's present state
   forever. And the fixes in v2 (zero secret, non-membership) are rule changes, which belong
   in a new version.

Midnight publishes no procedure for moving state into a new contract. Its guides say "plan
contract migration instead" and stop there
([updatability](https://docs.midnight.network/guides/updatability)). So the migration below is
VeilCore's own design, and it is in the audit scope. How other projects do it, and what was
borrowed, is in *Prior art* (section 8).

---

## 1. What v2 contains

### 1.1 Every v1 circuit, with the same behaviour

The main contract keeps its 24 keyed circuits: same names, same arguments, same disclosures,
same state written. Its 6 pure hash circuits keep the same tags and give byte-identical
output.

- Keyed: `anchor`, `anchorBatch`, `proveOwnership`, `pairDna`, `rotateRecordSecret`,
  `recoverRecordSecret`, `replaceRecoveryCommitment`, `issueLicense`, `countersignLicense`,
  `proposeTransfer`, `approveTransfer`, `withdrawTransfer`, `revokeLicense`, `sealRevocations`,
  `proveLicense`, `proposeParent`, `confirmParent`, `withdrawParent`, `proposeObligation`,
  `encumberOwnRecord`, `withdrawObligation`, `acceptObligation`, `rejectObligation`,
  `discharge`.
- Pure: `commit`, `recoveryCommit`, `licenseCommit`, `licenseKey`, `presentationTag`,
  `obligationKey`.

The claims contract keeps its 5 keyed circuits (`proveValue`, `proveRange`, `proveDistinct`,
`proveUnchanged`, `proveAttested`) and its Schnorr module.

**The hash tags stay `veilcore:v1:*`.** They are the record format, not the contract version.
Carrying a record forward depends on `commit(secret)` giving the same bytes in both versions.

We considered and rejected one alternative: giving new v2 anchors a `veilcore:v2` tag. It
would also stop a leaked v1 secret being re-anchored. But it changes the record format, the
SDK vectors and SPEC 3.6.1, and it breaks "same secret, same commitment". Non-membership
(3.3) does the job without touching the format.

**The acceptance test for "same behaviour":** every v1 test suite runs against the v2 build and
passes. Only the lines that name the new version fields may change. The six hashes in
`contract/vectors/v1.json` come out of v2's compiled pure circuits byte for byte. Any other
difference is a bug until it is explained.

### 1.2 What the new toolchain forces

v1 was built with compactc 0.31.1, language 0.23 and runtime 0.16. v2 is built with Compact
toolchain **0.36.1** (language 0.28.0, runtime 0.21.0), the current release
([support matrix](https://docs.midnight.network/relnotes/support-matrix), updated 23 Nov 2026;
[releases](https://github.com/midnightntwrk/compact/releases)).

| Item | What it means for v2 |
|---|---|
| ZKIR v3 only, from 0.36.0 ([Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)) | Every prover and verifier key changes. There will be a new `docs/fingerprints-v2.md`; v1's table stays as it is. |
| Key version slot | The ledger keeps old-format keys under `ContractOperationVersion::V3` and new ones under `V4` ([midnight-ledger](https://github.com/midnightntwrk/midnight-ledger/blob/fc48053f1fd16201ed260b7f6d5743a77889d335/ledger/src/structure.rs#L3033-L3038)). `scripts/committee` uses `'v3'`, which is right for v1. v2's keys go in `V4`, so the tool must take the version as a parameter, checked against the contract's era. The devnet confirms the slot (section 6). |
| 0.36.0 key generation bug for Jubjub circuits (#616) | Fixed in 0.36.1 ([CHANGELOG 0.36.104](https://github.com/LFDT-Minokawa/compact/blob/3bab3b9e214bc1de2321369a445281206d5dca86/CHANGELOG.md)). The claims contract must be built with 0.36.1. |
| Proof server | 9.0.0 and 9.0.1 can crash on some Jubjub circuits. Use **9.0.2**, pinned by digest ([support matrix](https://docs.midnight.network/relnotes/support-matrix)). |
| zkir-v3 | Override 3.2.0 with 3.2.1, which carries the #616 fix. That is what Midnight's examples do. |
| `Field` is no longer a supertype of `Uint`; literals need `as Field` | Affects the claims contract and the Schnorr module. Mixed arithmetic still casts implicitly. The main contract uses no `Field`. |
| `ecMul`/`ecMulGenerator` take `JubjubScalar` | Affects the Schnorr module (see 1.3). |
| Fixes after 0.36.1 that are not released ([CHANGELOG](https://github.com/LFDT-Minokawa/compact/blob/3bab3b9e214bc1de2321369a445281206d5dca86/CHANGELOG.md), up to 0.36.110) | (1) The `sealed` write check missed tuple and vector literals and `map`/`fold` (#932). (2) `JubjubScalar` serialization (#938). (3) `resetToDefault` on depth 16 to 32 trees. (4) The runtime's `JubjubScalar` descriptor accepted out-of-range values. Compensating measures: a test that no circuit writes a `sealed` field, read from the compiled ZKIR, not the source; a round-trip test of the signature witness; no `resetToDefault` in v2; and the in-circuit range check in 1.3. If a release carrying these lands before the audit freeze, v2 moves to it. That release raises the language to 0.28.100. |
| midnight-js 5.0.2 and later publish only under `@midnightntwrk/*` | New v2 client code imports `@midnightntwrk/*` wherever the package exists there. |
| `min_block_price` = 10 ([Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)) | Every fee is recomputed for v2. |
| 1,024-node transaction limit, no workaround (node #2386, [Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)) | The deploy is measured on the devnet. Don't assume v1's 8-key first fragment. |
| Indexer subscriptions with no offset carry no history ([Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)) | Every checker passes an explicit offset. |
| Test harness | Runtime 0.21 is ESM-only with async simulator helpers. `createCircuitContext` takes a leading `circuitId` and an options object, and `CircuitResults.proofData` is gone. Seven test files need porting. |

### 1.3 Claims contract v2

- **We keep our own Schnorr port (decision 7, approved).** Our port and the standard library's
  `jubjubSchnorrVerify` both hash the challenge with `transientHash` over
  `{annX, annY, pkX, pkY, msg}`. They differ in three ways:
  - we reduce the challenge mod 2^248 with the quotient bound `q < 115`, or `q == 115` with
    `r < P − 115·2^248`;
  - we check the key is in the prime-order subgroup;
  - the standard library checks only `pk != identity`, and it takes the response as a `Field`
    cast to `JubjubScalar`
    ([standard-library.compact](https://github.com/LFDT-Minokawa/compact/blob/3bab3b9e214bc1de2321369a445281206d5dca86/compiler/standard-library.compact#L354-L389)).

  Switching would make every lab sign a different challenge. Whether to reduce mod 2^248 with
  the bound or mod r goes to the auditor as a question, not a change.
- **The response is range-checked inside the circuit.** v1 takes the response as an unchecked
  `Field` (audit finding A4). Typing it `JubjubScalar` is not enough, for two reasons:
  - the released runtime (0.21.0) used the `Field` descriptor for `JubjubScalar`, so it can
    encode and decode values outside the scalar range. This is fixed only in the unreleased
    0.36.110
    ([CHANGELOG](https://github.com/LFDT-Minokawa/compact/blob/3bab3b9e214bc1de2321369a445281206d5dca86/CHANGELOG.md));
  - a modified prover never runs the JavaScript check anyway.

  So v2 takes the response as a value the circuit itself constrains to be below the Jubjub
  order, and only then uses it as a scalar. The response never passes through a cast that
  reduces it. The `JubjubScalar` ↔ `Bytes<32>` cast added in 0.36.109 reduces modulo the
  order. **Cast test:** a witness returning `s + r`, both through the JS path and as raw bytes
  past it, must be refused, not silently reduced. Midnight's zk-loan port carries the same
  quotient bound
  ([schnorr.compact](https://github.com/midnightntwrk/midnight-examples/blob/953f8648b20d82bf5ebf486381f62a1aa2d22d3c/examples/zk-loan/contract/schnorr.compact)).
- **The small-order (A6) and quotient-split (A5) tests are re-run** on 0.36.1's `ecMul` with
  the `R_MINUS_1` constant.
- **Claims v1 keeps working forever.** Its authority was retired on 8 October 2026 (empty
  committee), so it can be neither frozen nor sealed. Checkers accept claims from both pinned
  claims contracts.

### 1.4 Main contract v2: the changes

- **The zero secret is refused on every incoming secret.** One helper asserts
  `secret != default<Bytes<32>>`, called at every witness read. The secrets it covers:
  - `localGeneticSecret`, in `liveSelf`;
  - `incomingGeneticSecret`, in rotate, recover and `carryForwardByRecovery`;
  - `recoverySecret`;
  - `licenseSecret`.

  This removes the stated limit in [design.md](design.md) (*Known limits*) that anyone can act
  as a record made from the all-zero secret. There is one test per circuit, and mutation
  testing of each assert.
- **Version and snapshot fields:**
  - `sealed ledger contractVersion: Uint<16>` = 2, as a literal;
  - `sealed ledger predecessor: Bytes<32>` = v1's address
    (`a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347`), as a literal;
  - `sealed ledger snapshot` (two `MerkleTreeDigest` roots, 3.3) from the **constructor's one
    argument**.

  So the deployed source is byte for byte the audited source, and `startsFromConstructor`
  checks the deploy against the published root. A devnet test deploys two v2s with different
  roots and shows every verifier key is identical. `protocolVersion = 1` keeps meaning "hash
  protocol v1" ([design.md](design.md)).
- **New circuits:** `carryForward` and `carryForwardByRecovery`, plus non-membership inside
  `anchor` and every "unused" check (3.3). `discharge` gains a route that releases a v1
  obligation by snapshot path.

---

## 2. What v2 deliberately does not add

The audit scope is v1's reviewed source plus a small, named difference. Every line below would
grow that difference, and none is needed.

- **No new record features or ledger fields** beyond the version, snapshot and carry state. New
  features go in a later version under the same rules.
- **No pending state carries over.** Parent, obligation and transfer proposals still open in v1
  at the freeze never completed. They are void, and the parties propose again in v2. The
  notice says so.
- **No Ledger 9 contract events.** They would change how every verifier reads the chain.
- **No cross-contract calls.** No opcode reads another contract's state
  ([impact opcodes](https://github.com/midnightntwrk/midnight-ledger/blob/fc48053f1fd16201ed260b7f6d5743a77889d335/spec/impact-opcodes.md)).
  midnight-js refuses a call to a pre-fork contract inside a contract-scoped transaction
  (`EraMismatchError`, `'ledger8-call-in-scope'`). And phase 1 calls cannot run the callee's
  witness code
  ([MPS-0021](https://github.com/midnightntwrk/midnight-improvement-proposals/blob/eb626647515e1b66916869052fc8e5d23744004c/mps/mps-0021-phase2-contract-to-contract.md)).
  Every VeilCore holder circuit uses a witness.
- **No Ed25519, P-256 or `sha512` in circuits.**
- **No `kernel.self()` in the identity hash.** It would break "same secret, same identity" across
  versions. Linking an identity across versions is intended, and stated.
- **No `kernel.caller()`.**
- **No change to v1's documented limits:** F4 (a thief fills parent slots), F7 (caps per
  anchor), the revocation window, no list of revoked licences, and a presentation naming its
  issuer. Each is a design change with its own review.
- **No royalties contract, no payment logic, no token moves.** Royalties stay as obligations
  plus the registry.
- **No router contract, and no re-key of v1.**

---

## 3. Carrying an identity forward

### 3.1 What never moves

A v1 record's date is the block time of its `anchor`, or of the `anchorBatch` that covers it,
in v1's history. Nothing is copied. A record names its own contract (SPEC 3.2, 3.6), so a v1
record keeps pointing at v1 and verifies against v1 forever. Batch roots anchored on v1 stay
valid evidence after v1 is sealed. Holders who never carry forward lose nothing.

**Most holders have nothing to carry.** Records are dated by batch. Only a record whose holder
pressed "date stamp" has an on-chain identity in v1.

### 3.2 The freeze (pending the second founder's written approval: decision 3)

**The problem it solves.** v2 cannot read v1. If a carry were checked only by verifiers, anyone
could carry a victim's public `(origin, recovery)` first with their own head, and the rightful
holder would be refused on chain (squatting). The fix is to freeze v1's tables, snapshot them,
and have v2 check the snapshot on chain.

On day 1 of the launch, two committee signatures remove the verifier keys of **every v1 holder
circuit** except three. The 20 keys removed:

- `anchor`, `proveOwnership`, `pairDna`;
- `rotateRecordSecret`, `recoverRecordSecret`, `replaceRecoveryCommitment`;
- `issueLicense`, `countersignLicense`;
- `proposeTransfer`, `approveTransfer`, `withdrawTransfer`;
- `proposeParent`, `confirmParent`, `withdrawParent`;
- `proposeObligation`, `encumberOwnRecord`, `withdrawObligation`, `acceptObligation`,
  `rejectObligation`, `discharge`.

Kept until the seal:

- `proveLicense`: existing licences can still be shown;
- `revokeLicense`: an issuer can always end a licence;
- `sealRevocations`: revocations take effect;
- `anchorBatch`: unauthenticated, with no witness. It dates batches until day 2, after which
  the batch anchorer uses v2's.

A key removal is a maintenance update that the ledger accepts for a pre-fork contract. The
fork kept each contract's authority, committee and counter
([midnight-js era dispatch](https://github.com/midnightntwrk/midnight-js/blob/c8d16679af4a3aac70da91ba8441093399ed84be/packages/contracts/docs/era-dispatch.md#L270-L300)).
midnight-js 5 refuses to build maintenance for a ledger-8 contract after the fork
([migration guide](https://github.com/midnightntwrk/midnight-js/blob/c8d16679af4a3aac70da91ba8441093399ed84be/docs/releases/v5.0.0/migration-guide.md#L1312-L1325)).
Its governance calls also take a single signing key
([unproven-tx.ts](https://github.com/midnightntwrk/midnight-js/blob/c8d16679af4a3aac70da91ba8441093399ed84be/packages/contracts/src/governance/unproven-tx.ts)).
So **every v1 maintenance step goes through `scripts/committee`**, which builds the update with
ledger-v9 types (section 5). midnight-js's maintenance helpers are never called for v1.

Removing a key needs the fee fix in ledger-v9 1.0.1 or later
([Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9), #2375). The committee tool
builds with 1.0.1, but the wallet that pays the fee uses ledger-v9 1.0.0 today
([committee-rehearsal.md](committee-rehearsal.md), *What this rehearsal does not cover*). **The
client patch (wallet on ledger-v9 1.0.2) is a hard prerequisite of the freeze, the undo test
and the seal.**

What follows from the freeze:

- From the last freeze update on, v1's identity, lineage and obligation tables never change
  again, so the snapshot can't go stale.
- A stolen v1 head can no longer license, confirm parents, accept obligations or make control
  proofs in v1. It can still revoke that record's v1 licences. That is vandalism only, and v1
  licences end at the seal anyway.
- v1 licences end at the seal and are re-issued in v2 (decision 5, approved). The site reminds
  issuers who hold active v1 licences.
- Whether 20 removals fit one update under the 1,024-node limit is measured on the devnet. If
  they don't, the freeze is a numbered sequence of updates, each signed on the day.

### 3.3 The snapshot

**Definition.** Let B be the block holding the **last** freeze update. The snapshot is v1's
contract state at the end of block B, identified by B's hash, and built only once B is
finalized. Midnight finalizes with GRANDPA, which "makes a block irreversible"
([consensus](https://github.com/midnightntwrk/midnight-docs/blob/5d93bb072fc6d83f381fb4af96e0b5ed15765588/docs/concepts/network-architecture/consensus.mdx)).

After the freeze, no callable v1 circuit writes the identity, lineage or obligation tables. So
"the end of B" equals "just after the last freeze update", and anyone can read it by block hash
([`queryContractState(address, BlockHashConfig)`](https://github.com/midnightntwrk/midnight-js/blob/c8d16679af4a3aac70da91ba8441093399ed84be/packages/types/src/public-data-provider.ts#L398-L401)).

**Two trees.** Each tree has a fixed depth with headroom (24 to start; step 11 measures the
cost). Leaves are hashed with `persistentHash` under v2 tags. The tree uses the standard
library's Merkle hash (`merkleTreePathRootNoLeafHash`,
[standard library](https://github.com/midnightntwrk/midnight-docs/blob/5d93bb072fc6d83f381fb4af96e0b5ed15765588/docs/compact/standard-library/exports.md)).
The constructor's one argument holds the two roots.

1. **The commitment tree: linked leaves, one per v1 record commitment ever used.** That means
   every key of v1's `originOf`, which covers every origin and every successor. Leaves are
   sorted by commitment, and each leaf names the next commitment in that order:

   ```
   H("veilcore:v2:snap:c", commitment, nextCommitment, origin, isHead, recovery,
     rotationsUsed, recoveriesUsed, hasOffspring, parentCount, parentSetHash,
     openObligationCount)
   ```

   The data fields are filled only on the head leaf. On every other leaf they are zero and
   `isHead` is false. A first sentinel leaf has commitment `0x00…00`, and the last real leaf's
   `nextCommitment` is `0xff…ff`.
2. **The obligation tree: one leaf per open v1 obligation key** (`openObligations`), under the
   tag `veilcore:v2:snap:o`, carrying what v2's `discharge` needs to release that obligation.
   The exact fields are fixed against v1's `discharge` checks before code. This tree is for
   membership only.

**Why linked leaves.** Compact's Merkle trees have no non-membership proof. OpenZeppelin's
library notes this and lives with it
([ShieldedAccessControl](https://github.com/OpenZeppelin/compact-contracts/blob/f85f1a23685c6bbedfc8c2589ae3aa128aff7c46/contracts/src/access/ShieldedAccessControl.compact#L143-L147)).
With a linked leaf, proving `x` is absent is **one** path to the leaf where
`commitment < x < nextCommitment`. This is Aztec's indexed Merkle tree
([docs](https://docs.aztec.network/aztec/concepts/storage/trees/indexed_merkle_tree)). The
earlier plan used two neighbouring leaves with two paths. That design also needs a proof that
the two leaf positions are consecutive, decoded from the path's direction bits, which is a
classic place for bugs, and it costs twice as much on every v2 anchor. Both designs rest on the
same assumption: the published list is sorted and correctly linked. The independent rebuild
checks exactly that (below). Byte strings are compared as unsigned big-endian numbers, split
into two `Uint<128>` halves. The tests cover equal halves and the two sentinels.

**How v2 uses the snapshot:**

1. **`carryForward(path)`.** The caller proves:
   - they know the secret of head `h`;
   - `h`'s leaf has `isHead` set;
   - the leaf is under the commitment root.

   v2 then creates identity `o` with head `h` and recovery `r` from the leaf. It also installs
   the rotation and recovery counters, `hasOffspring`, the parent count, the parent-set hash and
   the open-obligation count. Each `o` can be carried once (`carriedOf`).
2. **`carryForwardByRecovery(o, newHead, newRecovery, path)`.** The caller proves the recovery
   secret of the head leaf's `r`. The circuit installs a new head and a new recovery commitment
   (the theft case) and counts one recovery against the carried counter. `newHead` must pass
   non-membership, and the incoming secret behind it is checked non-zero (1.4). A thief who carried first with a
   stolen head secret doesn't lock the rightful holder out: the leaf fixed `r`, so the holder
   recovers in v2.
3. **Non-membership.** v2's `anchor` and every "unused" check (rotation and recovery targets,
   and carry-by-recovery's new head) prove the new commitment is not in the commitment tree.
   So a leaked v1 secret can't be re-anchored in v2, and nobody can rotate or recover into a v1
   commitment. A v1 holder who tries to anchor is told to carry forward instead.

**Lineage and caps.** `proposeParent`, `confirmParent`, the `MAX_PARENTS` check and the
`hasOffspring` check read the installed values. They refuse until both records involved have
been carried forward. An uncarried v1 identity is refused as a v2 party. Obligation caps work
the same way. This keeps v1's no-cycle and cap rules across versions.

**Transcript binding.** Every value a carry installs (`o`, `newHead`, `newRecovery`) is a
circuit argument bound into the proven transcript. So a copy of a pending carry transaction
can't be changed to install different values. A test shows a tampered copy is refused, and the
audit pack states it.

**Independent rebuild.** The builder is a reproducible script, and it works two independent
ways. Both must give the same leaves:

- **from state:** v1's state at B's hash, decoded with ledger-v9 types;
- **by replay:** every v1 transaction from the deploy to B. Before 6 November 2026 these are
  decoded with `@midnightntwrk/ledger-v8` at a fixed version; after it they are Ledger 9
  transactions, decoded with ledger-v9. "Transactions built in the ledger 8 format don't decode
  on ledger 9" ([Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)).

VeilCore publishes all of these in the deployment record, the registry and a file in the SDK
release:

- the full leaf lists;
- the totals (identities, commitments, open obligations);
- B's header;
- the raw state bytes at B.

`npm run verify:deployment`, the SDK and the site each rebuild the roots **from the chain**,
not from our list, and refuse a v2 whose snapshot differs. A second machine rebuilds the
snapshot on launch day before the deploy. That is a go/no-go item. The rebuild fails on any of
these:

- a duplicate origin;
- a head leaf whose `(o, h, r)` doesn't match the chain;
- an extra or missing leaf;
- a leaf whose `nextCommitment` isn't the next leaf's commitment.

Proposed history pruning
([MPS-0032](https://github.com/midnightntwrk/midnight-improvement-proposals/blob/eb626647515e1b66916869052fc8e5d23744004c/mps/mps-0032-storage-management.md),
status Proposed) could one day mean rebuilding from chain needs an archival node. Publishing B's
raw state, and VeilCore's own archive of v1 transactions, covers that.

**v1's maintenance history.** The snapshot inherits anything v1's key ever did. v1 has had one
live key since 8 October 2026, at counter 16 on 13 November
([deployments/mainnet.json](../deployments/mainnet.json)). A circuit inserted, used and removed
before the freeze could have rewritten `headOf` or `recoveryOf`. So the builder walks v1's
maintenance history from the deploy to B, and refuses unless both of these hold:

- every key ever present matches [fingerprints.md](fingerprints.md);
- every update is one the deployment records list.

A mismatch is a launch no-go. The founders then decide what happens (section 7).

**Spam.** During the 14-day notice the fee sponsor rate-limits sponsored `anchor` calls with a
per-day cap. The tree depth gives at least 100 times headroom over the identity count at the
notice.

**Privacy.** The browser downloads the whole leaf list (or the SDK file), rebuilds the roots,
checks them against v2's on-chain snapshot, and builds its own path. No request ever names an
identity. `verify.html` does the same.

### 3.4 Starting a carry

- **Only the holder's button starts it.** The carry happens as part of the holder's next
  pressed chain action, in the same flow, with one line under Technical details. Opening a
  page never sends anything.
- **A carry by recovery forces a backup.** It installs a new recovery secret, so the flow ends
  in the same "save and check your backup" step that device-only documents use, and the old
  backup is marked out of date.
- An old backup restored later finds the v2 identity by its origin. A backup holding a
  recovery secret that has already been used says so in plain words.

### 3.5 Verifier rule 10 (reading two versions)

- **Pinned successor only.** A verifier accepts the v2 address in its pinned list, never a
  contract found by walking `predecessor`. Anyone can deploy a clone with the same
  fingerprints, `predecessor` and snapshot; the pin is what makes ours ours. The pin ships in a
  **signed SDK release** (npm provenance plus a signed git tag) and in the VeilCore deployment
  file in Midnight's MIP repository, never from the registry alone.
- **Ordering.** "After the carry" means after the carry's `(block, transaction index)`. Any v1
  action in the carry's own block counts as after.
- **Revocations always count.** A v1 `revokeLicense` and `sealRevocations` are honoured
  whatever the issuer's carry block. Withdrawals are frozen (3.2), so they need no exemption.
- Otherwise, a verifier reads one identity across both versions: parent edges and obligations
  from v1, plus everything made in v2. It ignores that identity's v1 holder actions after its
  carry. After the freeze those actions are impossible anyway.

### 3.6 Every checker reads both versions

Today the site's check page compares a batch transaction against one anchor contract and
decodes with v1's `ledger()` only. Once the anchorer moves to v2, that would show either the
new batches or every old link and printed label as **failed**.

So every checker holds **a pinned list** (v1 main, v2 main, v1 claims, v2 claims). It **picks
the decoder by which pinned contract the transaction calls**, never by what the registry
names. The checkers are:

- the site;
- `@veilcore/contracts` (the SDK), including every default path that today takes the newest
  `MAINNET_CONTRACTS` entry;
- the CLI;
- `verify.html` and `verify.py`;
- the Rust checker;
- the partner kit;
- `api/src/deploy-guard.ts`.

v1 is decoded with `@midnightntwrk/ledger-v8` at a fixed version, not with midnight-js's
retained era, which has no published end date. `@veilcore/contracts@0.2.0` is never
unpublished: bundles already handed out pin it and stay valid for v1.

**Integrator notice,** sent **before the audit freeze**: a checker pinned to v1 only will show
v2 batches as failed, so update to the release with the pinned list. The notice goes on the
notice page, in the partner-kit release notes and in the deployment record.

### 3.7 Sealing v1

At least 12 months after v2 opens (decision 5, approved), with two committee signatures and a
14-day notice, through `scripts/committee`:

1. remove the remaining v1 keys (`proveLicense`, `revokeLicense`, `sealRevocations`,
   `anchorBatch`) with `remove-key`;
2. `retire` (an empty committee, which no signature set can satisfy;
   [deploy and operate](https://docs.midnight.network/guides/deploy-and-operate)).

`retireMaintenanceAuthorityProvably` in `api/src/maintenance.ts` builds a Ledger 8 update and
is refused after the fork, so it is not used.

**Carrying forward keeps working after the seal, permanently,** because it checks v2's
snapshot, not v1. Nobody who missed the window is locked out.

---

## 4. Deploying v2: the key window

- **Preferred:** v2 is deployed with the 2-of-3 committee already in the deploy transaction
  (counter 0). Keys are then added in a few updates, each signed by two holders on the day.
  We adopt this if the devnet shows it works.
- **Otherwise:** a temporary deploy key generated on the maintainer's Mac and kept
  age-encrypted on disk until the handover to the committee is confirmed, then destroyed. On
  disk, not in memory only, so a crash part way through can't strand circuits without keys.
- `verify:deployment` refuses a v2 whose history before the committee block holds any of
  these:
  - **any contract call**;
  - any key removal;
  - any inserted key not in `fingerprints-v2.md`.

  So a rogue circuit inserted, used and removed in the window is caught.
- **Never pre-sign** freeze, undo or seal updates. A signed update is usable by whoever holds it
  until the counter moves past it, because the signed data covers only the address, the
  instructions and the counter (`scripts/committee/core.mjs`). Holders sign on the day, after
  the go/no-go. "Pre-approved undo" (decision 4) means approved in the policy text, not signed
  in advance.
- **v2's key insertion path:** `api`'s `addMissingCircuitKeys` refuses on Ledger 9. v2 uses
  either midnight-js's current-era helpers with the 0.36.1 artifact (allowed for a ledger-9
  contract, but single-key) or the committee tool with the `V4` slot (1.2). The devnet decides.

## 5. The committee gate

- **Who holds the v1 keys (pending the second founder's written approval: decision 2).**
  Three keys, any two of which must sign. The third holder is a named outside person if one
  can be named within two weeks. Otherwise one founder holds it for now, it is said openly, and
  it moves to an outside person later. Two holders can do that at any time. Installing it on v1
  comes before every other v1 step here
  ([maintenance-committee.md](maintenance-committee.md),
  [committee-rehearsal.md](committee-rehearsal.md)).
- **Named commands.** The committee tool gets a `freeze` command (with the fixed list of 20
  circuits from 3.2), an `unfreeze` command (re-inserting exactly those 20 v1 keys, for the
  undo), and a `seal` command.
- **The gate.** All three commands, and every mainnet request other than the install, **refuse
  unless the contract shows 3 keys and threshold 2**. They also refuse a counter other than the
  one written in the signed go/no-go.
- **Tests:** a single-key contract, a 3-of-3 committee and a 2-of-2 committee are each refused.
  `unfreeze` refuses any key that isn't in [fingerprints.md](fingerprints.md).
- **The undo (pending the second founder's written approval: decision 4).** If v2 is not
  verified 12 hours after the freeze, the committee runs `unfreeze` with no new 14-day wait,
  and any partial v2 is retired. This is tested first on the devnet: the 20 frozen keys are
  re-inserted, and a v1 `anchor` proves and lands with an old-format proof.

---

## 6. Questions answered on the devnet before code is frozen

1. Is a key removal, and a re-insert of the old-format keys, on a pre-fork contract, built by
   our ledger-v9 tool, accepted by a real node?
2. Do 0.36.1 keys go in the `V4` slot (as the ledger source says), and does the committee tool
   insert them there?
3. Can a ledger-9 deploy carry a committee at counter 0? How many key inserts or removals fit
   one update under the 1,024-node limit?
4. Which JavaScript function reproduces `merkleTreePathRootNoLeafHash` off chain, so the
   builder's root equals the circuit's? (Tested in the simulator against the compiled circuit.)
5. Are verifier keys identical for two different snapshot arguments?
6. Do keys rebuild byte for byte on a second machine?
7. What do two v2 anchors cost with one non-membership path, at `min_block_price` 10?

## 7. Decisions and their status

| # | Decision | Status |
|---|---|---|
| 1 | Build v2 on a realistic timeline (launch around May to June 2027) | Approved |
| 2 | Third key holder; install the v1 committee now | **Pending the second founder's written approval** |
| 3 | Freeze every v1 holder circuit except the three licence ones on launch day | **Pending the second founder's written approval** |
| 4 | A pre-approved undo of the freeze if v2 isn't verified within 12 hours | **Pending the second founder's written approval** |
| 5 | A window of at least 12 months, then seal v1 by removing every key; licences re-issued in v2 | Approved |
| 6 | v2 code in a new `contract-v2/` workspace; `contract/` is never touched | Approved (the written OK goes in the first code PR) |
| 7 | Keep our own Schnorr port, with the in-circuit range check | Approved |
| 8 | An outside security review before any mainnet deploy | Approved (budget still to set) |

Decisions 2, 3 and 4 change [maintenance-policy.md](maintenance-policy.md), which says
changes need both founders in writing, and they are announced 14 days ahead.

Still to decide (raised by this design):

- What happens if the v1 maintenance-history check (3.3) fails at the launch. The
  recommendation: a no-go, then a choice between an earlier snapshot height and a delay.
- Who runs the second machine for the launch-day rebuild.

## 8. Prior art, and what was borrowed

| Source | What we took |
|---|---|
| Aztec indexed Merkle tree ([docs](https://docs.aztec.network/aztec/concepts/storage/trees/indexed_merkle_tree)) | Linked leaves: non-membership with one path (3.3). |
| Aztec application state migration, Jan 2026 ([request](https://forum.aztec.network/t/request-for-grant-proposals-application-state-migration/8298), [Cardinal Cryptography](https://forum.aztec.network/t/secure-turnstile-application-state-migration-pattern-cardinal-cryptography/8414), [Andee Labs](https://forum.aztec.network/t/request-for-grant-proposals-application-state-migration-using-direct-proof-migration/8403)) | A safe snapshot height when the old state may be tainted (the v1 history check); one claim per identity; no central trusted party; claims bound to their arguments; proving it on a local network first. |
| Uniswap merkle distributor ([repo](https://github.com/Uniswap/merkle-distributor/tree/25a79e8ec8c22076a735b1a675b961c8184e7931)) | The root as an immutable constructor argument; a published list plus a script anyone runs to rebuild the root. We did not take its deadline: VeilCore has nothing to sweep, and the carry never closes. |
| OpenZeppelin merkle-tree ([README](https://github.com/OpenZeppelin/merkle-tree/blob/98ff55dc7b6004a6e57ca0cb256cc0d08ecb6096/README.md)) | Sorted leaves; leaves hashed apart from inner nodes (tagged leaf hash, fixed depth). Whether the leaf hash and Midnight's node hash can collide is an auditor question. |
| Zcash Sprout to Sapling ([migration](https://zcash.readthedocs.io/en/latest/rtd_pages/sapling_turnstile.html)) and the 2026 Sprout freeze ([report](https://cointelegraph.com/news/zcash-nu7-upgrade-sprout-funds-unspendable)) | Published totals, so anyone can check the snapshot adds up. And the lesson that an old system frozen with no way out strands people who missed every notice. So the carry stays open after the seal. |
| MakerDAO single-collateral Dai shutdown ([report](https://www.theblock.co/news/markets/2020-05-12-makerdao-shuts-down-the-single-collateral-dai-system-64964)) and Uniswap v2 to v3 ([guide](https://support.uniswap.org/hc/en-us/articles/7423351004173-How-to-migrate-liquidity-from-Uniswap-v2-to-v3)) | Moves started only by the holder; a long window; a path that stays open after the old system closes. |

## 9. Sources

Midnight, read 23 November 2026:

- Ledger 9 upgrade notes: https://docs.midnight.network/relnotes/ledger-9
- Support matrix: https://docs.midnight.network/relnotes/support-matrix
- Deploy and operate: https://docs.midnight.network/guides/deploy-and-operate
- Updatability: https://docs.midnight.network/guides/updatability
- midnight-js `c8d1667`: migration guide (*If you keep ledger 8 contracts*), era dispatch,
  governance, public data provider; links inline.
- midnight-ledger `fc48053`: `ledger/src/structure.rs` (key versions, `SingleUpdate`),
  `spec/impact-opcodes.md`.
- Compact compiler `CHANGELOG.md` and `standard-library.compact` at LFDT-Minokawa/compact
  `3bab3b9`; releases at https://github.com/midnightntwrk/compact/releases (latest 0.36.1).
- midnight-examples `953f864` (zk-loan `schnorr.compact`).
- midnight-docs `5d93bb0` (standard library exports, consensus).
- Midnight improvement proposals `eb62664` (MPS-0021, MPS-0032).
- OpenZeppelin compact-contracts `f85f1a2`.

VeilCore: [upgrades.md](upgrades.md), [design.md](design.md),
[maintenance-policy.md](maintenance-policy.md),
[maintenance-committee.md](maintenance-committee.md),
[committee-rehearsal.md](committee-rehearsal.md), [fingerprints.md](fingerprints.md),
`deployments/mainnet.json`, `scripts/committee/core.mjs`, `contract/src/veilcore.compact`.
