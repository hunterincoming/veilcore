# Upgrades: how VeilCore keeps improving without touching anyone's evidence

**Status: PROPOSAL, 9 October 2026. Not approved.** It changes the approved maintenance
policy for the main contract (see *Decisions for the founders*), so nothing here is in force
until both founders approve it. Nothing in this document has been built or tested on a
network.

**Update, 14 November 2026.** Midnight mainnet moved to Ledger 9 on 6 November 2026 (preview
relaunched on 7 November, preprod upgraded on 9 November:
docs.midnight.network/relnotes/ledger-9). The rest of this page is as written on 9 October,
before that date was known: "before the fork" and "after the fork" below mean before and after
6 November on mainnet. What was done for the fork is in
[mainnet-sponsor.md](mainnet-sponsor.md), section 8, with a Ledger 9 known issue about fees
paid with one DUST spend and how the sponsor stands.

The 2-of-3 committee was not installed before the fork, so "before the fork" below did not all
happen: the main contract still has its single maintenance key, the network still accepts that
key, and its counter was 16 on 13 November 2026. A local run against Midnight's Ledger 9 code
(ledger 9.1.0.1) accepted a replace-authority from the single key to a 3-key, threshold-2
committee on a contract shaped like ours, with no recompile; it has not yet been shown on a
node (`docs/maintenance-committee.md`, `docs/committee-rehearsal.md`). "Frozen" in this
document means a version's rules are not changed; it does not mean the contract cannot be
changed while a key exists.

**Corrections, 23 November 2026.** The design of version 2 is now in
[contract-v2.md](contract-v2.md). It is a design only: nothing is built or live. These
corrections apply to the 9 October text below. Each one is also marked where it occurs.

1. **There is no royalties contract.** No `.compact` file for one exists on any branch.
   Royalties are v1's obligation circuits plus the registry ([agreements-live.md](agreements-live.md):
   "no contract change"). Version 2 adds no royalties contract.
2. **Preprod can't rehearse maintenance.** Preprod was upgraded in place on 9 November. Its
   v1 practice contract can still be called, but that contract's authority is retired, so no
   maintenance step (a committee install, a seal) can be rehearsed on it. Nothing new can be
   deployed from Compact 0.31.1 output on a Ledger 9 network. The
   [Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9) say a new contract can't be
   deployed from ledger 8 artifacts, and midnight-js refuses it with
   `'ledger8-deploy-on-ledger9-network'`
   ([migration guide](https://github.com/midnightntwrk/midnight-js/blob/c8d16679af4a3aac70da91ba8441093399ed84be/docs/releases/v5.0.0/migration-guide.md#L1312-L1325)). Maintenance is rehearsed on a local devnet forked
   from Ledger 8 to Ledger 9 ([committee-rehearsal.md](committee-rehearsal.md), and
   contract-v2.md section 8). Preprod and the test site are used for v2's own flow, and
   checkers there must name the contract version explicitly (contract-v2.md, 3.2).
3. **The carry-forward sketch below can be squatted.** A holder's `o` and `r` are public in
   v1. So anyone could carry an identity forward first with their own head, and the rightful
   holder's carry would then be refused on chain. Verifiers would ignore the forgery, but the
   holder would still be blocked. **For v2 there is no carry at all.** Every v1 record so far
   is the team's own testing (confirmed 23 November 2026), so v2 is
   a fresh start next to an untouched v1. A v1 record keeps its date on v1 forever, and the
   same commitment in v1 and v2 is two records with two dates (contract-v2.md, sections 0 and
   3). The carry design that fixes the squatting (a freeze, an on-chain snapshot, non-membership
   checks) is kept for v3, the first upgrade with outside users, in contract-v2.md, Appendix A.
4. **The seal does not use `retireMaintenanceAuthorityProvably`.** That function builds a
   Ledger 8 update, which is refused after the fork. midnight-js 5 also refuses maintenance on
   a pre-fork contract, and it signs with one key only. The v1 seal goes through
   `scripts/committee` with the existing key, and it is **`retire` only**: v1's keys stay in
   place, so checkers keep accepting v1's state (contract-v2.md, section 6).
5. **Removing a key needs the client patch first.** The network rejects a key removal whose
   fee was worked out by ledger-v9 1.0.0 (#2375, fixed from 1.0.1:
   [Ledger 9 notes](https://docs.midnight.network/relnotes/ledger-9)). The committee tool
   builds with 1.0.1, but the wallet that pays the fee still uses 1.0.0, so any key removal
   waits for the client patch (wallet on ledger-v9 1.0.2). The v1 seal removes no keys:
   `retire` is a replace-authority, which costs the same in both, so the seal doesn't need
   the patch. That is our inference: #2375 is reported for key removal only, and we expect a
   replace-authority to be unaffected. The devnet tests it with the wallet on ledger-v9 1.0.0
   (contract-v2.md, section 8, question 1). This also replaces *Sealing version 1* step 1
   below.

Also out of date: in *Known* 6, the quoted sentences about the retained era's "sunset" and
"removal in the next major" are no longer in the current midnight-js migration guide (checked
at `c8d1667`, 23 November 2026). No removal date is published. Plan as if it can go at the
next major.

---

## The one-paragraph version

Say this out loud:

> "We never rewrite the record book. We add new volumes. Each record stays in the contract
> it was made in, with its date, forever. That date is in Midnight's transaction history,
> which nobody can edit, including us. A new version is a new contract next to the old one.
> Nothing is moved. We then retire the old contract's key, so nobody can change its rules
> again. So VeilCore keeps getting better, and evidence of prior possession never depends on
> trusting us."

*Rewritten 23 November 2026 for the fresh start (correction 3). The 9 October version said
holders carry records into the new version and that every key is removed at the seal. Neither
holds for v2.*

## The short version

1. **The past is already safe.** The date a record was anchored is the block time of its
   `anchor` transaction. That is chain history. No key, ours or anyone's, can change it.
2. **The present is what a key can change.** Our maintenance key can add circuits, and a
   new circuit can rewrite what the contract says *now*: who controls an identity, which
   licences exist, which parent edges stand. That is the real risk, and it is why we should
   not keep one contract we change forever.
3. **So: versions, not edits.** Each contract version keeps its rules. New features go in
   a new version. The key on an old version is used only to keep it working or to seal it,
   never to add new rules.
4. **Midnight lets us do this.** Old contracts keep working after Midnight's next network
   upgrade (ledger 9), and Midnight has announced no end date for them. What Midnight does
   *not* give us is a way for a new contract to read an old one, so the link between
   versions is checked by our verifier software, against chain data anyone can read.
5. **Now (rewritten 23 November 2026):** build version 2 on the new toolchain as a fresh
   start. By the maintainer's decision of 23 November 2026, v2 is deployed with a temporary
   single key, which is handed to a 2-of-3 committee once the third key holder is named (the
   handover is a key use, so it comes at least 14 days after its notice is published). v1
   records stay on v1 with their dates, and nothing is carried. After v2 is public and audited, retire v1's single key, so
   nobody can change v1 again ([contract-v2.md](contract-v2.md)). *The 9 October text put a
   committee on v1 before the fork and opened a carry-forward; neither applies now.*

---

## What Midnight actually allows

The question: after the ledger v8 to v9 fork, can our live contract (built with Compact
0.31.1 for ledger 8) still be maintained, and can a new contract call or read it?

### Known (read in Midnight's own code and docs)

**1. At the ledger level, the maintenance authority survives the fork.**
The v8 to v9 state translation copies each contract's authority across: the same keys
(wrapped as Schnorr keys), the same threshold, the same counter. Old circuit keys go into a
slot ledger 9 keeps for old-format keys.
(`midnight-ledger` commit `da96e33`, `v8-to-v9-state-translation/src/lib.rs`: the table at
lines 42-44 and `ContractStateTl::finalize`, lines 498-531, with `committee_v9 = ... Schnorr(vk)`,
`threshold: source.maintenance_authority.threshold`, `counter: source.maintenance_authority.counter`.)

**2. Ledger 9 applies maintenance updates to any contract, with no check of which era it
came from.** The code that applies a maintenance update looks up the contract, checks the
counter and the committee signatures, and applies the changes. Nothing in it asks whether
the contract was deployed before the fork.
(`midnight-ledger` tag `crate-ledger-9.1.0.0-rc.6`, `ledger/src/semantics.rs` from line 1549,
`ContractAction::Maintain`; signature and threshold checks in `ledger/src/verify.rs` from
line 1826, `MaintenanceUpdate::well_formed`.)

**3. Ledger 9 still accepts old-format circuit keys and old-format proofs.** A key insert
can carry either an old key (`V3`, "zk-stdlib v1", what Compact 0.31.1 produces) or a new one
(`V4`). A proof is checked against the matching key.
(`ledger/src/structure.rs` line 2859, `ContractOperationVersionedVerifierKey`; `proof_verify`
from line 446, which checks a `V2` proof against the old key and a `V3` proof against the new
one; `ledger/src/verify.rs` line 1919, which requires an old-format transcript when an old key
is present.)

**4. What a maintenance update can do, and nothing else.** Replace the authority, remove a
circuit key, insert a circuit key (only into an empty slot: replacing means remove, then
insert), and in ledger 9 also insert or remove a circuit's IR. There is no operation that
writes contract data, adds a ledger field, or delays an update. An update takes effect in
the block it lands in.
(`ledger/src/structure.rs` lines 2952-2966, `enum SingleUpdate`; `ledger/src/semantics.rs`
from line 1549.)

**5. midnight-js 5 does not offer maintenance for pre-fork contracts.** "The retained handle
has no maintenance interfaces (the retained era has no governance arm)." The library's own
source says the same: "the retained era has no governance arm at all, so there is nothing for
them to reach."
(`midnight-js` at `8edbd94`, `docs/releases/v5.0.0/migration-guide.md` line 491;
`packages/contracts/src/ledger8-contract.ts` line 734.)

So, on the founder's question: **the governance arm is missing from midnight-js 5, not
from the ledger code we read.** VeilCore already builds maintenance updates itself without
midnight-js's high-level calls (`api/src/maintenance.ts`, the provable retirement, built
with ledger-v8 types). The same can in principle be built with ledger-v9 types after the
fork. Nobody has yet shown that working on a forked network (see *Assumed*).

**6. Old contracts keep working after the fork, with no end date announced.** "Contracts
compiled with the retained toolchain remain transactable on the network indefinitely;
upstream has not announced a sunset." But midnight-js's own support for them "is scheduled
for removal in the next major after the window closes."
(`migration-guide.md` lines 559-566.) So the network keeps them; the library will drop them
in a later version (no date given).

**7. Nothing new can be deployed with the old toolchain.** "A retained artifact cannot be
deployed at all, only called." A deploy of an old build would leave "an empty committee with
a threshold of one — which nothing can ever satisfy", so no circuit key could ever be added.
(`migration-guide.md` lines 336-338 and 412-421.) VeilCore deploys its 24 circuits in
fragments and adds most keys afterwards, so an old-toolchain deploy after the fork is
impossible for us in any case.

**8. A contract cannot read another contract's data.** The on-chain virtual machine has no
instruction that reads another contract's state; it only works on the contract's own state.
(`midnight-ledger` `spec/impact-opcodes.md`, the opcode table at lines 117-127.) Contracts can
*call* each other from ledger 9, but:
- midnight-js 5 refuses to put a call to a pre-fork contract into a multi-call transaction
  ("the retained era cannot join a scoped transaction", `MixedEraScopeError`;
  `packages/contracts/src/ledger8-contract.ts` line 716, `packages/contracts/src/errors.ts`
  line 991);
- the first phase of contract-to-contract calls does not support the called contract's
  witness code (MPS-0021: "What Phase 1 cannot do is support implementations using different
  circuit code, or any witness code"). Every VeilCore circuit that acts for a holder uses the
  holder's secret as a witness.

  The ledger itself links calls by address, circuit and a commitment, and checks each call
  against its own key (`ledger/src/verify.rs` from line 980; `spec/contracts.md` lines
  263-282). We found no era check there. But no tooling we can use builds such a call
  today.

**So a new VeilCore contract can neither read nor call version 1 to check a record.** The
link between versions has to be checked by verifier software, against chain data.

**9. No fork date was announced on 9 October; mainnet moved to Ledger 9 on 6 November 2026.**
On 9 October Midnight's compatibility matrix listed mainnet on ledger 8,
Compact 0.31.1, midnight-js 4.1.1, said Compact 0.34 and 0.35 target ledger 9, and gave no
date (docs.midnight.network/relnotes/support-matrix). The midnight-js guide gave none either
and says to adopt version 5 "before the fork, with enough lead time to ship it to your users"
(line 340). The wallet's ledger-9 pull request mentions a preset "fork schedule" but shows no
date (github.com/midnightntwrk/midnight-wallet/pull/811). Nothing we found sets an end date for
pre-fork contracts on the network.

**10. Midnight's guide expects keys to be replaced after a compiler upgrade.** "After a
compiler upgrade, this is how the freshly compiled key replaces the stranded one." And: "A
deployed contract's circuits are bound to the proof system that compiled them."
(docs.midnight.network/guides/deploy-and-operate.)

### Assumed, and not yet tested

- **That a maintenance update we build ourselves with ledger-v9 types is accepted for our
  contract after the fork.** The ledger code says yes. Nobody has run it.
- **That our live contract, re-compiled from the same source with Compact 0.35, would work
  against its existing data** if its keys were swapped to the new format. The data is copied
  across the fork unchanged (`ChargedState` "recast", translation lines 520-527), but whether
  0.35 lays out the same source's data identically is unknown.
- **That our verifier (`contract/src/verify.ts`, `api/src/state-check.ts`) still reads v1
  state and pre-fork transactions after the fork.** midnight-js 5 reads pre-fork records on a
  separate path, and `getStates` refuses a pre-fork state envelope (`migration-guide.md` lines
  490-496).
- **That the code we read is what mainnet will run.** The node pins ledger 9.1 rc.5, the
  ledger is at rc.6, and the state translation is unpublished, on a branch, pinned by commit
  (node `Cargo.toml` lines 114-119). Release candidates can change.

### Unknown (questions for Midnight)

Whether "no governance arm" is only the library's choice or Midnight's policy; whether
Midnight will ever stop accepting old-format proofs; the fork date and notice (answered since:
mainnet forked on 6 November 2026); how pre-fork
transactions stay decodable after midnight-js drops the retained era (we have already been
bitten once: indexer #1605, decoding of old state broke after the 28 September upgrade,
`docs/mainnet-completeness.md`). The exact questions are below.

---

## Why "one contract we keep upgrading forever" does not work

It sounds simplest. It fails on three counts:

1. **It cannot add what most new features need.** A maintenance update can change circuits
   but not the contract's data layout (Known 4). New kinds of records, new fields, new
   proofs about data the contract does not hold: those need a new contract anyway.
2. **It keeps a live power to rewrite the present, forever.** Any new circuit can write any
   of the contract's data. So as long as the key exists, someone holding it could take over
   any identity, insert licences, or add and remove parent edges (`docs/design.md`, *Trust
   model*). Our verifier checks would notice, because they compare every circuit key with the
   pinned build and report the authority's counter; they cannot stop it. A lab, a regulator or
   a court then has to trust our custody for as long as the contract lives. That weakens
   prior-possession evidence exactly where it needs to be strongest.
3. **It leans on tooling Midnight has said it will not keep.** After the fork our contract is
   a pre-fork contract. midnight-js 5 offers no maintenance for it, and later midnight-js
   versions drop pre-fork contracts altogether (Known 5, 6). Each future fork would mean using
   the sensitive key again, with our own code, on a path nobody else exercises.

## The four options

| | What it is | Survives Midnight's forks | Adds new features | Evidence depends on trusting us |
|---|---|---|---|---|
| **(a) One upgradable contract** | Keep v1 and change its circuits whenever needed | At the ledger, yes; in the tooling, only with our own code each time | Only features that fit the existing data | **Yes, forever** |
| **(b) Versions** | Each version keeps its rules; new features go in a new version; holders carry records forward with the same secret; verifiers check the link against the old version | Yes: old versions keep working as pre-fork contracts; new versions use the current toolchain | Yes, anything | Only until the old version is sealed |
| **(c) Router contract** | A small contract that names the current version | Adds one more contract to carry through every fork | No: it routes nothing on chain, because contracts cannot read each other (Known 8) | Yes: whoever controls the pointer can point it elsewhere |
| **(d) Limited upgrade power** | Allow only "add a new circuit", never "change history" | n/a | n/a | **Cannot be enforced by Midnight** |

On **(d)**: Midnight has no per-circuit or per-field permission. Inserting a key for a *new*
circuit name is exactly as powerful as replacing an old one, because the new circuit can write
any of the contract's data (Known 4). Midnight also has no delay on maintenance updates: one
lands and takes effect in the same block. What *can* be done is a policy plus checks:
announce every use in advance, have an independent committee member who refuses to sign
anything not announced, and have verifiers refuse any circuit key that does not match a
published build. That makes misuse visible and harder. It does not make it impossible. We
use that in the recommendation, but we do not build the evidence model on it.

On **(c)**: a router is a pointer someone controls. Verifiers already pin contract addresses
(`api/src/deploy-guard.ts`), and that is safer than following a pointer. We get the same
discovery without a new contract: each version names its predecessor in its own starting
state (see below), and each new version is announced in a new revision of the deployment
record on Midnight's public repository.

## Recommendation: frozen versions, carried forward (option b)

### The rules

1. **A version's rules never change after launch.** For v1 (live since 8 October 2026) the
   maintenance key may be used for three things only:
   - **keep it working**: if Midnight ever stops accepting v1's proof format, swap each
     circuit's key for one compiled *from the same published source* by a newer compiler.
     Anyone can rebuild that source and check the keys match;
   - **switch off a broken circuit** (remove its key) for a security problem;
   - **seal it** (below).

   Never to add a circuit, and never to change what a circuit does. A new rule is a new
   version.
2. **New features ship as a new version** (v2, v3...), built with the current Compact
   toolchain. Each version stores its predecessor's address, and its own protocol version, in
   its starting state. Our client already checks that a deploy carries exactly the starting
   state the constructor produces (`startsFromConstructor`), so that back-link cannot be
   faked. Nothing points forward, so nothing can be redirected later. *Corrected 23 November 2026:*
   verifiers never follow that back-link. It records provenance only, and a verifier trusts
   only its pinned list of contracts (rule 10, [contract-v2.md](contract-v2.md), 3.1).
3. **Evidence never moves.** A record's anchor date stays where it was made: the block time
   of its `anchor` transaction in v1's history. A new version records only "this identity
   came from v1", never a copied date. Verifiers read the date from v1.
4. **A new version is shipped when it is worth moving for, not every time Midnight
   upgrades.** Old versions keep working through Midnight's forks (Known 6). A fork alone
   is not a reason to migrate anyone.

### How a holder carries a record forward

> **Corrected 23 November 2026:** the sketch in this section can be squatted (correction 3
> above). v2 has no carry (a fresh start). The design that fixes the squatting is kept for v3
> in [contract-v2.md](contract-v2.md), Appendix A.

The holder already has the secret behind their v1 record. Version 2 uses the same commitment
function for carried records (`commit(secret)` with the tag `veilcore:v1:commit`,
`docs/design.md`, *Hashes*), so the same secret proves the same record in both.

- **Carry-forward** (a v2 circuit): the holder proves they know the secret of commitment
  `h`, and declares the v1 identity `o` that `h` is the head of, and that identity's recovery
  commitment `r`. Version 2 creates the identity **under the same value `o`**, so lineage and
  obligations keyed by identity line up across versions without any mapping table. Each v1
  identity can be carried forward once.
- **What version 2 cannot check, the verifier does.** Version 2 cannot read v1, so a
  carry-forward is accepted by a verifier only if, in v1's state at that block, `h` was the
  head of `o` and `r` was its recovery commitment (`headOf`, `recoveryOf`). Otherwise it is
  ignored. This is a new verifier rule alongside rules 1 to 8.
- **Theft.** A thief holding a stolen v1 secret could carry the identity forward first. They
  cannot change its recovery commitment without the recovery secret, and the verifier
  checks `r` against v1. Version 2 accepts recovery with the same recovery secret, so the
  rightful holder takes the identity back in v2 exactly as in v1.
- **A holder who lost the record secret** can carry forward with the recovery secret
  instead.
- **After carrying forward**, the identity acts in v2. A verifier ignores that identity's v1
  actions after its carry-forward block.
- **Lineage and obligations are not copied.** A verifier reads both versions for the same
  identity: parent edges and obligations from v1, plus anything made in v2. A beneficiary
  can release a v1 obligation through a v2 circuit, once v1 is sealed.
- **Licences** are the licensee's secrets and live in v1's licence tree, which cannot move.
  The simplest rule is that issuers re-issue in v2, and v1's history shows the earlier
  grant. (Founders' decision, below.)

This is a sketch. Before anything is built it needs its own design document and the same
adversarial review every circuit here has had. Known open points: what exactly counts as
"after the carry-forward" for a parent edge proposed in v1 and confirmed in v2, obligations
a thief accepted before recovery, and the verifier's cost of reading two contracts.

### Sealing version 1

When version 2 has been live for a long, announced window (founders to set; we suggest at
least 12 months), the key is used one last time, in public, with the 14-day notice:

1. remove every v1 circuit key, so no transaction can change v1 again;
2. replace the authority with an empty committee.

*Corrected 23 November 2026:* the v1 seal is step 2 only (`retire`, through
`scripts/committee` with the existing key, after v2 is public and audited, with the 14-day
notice), not `retireMaintenanceAuthorityProvably`, which builds a Ledger 8 update that is
refused after the fork. Step 1 is dropped: checkers refuse a v1 state with keys missing, and
key removal needs the client patch (corrections 4 and 5 above). After `retire`, v1's circuits
stay callable but can never change. There is no carry window (correction 3).

Then v1's final state is fixed forever, and anyone can see that on chain. Carrying forward
still works after sealing, because it is checked against that final state, so nobody who
missed the window is locked out. From then on, no one, including VeilCore, can change
anything v1 says, past or present.

### Keeping v1's evidence readable for decades

The chain keeps the history. Reading it needs software that decodes pre-fork transactions,
and midnight-js will drop that (Known 6). So:

- every evidence package carries the raw bytes of the anchor transaction and its block hash,
  as `docs/mainnet-completeness.md` already recommends for claims;
- our verifier pins its own decoder for ledger-8 transactions (the published ledger-v8 package
  at a fixed version), rather than relying on whatever midnight-js supports that year;
- we keep our own archive of v1's transactions.

### The other two contracts

- **Claims contract:** already a sealed version (empty committee since 8 October). It needs
  nothing. Its successor is simply a new address. *Corrected 23 November 2026:* the successor
  keeps VeilCore's own Schnorr check, with a range check added inside the circuit, rather than
  switching to the standard library's (founders' decision; [contract-v2.md](contract-v2.md),
  1.3).
- *Corrected 23 November 2026:* **there is no royalties contract** (correction 1 above). The
  9 October text named one "on a test-network branch". No such contract exists on any
  branch, and royalties need none.

---

## Steps

### Next weeks, before the fork

1. **Record the main contract's authority counter** with `readAuthority` (marked not yet
   recorded in `docs/maintenance-policy.md` and the deployment record). It is the baseline that shows any
   later use. Expected to be at least 16 (16 key-adding updates after the deploy); read it
   rather than assume.
2. **Founders decide** the points below, and amend `docs/maintenance-policy.md` to narrow
   v1's key to "keep working, switch off, seal" (dropping "a change both founders approved
   in writing" for v1). That needs a new revision of the deployment record.
3. **Install the 2-of-3 committee before the fork**, while maintenance for this contract is
   on the path we have already used on mainnet (ledger-v8 types, as in `api/src/maintenance.ts`).
   After the fork that path changes and is untested.
4. **Move to midnight-js 5** on a branch (Node 22.12, TypeScript 5.8, the version-tagged
   payloads) and ship it to users before the fork, as Midnight's guide requires.
5. **Fork test.** Run a local network on the current release with v1 deployed, upgrade it to
   ledger 9 (Midnight's own `util/toolkit/tests/hardfork_e2e.rs` shows how), then check: a v1
   call, our verifier's reads and key pins, reading a pre-fork anchor transaction, and one
   maintenance update (an authority replacement) built with ledger-v9 types.
6. **Evidence packages:** add raw anchor transaction bytes; pin a ledger-8 decoder in the
   verifier; start archiving v1 history.
7. **Show the circuit keys rebuild from source.** The `.zkir` files and compiled code have been
   reproduced byte for byte; the verifier keys have been built once only. "Same source, new
   keys" is only checkable by others if keys rebuild.
8. **Do not deploy anything new on ledger 8.** (*Corrected:* the "royalties waits" note
   referred to a contract that does not exist.)
9. **Ask Midnight** the questions below, in writing.

### After the fork

1. Confirm on mainnet that v1 calls and every verifier check still work.
2. Write the v2 design, run the adversarial review, then build v2 on the current Compact
   toolchain. Same for claims v2. (*Corrected 23 November 2026:* no royalties contract and no
   carry-forward or licence re-issue. v2 stores v1's address as `predecessor` for provenance
   only. Verifiers never follow it; they use a pinned list of contracts (rule 10,
   [contract-v2.md](contract-v2.md), 3.1).)
3. Deploy v2 (the fragmented deploy needs an authority during the deploy; v2's key follows
   the same "rules never change" policy), release the client that verifies across both
   versions, open the carry-forward, announce the window. (*Corrected:* v2 is a fresh start
   with no carry and no window; rehearse every maintenance step on a local forked devnet, not
   preprod, whose practice contract's authority is retired. The launch order is in
   contract-v2.md, section 7.)
4. After v2 is public and audited: seal v1 by `retire` only, through `scripts/committee`.

---

## Decisions for the founders

1. **Adopt versions (option b)** as the way VeilCore improves: new rules mean a new version.
2. **Narrow v1's key** to keep-working, switch-off and seal, and publish that as a change to
   the approved maintenance policy.
3. **Name the independent third key holder** for the 2-of-3 committee, and install it before
   the fork. *Corrected 23 November 2026:* no committee goes on v1. v2 is deployed with a
   temporary single key, handed to the 2-of-3 committee once the third key holder is named
   (maintainer decision, 23 November 2026), with the 14-day notice before the handover. v1 is
   retired with its single key ([runbooks/two-of-three.md](runbooks/two-of-three.md)).
4. **Set the carry-forward window** before v1 is sealed (we suggest at least 12 months after
   v2 launches). *Dropped 23 November 2026:* v2 has no carry-forward, so there is no window
   (correction 3).
5. **Seal v1 by removing every key** (a fixed archive), or only the keys of circuits that
   change data (presentations and control proofs would keep working). We recommend every key:
   it is simpler to explain and leaves nothing to trust. *Corrected 23 November 2026:* seal
   by `retire` only, keeping every key, so checkers keep accepting v1's state and no key
   removal is needed (correction 4).
6. **Licences: re-issue in v2**, or design a carry-forward that needs both the issuer and the
   licensee. We recommend re-issue for v2. *Dropped 23 November 2026:* nothing moves to v2;
   a v1 licence stays a v1 licence, and new licences are made in v2.
7. ~~Hold the royalties contract until the ledger-9 toolchain.~~ *Withdrawn 23 November
   2026:* there is no royalties contract (correction 1 above).

## Questions for Midnight

1. After the v9 fork, will the network accept a maintenance update (authority replacement,
   key removal, key insertion) for a contract deployed on ledger 8? The v8 to v9 translation
   (midnight-ledger `da96e33`, `v8-to-v9-state-translation/src/lib.rs`) copies the committee,
   threshold and counter, and `semantics.rs` applies `ContractAction::Maintain` with no era
   check. Is that the final behaviour?
2. midnight-js 5 says "the retained era has no governance arm". Is that only midnight-js not
   offering it, or a network rule? If only the library, is building the `MaintenanceUpdate`
   ourselves with ledger-v9 types supported, as we already do with ledger-v8 for retirement?
3. For a pre-fork contract after the fork, can we (a) insert a key built by Compact 0.31.1
   (the old-format `V3` key), and (b) swap a circuit's old key for one built from the same
   source by Compact 0.35 and keep calling it against the existing data? Does 0.35 lay out
   the same source's data the same way?
4. Is there a date, or a block, for the v9 fork on mainnet? How much notice will dApps get,
   and does preprod fork first? (Answered since: mainnet forked on 6 November 2026, preprod on
   9 November.)
5. Will Midnight commit to a notice period before mainnet stops accepting old-format
   (zk-stdlib v1) proofs, if it ever does?
6. Once midnight-js drops the pre-fork era, what is the supported way to decode pre-fork
   transactions, and will the indexer keep serving them decoded? (Indexer #1605 broke this for
   old state after the 28 September upgrade.)
7. Is any time delay on maintenance updates, enforced by the ledger, planned?
8. Can a ledger-9 contract ever call a circuit on a pre-fork contract in one transaction?
   midnight-js refuses it today (`MixedEraScopeError`). And when do called contracts get
   witness support (MPS-0021, Phase 2)?

---

## How to say it to each audience

*Rewritten 23 November 2026 for the fresh start (correction 3).*

- **Labs:** "Your anchor date is in Midnight's history, not in a setting we control. A record
  stays in the contract it was made in, with its date, forever. When we improve VeilCore, the
  new version is a new contract; new records go there, and old ones keep their date where
  they are."
- **Regulators:** "Old versions are never edited. Each is retired: the key that could change
  its rules is replaced by none, and anyone can check that on chain. New rules only apply in
  new versions, which are announced in advance."
- **Investors:** "The product can improve without limit. What we deliberately give up is the
  ability to change what has already been recorded, and that is what makes the records worth
  something to a court or a regulator."
- **Midnight engineers:** "Immutable versions as separate contracts. Verifiers hold a pinned
  list and decode each transaction by the contract it calls; identities are never joined
  across versions. `predecessor` is provenance, not a trust link. The old version's authority
  is retired (an empty committee) once the new one is public, with its circuit keys left in
  place so its records keep verifying."

## What this does not solve

- **Until v1 is sealed, the key's power over v1's present state remains.** The committee,
  the policy and the verifier's key pins limit it and make it visible. They do not remove
  it.
- **The link between versions is checked by software, not by the contracts.** A verifier who
  skips the new rule could accept a forged carry-forward. That is the same position as rules
  1 to 8 today. *Corrected 23 November 2026:* v2 has no carry-forward. A verifier checks
  each record against the pinned contract it names (rule 10).
- **Reading old history depends on decoders.** We plan for it above; it is not free.
- **Every version is a new address.** Partners and verifiers must be told, and the client pins
  each new address, as it does now.
- **Nothing here is tested.** The fork test (step 5) and Midnight's answers decide how much
  of *Assumed* holds.

---

## Sources

Midnight code (local copies used for this document):

- midnight-ledger, tag `crate-ledger-9.1.0.0-rc.6` (commit `48a978d`, 7 Oct 2026),
  https://github.com/midnightntwrk/midnight-ledger:
  `ledger/src/semantics.rs` (from line 1549, maintenance applied);
  `ledger/src/verify.rs` (from 1826, signatures and threshold; line 1919, old-key transcript
  check; from 980, cross-contract call matching);
  `ledger/src/structure.rs` (446-506, proof checked by version; 2859, key versions; 2952-2966,
  `SingleUpdate`); `spec/impact-opcodes.md` (117-127); `spec/contracts.md` (263-282);
  `CHANGELOG.md` (9.1.0.0-rc.3: old and new key slots, IR insert and remove).
- midnight-ledger commit `da96e33` (18 Aug 2026), branch `state-translation/v8-to-v9`:
  `v8-to-v9-state-translation/src/lib.rs` (42-44, 453-531).
- midnight-node `52f49b9` (2 Oct 2026), https://github.com/midnightntwrk/midnight-node:
  `Cargo.toml` (75-119, ledger 8 and 9 pins and the translation crate);
  `ledger/helpers/unsafe/src/ledger_9/contract/maintenance.rs` (ledger-9 maintenance builder);
  `util/toolkit/tests/hardfork_e2e.rs` (fork test method).
- midnight-js `8edbd94` (5.0.0-rc.3, 30 Sep 2026), https://github.com/midnightntwrk/midnight-js:
  `docs/releases/v5.0.0/migration-guide.md` (336-338, 340, 412-421, 490-496, 559-566);
  `packages/contracts/src/ledger8-contract.ts` (716, 733-735);
  `packages/contracts/src/errors.ts` (978-991); `packages/contracts/src/governance/`
  (current-era maintenance calls).
- midnight-improvement-proposals `078a5a7` (29 Sep 2026),
  https://github.com/midnightntwrk/midnight-improvement-proposals:
  `mps/mps-0021-phase2-contract-to-contract.md` (Phase 1 limits);
  `mps/mps-0040-cross-contract-call-provenance.md` (a callee cannot identify its caller);
  `deployments/veilcore.md`.

Midnight documentation (read 9 Oct 2026):

- Deploying and operating a contract: https://docs.midnight.network/guides/deploy-and-operate
- Compatibility matrix: https://docs.midnight.network/relnotes/support-matrix
- Wallet ledger-9 pull request: https://github.com/midnightntwrk/midnight-wallet/pull/811

VeilCore (this repository): `docs/design.md` (*Trust model*, *Governance*, *Deployment in
fragments*), `docs/maintenance-policy.md`, `docs/deployment-record-revision-4.md` (*The
maintenance authority*, *The claims contract*, *Mainnet deployment*), `docs/claims-design.md`,
`docs/mainnet-completeness.md` (*Open design question*), `api/src/maintenance.ts`,
`contract/src/veilcore.compact`.

Cited in this repository but not re-read for this document: midnight-node issue #1969 ("a
maintenance verifier-key update would be needed") and indexer issue #1605. This session had
no access to read them.
