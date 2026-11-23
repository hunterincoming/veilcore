// The contract v2 smoke run: every circuit of both v2 contracts called once (some twice, to
// set up the next), with throwaway test data, and the result read back from the contract's
// state (docs/runbooks/deploy-v2.md, step 11).
//
// The plan is here; where the calls go is not. A `SmokeChain` sends each call and reads the
// state back: bboard-cli/src/launcher/smoke-v2.ts gives one that goes through midnight-js and
// a wallet to a real network; src/test/smoke.test.ts gives ones that run in this process.
//
// Every secret is fresh random bytes made for this run and thrown away after it. Nothing here
// is a real record, and nothing is kept. A run never reuses an earlier run's records, so it can
// be repeated on the same contracts.
// SPDX-License-Identifier: Apache-2.0

import { randomBytes as nodeRandomBytes } from "node:crypto";
import {
  type Ledger as VeilcoreLedger,
  LicenseState,
  pureCircuits as C,
} from "./managed/veilcore/contract/index.js";
import {
  type ClaimsLedger,
  type ClaimsPrivateState,
  ClaimKind,
  RangeOp,
  claimsPureCircuits as CC,
} from "./claims.js";
import {
  type VeilcorePrivateState,
  createVeilcorePrivateState,
  withIncomingSecret,
  withLicense,
  withRecoverySecret,
} from "./witnesses.js";
import {
  ABSENT,
  type FieldSet,
  type SchemaTerms,
  commitmentOf,
  digestValue,
  numberValue,
  openSlot,
  schemaIdOf,
  sealFields,
} from "./fields.js";
import { newAttesterKey, signRecord } from "./attest.js";

export type SmokeContract = "veilcore" | "veilcore-claims";

/** One call: which contract and circuit, its arguments, and the private state it is proved with. */
export type SmokeCall =
  | {
      readonly contract: "veilcore";
      readonly circuit: string;
      readonly args: readonly unknown[];
      readonly privateState: VeilcorePrivateState;
    }
  | {
      readonly contract: "veilcore-claims";
      readonly circuit: string;
      readonly args: readonly unknown[];
      readonly privateState: ClaimsPrivateState;
    };

/** Where the calls go, and how the state is read back. */
export interface SmokeChain {
  /** Prove, send and wait until the call is in a block, or reject with the reason. */
  call(c: SmokeCall): Promise<{ readonly txId?: string }>;
  /** The main contract's state now. */
  mainLedger(): Promise<VeilcoreLedger>;
  /** The claims contract's state now. */
  claimsLedger(): Promise<ClaimsLedger>;
  /** The time now, in seconds since 1970 (for the seal's time bound). */
  now(): Promise<bigint>;
  /** Pause before reading the state again (the indexer can be a little behind). */
  wait(ms: number): Promise<void>;
}

export type SmokeResult = "PASS" | "FAIL" | "NOT RUN";

export type SmokeRow = {
  readonly step: number;
  readonly contract: SmokeContract;
  readonly circuit: string;
  /** What the call does, in a few plain words. */
  readonly what: string;
  result: SmokeResult;
  /** Why it failed, or what was checked. */
  detail: string;
  txId?: string;
};

const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");
const same = (a: Uint8Array, b: Uint8Array): boolean => hex(a) === hex(b);

/** Seconds between seals (the contract's SEAL_INTERVAL), and how far ahead its bound goes. */
const SEAL_INTERVAL = 600n;
/** Ahead of the clock by this much; the contract allows up to 300 s past the landing block's time. */
const SEAL_AHEAD = 200n;
/** Margin for clock skew before the seal window opens. */
const SEAL_SKEW = 30n;

type Ctx = {
  readonly rnd: () => Buffer;
  readonly chain: SmokeChain;
  // Two throwaway identities, A and B, each a chain of record secrets.
  a: Uint8Array;
  readonly aOrigin: Uint8Array;
  aRecovery: Uint8Array;
  readonly b: Uint8Array;
  readonly bOrigin: Uint8Array;
  readonly bRecovery: Uint8Array;
  // A licence A issues, to a licensee holding licSecret.
  readonly licSecret: Uint8Array;
  readonly licSecret2: Uint8Array;
  readonly challenge: Uint8Array;
  readonly obligations: Uint8Array[];
  // Claims test data.
  readonly terms: SchemaTerms;
  readonly schema: Uint8Array;
  readonly fsA: FieldSet;
  readonly fsB: FieldSet;
  readonly fsA2: FieldSet;
  readonly mask: boolean[];
};

type Step = {
  readonly contract: SmokeContract;
  readonly circuit: string;
  readonly what: string;
  /** Anything to do first (e.g. wait for the seal window). */
  readonly before?: (x: Ctx) => Promise<void>;
  readonly call: (x: Ctx) => Promise<SmokeCall> | SmokeCall;
  /** Read the state back; a problem in plain words, or undefined when it is right. */
  readonly check: (x: Ctx) => Promise<string | undefined>;
  /** After the check passed: move the test identities on. */
  readonly after?: (x: Ctx) => void;
};

const as = (secret: Uint8Array): VeilcorePrivateState =>
  createVeilcorePrivateState(secret);

const main = (
  circuit: string,
  privateState: VeilcorePrivateState,
  ...args: unknown[]
): SmokeCall => ({ contract: "veilcore", circuit, args, privateState });

const claims = (
  circuit: string,
  input: ClaimsPrivateState["input"],
  ...args: unknown[]
): SmokeCall => ({
  contract: "veilcore-claims",
  circuit,
  args,
  privateState: { input },
});

const lk = (lc: Uint8Array, record: Uint8Array): Uint8Array =>
  C.licenseKey(lc, record);
const licA = (x: Ctx): Uint8Array => C.licenseCommit(x.licSecret, x.aOrigin);
const licA2 = (x: Ctx): Uint8Array => C.licenseCommit(x.licSecret2, x.aOrigin);
const obKey = (
  record: Uint8Array,
  o: Uint8Array,
  beneficiary: Uint8Array,
): Uint8Array => C.obligationKey(record, o, beneficiary);

const ml = (x: Ctx): Promise<VeilcoreLedger> => x.chain.mainLedger();
const cl = (x: Ctx): Promise<ClaimsLedger> => x.chain.claimsLedger();

const need = (ok: boolean, problem: string): string | undefined =>
  ok ? undefined : problem;

/** A licence-tree slot nobody holds, picked at random (as the client does). */
const freeSlot = async (x: Ctx): Promise<bigint> => {
  const l = await ml(x);
  for (;;) {
    const s = BigInt(x.rnd().readUInt32BE(0) % 16_777_216);
    if (!l.licenseAtSlot.member(s)) return s;
  }
};

/** Every step, in order. Each later step builds on the ones before it. */
const STEPS: readonly Step[] = [
  // ── records ──
  {
    contract: "veilcore",
    circuit: "anchor",
    what: "anchor test record A",
    call: (x) => main("anchor", as(x.a), C.recoveryCommit(x.aRecovery)),
    check: async (x) => {
      const l = await ml(x);
      return need(
        l.recoveryOf.member(x.aOrigin) &&
          same(l.recoveryOf.lookup(x.aOrigin), C.recoveryCommit(x.aRecovery)),
        "record A is not anchored with its recovery commitment",
      );
    },
  },
  {
    contract: "veilcore",
    circuit: "anchor",
    what: "anchor test record B",
    call: (x) => main("anchor", as(x.b), C.recoveryCommit(x.bRecovery)),
    check: async (x) =>
      need(
        (await ml(x)).recoveryOf.member(x.bOrigin),
        "record B is not anchored",
      ),
  },
  {
    contract: "veilcore",
    circuit: "anchorBatch",
    what: "anchor a batch root",
    call: (x) => {
      const root = x.rnd();
      batchRoot.set(x, root);
      return main("anchorBatch", as(x.a), root);
    },
    check: async (x) =>
      need(
        same((await ml(x)).lastBatchRoot, batchRoot.get(x)!),
        "the batch root is not the last one anchored",
      ),
  },
  {
    contract: "veilcore",
    circuit: "proveOwnership",
    what: "A proves possession to a challenge",
    call: (x) => main("proveOwnership", as(x.a), x.challenge),
    check: async (x) => {
      const l = await ml(x);
      return need(
        same(l.lastOwnershipProof, x.aOrigin) &&
          same(l.lastOwnershipChallenge, x.challenge),
        "the last possession proof is not A's, to this challenge",
      );
    },
  },
  {
    contract: "veilcore",
    circuit: "pairDna",
    what: "A pairs a DNA report fingerprint",
    call: (x) => {
      const dna = x.rnd();
      dnaOf.set(x, dna);
      return main("pairDna", as(x.a), dna);
    },
    check: async (x) => {
      const l = await ml(x);
      return need(
        same(l.lastPairedRecord, x.aOrigin) &&
          same(l.lastPairedDna, dnaOf.get(x)!),
        "the last pairing is not A's DNA fingerprint",
      );
    },
  },
  // ── licences ──
  {
    contract: "veilcore",
    circuit: "issueLicense",
    what: "A issues a licence (pending)",
    call: (x) => main("issueLicense", as(x.a), licA(x)),
    check: async (x) => {
      const l = await ml(x);
      const k = lk(licA(x), x.aOrigin);
      return need(
        l.licenseStatusOf.member(k) &&
          l.licenseStatusOf.lookup(k) === LicenseState.PENDING,
        "the licence is not pending",
      );
    },
  },
  {
    contract: "veilcore",
    circuit: "countersignLicense",
    what: "the licensee countersigns (active)",
    call: async (x) =>
      main(
        "countersignLicense",
        withLicense(as(x.rnd()), x.licSecret, x.aOrigin),
        x.aOrigin,
        await freeSlot(x),
      ),
    check: async (x) => {
      const l = await ml(x);
      const k = lk(licA(x), x.aOrigin);
      return need(
        l.licenseStatusOf.member(k) &&
          l.licenseStatusOf.lookup(k) === LicenseState.ACTIVE &&
          l.licenseSlotOf.member(k),
        "the licence is not active in the licence tree",
      );
    },
  },
  {
    contract: "veilcore",
    circuit: "proveLicense",
    what: "the licensee presents the licence",
    call: (x) =>
      main("proveLicense", {
        ...withLicense(as(x.rnd()), x.licSecret, x.aOrigin),
        presentationChallenge: x.challenge,
      }),
    check: async (x) =>
      need(
        same(
          (await ml(x)).lastPresentation,
          C.presentationTag(x.aOrigin, x.challenge),
        ),
        "the last presentation is not this licence's, to this challenge",
      ),
  },
  {
    contract: "veilcore",
    circuit: "proposeTransfer",
    what: "the licensee proposes a transfer",
    call: (x) =>
      main(
        "proposeTransfer",
        withLicense(as(x.rnd()), x.licSecret, x.aOrigin),
        x.aOrigin,
        licA2(x),
      ),
    check: async (x) => {
      const l = await ml(x);
      const k = lk(licA(x), x.aOrigin);
      return need(
        l.pendingTransferOf.member(k) &&
          same(l.pendingTransferOf.lookup(k), licA2(x)),
        "no transfer is proposed for the licence",
      );
    },
  },
  {
    contract: "veilcore",
    circuit: "withdrawTransfer",
    what: "the licensee withdraws it",
    call: (x) =>
      main(
        "withdrawTransfer",
        withLicense(as(x.rnd()), x.licSecret, x.aOrigin),
        x.aOrigin,
      ),
    check: async (x) =>
      need(
        !(await ml(x)).pendingTransferOf.member(lk(licA(x), x.aOrigin)),
        "the transfer proposal is still there",
      ),
  },
  {
    contract: "veilcore",
    circuit: "proposeTransfer",
    what: "the licensee proposes it again",
    call: (x) =>
      main(
        "proposeTransfer",
        withLicense(as(x.rnd()), x.licSecret, x.aOrigin),
        x.aOrigin,
        licA2(x),
      ),
    check: async (x) =>
      need(
        (await ml(x)).pendingTransferOf.member(lk(licA(x), x.aOrigin)),
        "no transfer is proposed for the licence",
      ),
  },
  {
    contract: "veilcore",
    circuit: "approveTransfer",
    what: "A approves the transfer",
    call: (x) => main("approveTransfer", as(x.a), licA(x), x.aOrigin, licA2(x)),
    check: async (x) => {
      const l = await ml(x);
      const k2 = lk(licA2(x), x.aOrigin);
      return need(
        !l.licenseStatusOf.member(lk(licA(x), x.aOrigin)) &&
          l.licenseStatusOf.member(k2) &&
          l.licenseStatusOf.lookup(k2) === LicenseState.ACTIVE,
        "the licence did not move to the new holder",
      );
    },
  },
  {
    contract: "veilcore",
    circuit: "revokeLicense",
    what: "A revokes the moved licence",
    call: (x) => main("revokeLicense", as(x.a), licA2(x), x.aOrigin),
    check: async (x) => {
      const l = await ml(x);
      return need(
        !l.licenseStatusOf.member(lk(licA2(x), x.aOrigin)) && l.unsealedChanges,
        "the licence is not revoked and waiting for a seal",
      );
    },
  },
  {
    contract: "veilcore",
    circuit: "sealRevocations",
    what: "seal the revocation",
    before: async (x) => {
      // The contract allows one seal every SEAL_INTERVAL; a second run soon after waits.
      const earliest = (await ml(x)).lastSealTime + SEAL_INTERVAL + SEAL_SKEW;
      for (
        let now = await x.chain.now();
        now < earliest;
        now = await x.chain.now()
      )
        await x.chain.wait(Number(earliest - now) * 1000);
    },
    call: async (x) => {
      const bound = (await x.chain.now()) + SEAL_AHEAD;
      sealBound.set(x, bound);
      return main("sealRevocations", as(x.a), bound);
    },
    check: async (x) => {
      const l = await ml(x);
      return need(
        !l.unsealedChanges && l.lastSealTime === sealBound.get(x),
        "the seal did not land (the revocation is still unsealed)",
      );
    },
  },
  {
    contract: "veilcore",
    circuit: "rotateRecordSecret",
    what: "A moves to a new secret",
    call: (x) => {
      const next = x.rnd();
      nextSecret.set(x, next);
      return main(
        "rotateRecordSecret",
        withIncomingSecret(as(x.a), next),
        C.commit(next),
      );
    },
    check: async (x) => {
      const l = await ml(x);
      return need(
        l.headOf.member(x.aOrigin) &&
          same(l.headOf.lookup(x.aOrigin), C.commit(nextSecret.get(x)!)),
        "A's record did not move to the new secret",
      );
    },
    after: (x) => {
      x.a = nextSecret.get(x)!;
    },
  },
  {
    contract: "veilcore",
    circuit: "recoverRecordSecret",
    what: "A recovers with its recovery secret",
    call: (x) => {
      const next = x.rnd();
      const nextRecovery = x.rnd();
      nextSecret.set(x, next);
      nextRecoverySecret.set(x, nextRecovery);
      return main(
        "recoverRecordSecret",
        withIncomingSecret(withRecoverySecret(as(x.rnd()), x.aRecovery), next),
        x.aOrigin,
        C.commit(next),
        C.recoveryCommit(nextRecovery),
      );
    },
    check: async (x) => {
      const l = await ml(x);
      return need(
        same(l.headOf.lookup(x.aOrigin), C.commit(nextSecret.get(x)!)) &&
          same(
            l.recoveryOf.lookup(x.aOrigin),
            C.recoveryCommit(nextRecoverySecret.get(x)!),
          ),
        "A was not recovered to the new secret and recovery commitment",
      );
    },
    after: (x) => {
      x.a = nextSecret.get(x)!;
      x.aRecovery = nextRecoverySecret.get(x)!;
    },
  },
  {
    contract: "veilcore",
    circuit: "replaceRecoveryCommitment",
    what: "A replaces its recovery commitment",
    call: (x) => {
      const nextRecovery = x.rnd();
      nextRecoverySecret.set(x, nextRecovery);
      return main(
        "replaceRecoveryCommitment",
        withRecoverySecret(as(x.rnd()), x.aRecovery),
        x.aOrigin,
        C.recoveryCommit(nextRecovery),
      );
    },
    check: async (x) =>
      need(
        same(
          (await ml(x)).recoveryOf.lookup(x.aOrigin),
          C.recoveryCommit(nextRecoverySecret.get(x)!),
        ),
        "A's recovery commitment was not replaced",
      ),
    after: (x) => {
      x.aRecovery = nextRecoverySecret.get(x)!;
    },
  },
  // ── parentage: B names A as a parent ──
  {
    contract: "veilcore",
    circuit: "proposeParent",
    what: "B names A as a parent",
    call: (x) => main("proposeParent", as(x.b), x.aOrigin),
    check: async (x) => {
      const l = await ml(x);
      return need(
        l.pendingParentOf.member(x.bOrigin) &&
          same(l.pendingParentOf.lookup(x.bOrigin), x.aOrigin),
        "B's parentage proposal is not there",
      );
    },
  },
  {
    contract: "veilcore",
    circuit: "withdrawParent",
    what: "B withdraws it",
    call: (x) => main("withdrawParent", as(x.b)),
    check: async (x) =>
      need(
        !(await ml(x)).pendingParentOf.member(x.bOrigin),
        "B's parentage proposal is still there",
      ),
  },
  {
    contract: "veilcore",
    circuit: "proposeParent",
    what: "B names A again",
    call: (x) => main("proposeParent", as(x.b), x.aOrigin),
    check: async (x) =>
      need(
        (await ml(x)).pendingParentOf.member(x.bOrigin),
        "B's parentage proposal is not there",
      ),
  },
  {
    contract: "veilcore",
    circuit: "confirmParent",
    what: "A confirms being B's parent",
    call: (x) => main("confirmParent", as(x.a), x.bOrigin),
    check: async (x) => {
      const l = await ml(x);
      return need(
        l.parentsOf.member(x.bOrigin) &&
          l.parentsOf.lookup(x.bOrigin).member(x.aOrigin),
        "A is not a confirmed parent of B",
      );
    },
  },
  // ── obligations: on B's record ──
  {
    contract: "veilcore",
    circuit: "encumberOwnRecord",
    what: "B places a claim on its own record",
    call: (x) => main("encumberOwnRecord", as(x.b), x.obligations[0]),
    check: async (x) =>
      need(
        (await ml(x)).openObligations.member(
          obKey(x.bOrigin, x.obligations[0], x.bOrigin),
        ),
        "B's own claim is not in force",
      ),
  },
  {
    contract: "veilcore",
    circuit: "proposeObligation",
    what: "A proposes a claim on B",
    call: (x) =>
      main("proposeObligation", as(x.a), x.bOrigin, x.obligations[1]),
    check: async (x) =>
      need(
        (await ml(x)).pendingObligations.member(
          obKey(x.bOrigin, x.obligations[1], x.aOrigin),
        ),
        "A's proposal is not there",
      ),
  },
  {
    contract: "veilcore",
    circuit: "withdrawObligation",
    what: "A withdraws it",
    call: (x) =>
      main("withdrawObligation", as(x.a), x.bOrigin, x.obligations[1]),
    check: async (x) =>
      need(
        !(await ml(x)).pendingObligations.member(
          obKey(x.bOrigin, x.obligations[1], x.aOrigin),
        ),
        "A's proposal is still there",
      ),
  },
  {
    contract: "veilcore",
    circuit: "proposeObligation",
    what: "A proposes another claim on B",
    call: (x) =>
      main("proposeObligation", as(x.a), x.bOrigin, x.obligations[2]),
    check: async (x) =>
      need(
        (await ml(x)).pendingObligations.member(
          obKey(x.bOrigin, x.obligations[2], x.aOrigin),
        ),
        "A's proposal is not there",
      ),
  },
  {
    contract: "veilcore",
    circuit: "rejectObligation",
    what: "B rejects it",
    call: (x) => main("rejectObligation", as(x.b), x.obligations[2], x.aOrigin),
    check: async (x) =>
      need(
        !(await ml(x)).pendingObligations.member(
          obKey(x.bOrigin, x.obligations[2], x.aOrigin),
        ),
        "the rejected proposal is still there",
      ),
  },
  {
    contract: "veilcore",
    circuit: "proposeObligation",
    what: "A proposes a third claim on B",
    call: (x) =>
      main("proposeObligation", as(x.a), x.bOrigin, x.obligations[3]),
    check: async (x) =>
      need(
        (await ml(x)).pendingObligations.member(
          obKey(x.bOrigin, x.obligations[3], x.aOrigin),
        ),
        "A's proposal is not there",
      ),
  },
  {
    contract: "veilcore",
    circuit: "acceptObligation",
    what: "B accepts it",
    call: (x) => main("acceptObligation", as(x.b), x.obligations[3], x.aOrigin),
    check: async (x) =>
      need(
        (await ml(x)).openObligations.member(
          obKey(x.bOrigin, x.obligations[3], x.aOrigin),
        ),
        "the accepted claim is not in force",
      ),
  },
  {
    contract: "veilcore",
    circuit: "discharge",
    what: "A releases it",
    call: (x) => main("discharge", as(x.a), x.bOrigin, x.obligations[3]),
    check: async (x) =>
      need(
        !(await ml(x)).openObligations.member(
          obKey(x.bOrigin, x.obligations[3], x.aOrigin),
        ),
        "the released claim is still in force",
      ),
  },
  // ── claims ──
  {
    contract: "veilcore-claims",
    circuit: "proveValue",
    what: "a slot holds a value",
    call: (x) =>
      claims(
        "proveValue",
        { opening: openSlot(x.fsA, 4) },
        commitmentOf(x.schema, x.fsA),
        x.schema,
        4n,
        x.fsA.values[4],
      ),
    check: async (x) => {
      const l = await cl(x);
      return need(
        l.lastClaimKind === ClaimKind.VALUE &&
          same(l.lastClaimRecord, commitmentOf(x.schema, x.fsA)) &&
          same(l.lastClaimParam, x.fsA.values[4]),
        "the last claim is not this value claim",
      );
    },
  },
  {
    contract: "veilcore-claims",
    circuit: "proveRange",
    what: "a sealed number is at least a bound",
    call: (x) =>
      claims(
        "proveRange",
        { opening: openSlot(x.fsA, 4), number: 42n, terms: x.terms },
        commitmentOf(x.schema, x.fsA),
        x.schema,
        4n,
        RangeOp.AT_LEAST,
        40n,
      ),
    check: async (x) => {
      const l = await cl(x);
      return need(
        l.lastClaimKind === ClaimKind.RANGE &&
          same(l.lastClaimRecord, commitmentOf(x.schema, x.fsA)) &&
          same(l.lastClaimParam, CC.numberBytes(40n)),
        "the last claim is not this range claim",
      );
    },
  },
  {
    contract: "veilcore-claims",
    circuit: "proveDistinct",
    what: "two records differ",
    call: (x) =>
      claims(
        "proveDistinct",
        { first: x.fsA, second: x.fsB, terms: x.terms },
        commitmentOf(x.schema, x.fsA),
        commitmentOf(x.schema, x.fsB),
      ),
    check: async (x) => {
      const l = await cl(x);
      return need(
        l.lastClaimKind === ClaimKind.DISTINCT &&
          same(l.lastClaimOther, commitmentOf(x.schema, x.fsB)),
        "the last claim is not this distinctness claim",
      );
    },
  },
  {
    contract: "veilcore-claims",
    circuit: "proveUnchanged",
    what: "a correction changed one slot only",
    call: (x) =>
      claims(
        "proveUnchanged",
        { first: x.fsA, second: x.fsA2 },
        commitmentOf(x.schema, x.fsA),
        commitmentOf(x.schema, x.fsA2),
        x.schema,
        x.mask,
      ),
    check: async (x) => {
      const l = await cl(x);
      return need(
        l.lastClaimKind === ClaimKind.UNCHANGED &&
          same(l.lastClaimOther, commitmentOf(x.schema, x.fsA2)),
        "the last claim is not this correction claim",
      );
    },
  },
  {
    contract: "veilcore-claims",
    circuit: "proveAttested",
    what: "a test lab key signed the record (Jubjub)",
    call: (x) => {
      const lab = newAttesterKey();
      labKey.set(x, lab.key);
      const record = commitmentOf(x.schema, x.fsA);
      return claims(
        "proveAttested",
        { attester: lab.key, signature: signRecord(lab.secret, record) },
        record,
      );
    },
    check: async (x) => {
      const l = await cl(x);
      const k = labKey.get(x)!;
      return need(
        l.lastClaimKind === ClaimKind.ATTESTED &&
          l.lastClaimAttesterX === k.x &&
          l.lastClaimAttesterY === k.y,
        "the last claim is not this lab signature",
      );
    },
  },
];

// Values a step makes in `call` and reads back in `check`, kept per run.
const batchRoot = new WeakMap<Ctx, Uint8Array>();
const dnaOf = new WeakMap<Ctx, Uint8Array>();
const sealBound = new WeakMap<Ctx, bigint>();
const nextSecret = new WeakMap<Ctx, Uint8Array>();
const nextRecoverySecret = new WeakMap<Ctx, Uint8Array>();
const labKey = new WeakMap<Ctx, { x: bigint; y: bigint }>();

/** Every circuit the run calls, by contract. */
export const SMOKE_CIRCUITS: Readonly<
  Record<SmokeContract, readonly string[]>
> = {
  veilcore: [
    ...new Set(
      STEPS.filter((s) => s.contract === "veilcore").map((s) => s.circuit),
    ),
  ].sort(),
  "veilcore-claims": [
    ...new Set(
      STEPS.filter((s) => s.contract === "veilcore-claims").map(
        (s) => s.circuit,
      ),
    ),
  ].sort(),
};

/** The number of calls one run makes. */
export const SMOKE_CALLS = STEPS.length;

const testData = (chain: SmokeChain, rnd: () => Buffer): Ctx => {
  const a = rnd();
  const b = rnd();
  const comparable = Array.from({ length: 16 }, (_, i) => i < 4);
  const numeric = Array.from({ length: 16 }, (_, i) => i === 4);
  const terms: SchemaTerms = {
    documentDigest: rnd(),
    comparable,
    k: 2n,
    numeric,
  };
  const values = (label: string): Uint8Array[] =>
    Array.from({ length: 16 }, (_, i) =>
      i < 4
        ? digestValue(`${label}-${i}-${hex(rnd())}`)
        : i === 4
          ? numberValue(42n)
          : i === 5
            ? digestValue(`${label}-note-${hex(rnd())}`)
            : ABSENT,
    );
  const valuesA = values("a");
  const fsA = sealFields(valuesA, rnd(), rnd());
  const fsB = sealFields(values("b"), rnd(), rnd());
  // A correction of A: slot 5 changed, sealed afresh (new salts), same JSON.
  const fsA2 = sealFields(
    valuesA.map((v, i) => (i === 5 ? digestValue(`a-fixed-${hex(rnd())}`) : v)),
    rnd(),
    fsA.jsonDigest,
  );
  return {
    rnd,
    chain,
    a,
    aOrigin: C.commit(a),
    aRecovery: rnd(),
    b,
    bOrigin: C.commit(b),
    bRecovery: rnd(),
    licSecret: rnd(),
    licSecret2: rnd(),
    challenge: rnd(),
    obligations: [rnd(), rnd(), rnd(), rnd()],
    terms,
    schema: schemaIdOf(terms),
    fsA,
    fsB,
    fsA2,
    mask: Array.from({ length: 16 }, (_, i) => i === 5),
  };
};

/** A failure in one line: its message, and its cause's when midnight-js wraps one. */
const reason = (e: unknown): string => {
  const m = (e instanceof Error ? e.message : String(e)).split("\n")[0];
  const c =
    e instanceof Error && e.cause instanceof Error
      ? e.cause.message.split("\n")[0]
      : undefined;
  return c !== undefined && c !== "" && !m.includes(c) ? `${m} Cause: ${c}` : m;
};

/** How many times a check reads the state again before it fails (the indexer can lag). */
const CHECK_TRIES = 10;
const CHECK_PAUSE_MS = 3_000;

/**
 * Run every step once, in order. Stops at the first failure (every later step builds on
 * the earlier ones) and marks the rest NOT RUN. Never throws for a failed call: the row
 * says why.
 */
export const runSmoke = async (
  chain: SmokeChain,
  options: {
    readonly log?: (line: string) => void;
    /** 32 random bytes. Tests may pass their own. */
    readonly random?: () => Buffer;
    readonly checkTries?: number;
  } = {},
): Promise<SmokeRow[]> => {
  const log = options.log ?? (() => undefined);
  const rnd = options.random ?? (() => nodeRandomBytes(32));
  const tries = options.checkTries ?? CHECK_TRIES;
  const x = testData(chain, rnd);
  const rows: SmokeRow[] = STEPS.map((s, i) => ({
    step: i + 1,
    contract: s.contract,
    circuit: s.circuit,
    what: s.what,
    result: "NOT RUN",
    detail: "",
  }));
  for (const [i, s] of STEPS.entries()) {
    const row = rows[i];
    log(
      `${row.step}/${STEPS.length} ${s.contract} ${s.circuit}: ${s.what} ...`,
    );
    try {
      if (s.before !== undefined) await s.before(x);
      const sent = await chain.call(await s.call(x));
      if (sent.txId !== undefined) row.txId = sent.txId;
      let problem = await s.check(x);
      for (let t = 1; problem !== undefined && t < tries; t++) {
        await chain.wait(CHECK_PAUSE_MS);
        problem = await s.check(x);
      }
      if (problem !== undefined) {
        row.result = "FAIL";
        row.detail = `landed, but ${problem}`;
      } else {
        row.result = "PASS";
        row.detail = "landed; state checked";
        s.after?.(x);
      }
    } catch (e) {
      row.result = "FAIL";
      row.detail = reason(e);
    }
    log(
      `${row.step}/${STEPS.length} ${s.circuit}: ${row.result}${row.result === "FAIL" ? ` (${row.detail})` : ""}`,
    );
    if (row.result === "FAIL") break;
  }
  return rows;
};

/** Which circuits passed at least once, and which did not (failed, or never ran). */
export const circuitSummary = (
  rows: readonly SmokeRow[],
): { passed: string[]; notPassed: string[] } => {
  const all = [
    ...SMOKE_CIRCUITS.veilcore.map((c) => `veilcore.${c}`),
    ...SMOKE_CIRCUITS["veilcore-claims"].map((c) => `veilcore-claims.${c}`),
  ];
  const ok = new Set(
    rows
      .filter((r) => r.result === "PASS")
      .map((r) => `${r.contract}.${r.circuit}`),
  );
  // A circuit passes only when every call to it passed.
  for (const r of rows)
    if (r.result !== "PASS") ok.delete(`${r.contract}.${r.circuit}`);
  return {
    passed: all.filter((c) => ok.has(c)),
    notPassed: all.filter((c) => !ok.has(c)),
  };
};

/** The pass/fail table, in plain text. */
export const formatTable = (rows: readonly SmokeRow[]): string => {
  const head = ["#", "contract", "circuit", "what it does", "result", "detail"];
  const body = rows.map((r) => [
    String(r.step),
    r.contract === "veilcore" ? "main" : "claims",
    r.circuit,
    r.what,
    r.result,
    r.detail,
  ]);
  const w = head.map((h, i) =>
    Math.max(h.length, ...body.map((b) => b[i].length)),
  );
  const line = (cells: string[]): string =>
    cells
      .map((c, i) => (i === cells.length - 1 ? c : c.padEnd(w[i])))
      .join("  ")
      .trimEnd();
  const { passed, notPassed } = circuitSummary(rows);
  const total = passed.length + notPassed.length;
  return [
    line(head),
    line(w.map((n) => "-".repeat(n))),
    ...body.map(line),
    "",
    notPassed.length === 0
      ? `PASS: all ${total} circuits landed and their results checked.`
      : `FAIL: ${passed.length} of ${total} circuits passed. Not passed: ${notPassed.join(", ")}.`,
  ].join("\n");
};
