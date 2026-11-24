// A simulated claims contract: compiled circuits against an in-memory ledger, with the
// prover's private values passed per call. Can prove against one state and land on a
// later one, as on chain.
//
// Contract v2: Compact runtime 0.21 (async calls, a context per call), and the signature
// witness takes the response in two parts (schnorr.compact). Tests give the signature as a
// laboratory makes it ({ announcement, response }); it is split at the witness, as the
// client does. `rawSignature` hands the circuit parts no honest client would build.
// SPDX-License-Identifier: Apache-2.0

import {
  type ChargedState,
  type CircuitContext,
  QueryContext,
  CostModel,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import {
  type AttestationSignature as SchnorrSignature,
  type AttestationSignatureWitness,
  type JubjubPoint,
  schnorrReduction,
  signatureWitness,
} from "../attest.js";
import {
  Contract,
  type Ledger,
  type FieldSet,
  type SlotOpening,
  type SchemaTerms,
  ledger,
  pureCircuits,
} from "../managed/veilcore-claims/contract/index.js";

export const CC = pureCircuits;
const COIN = "0".repeat(64);

/** What the prover holds for one call. Anything not given makes the witness throw. */
export type Private = {
  first?: FieldSet;
  second?: FieldSet;
  opening?: SlotOpening;
  number?: bigint;
  terms?: SchemaTerms;
  attester?: JubjubPoint;
  signature?: SchnorrSignature;
  /** The signature exactly as the circuit's witness takes it; overrides `signature`. */
  rawSignature?: AttestationSignatureWitness;
  /** Overrides the challenge split the prover supplies (honest by default). */
  reduction?: (h: bigint) => [bigint, bigint];
};

type Ctx = CircuitContext<Record<string, never>>;
type Impure = Contract<Record<string, never>>["impureCircuits"];
export type ClaimCircuit = keyof Impure;
type Args<N extends ClaimCircuit> =
  Parameters<Impure[N]> extends [unknown, ...infer A] ? A : never;

// A budget no call reaches. Runtime 0.21 (onchain runtime 4) refuses a transcript whose
// budget gives any bytesDeleted allowance ("ran out of gas budget"), so it is 0 here; landing
// is about the contract's checks, and gas is not what these tests are for.
const GAS = {
  readTime: 10n ** 15n,
  computeTime: 10n ** 15n,
  bytesWritten: 10n ** 12n,
  bytesDeleted: 0n,
};

const need = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw new Error(`the prover does not hold ${what}`);
  return v;
};

const contract = (p: Private): Contract<Record<string, never>> =>
  new Contract<Record<string, never>>({
    firstFieldSet: ({ privateState }) => [
      privateState,
      need(p.first, "a first field set"),
    ],
    secondFieldSet: ({ privateState }) => [
      privateState,
      need(p.second, "a second field set"),
    ],
    slotOpening: ({ privateState }) => [
      privateState,
      need(p.opening, "a slot opening"),
    ],
    slotNumber: ({ privateState }) => [
      privateState,
      need(p.number, "a slot number"),
    ],
    schemaTerms: ({ privateState }) => [
      privateState,
      need(p.terms, "schema terms"),
    ],
    attesterKey: ({ privateState }) => [
      privateState,
      need(p.attester, "a laboratory key"),
    ],
    attesterSignature: ({ privateState }) => [
      privateState,
      p.rawSignature ??
        signatureWitness(need(p.signature, "a laboratory signature")),
    ],
    schnorrReduction: ({ privateState }, h: bigint) => [
      privateState,
      (p.reduction ?? schnorrReduction)(h),
    ],
  });

export class ClaimsSimulator {
  /** The contract's public state between calls. */
  private chain!: ChargedState;
  private readonly address = sampleContractAddress();

  /** Values the prover holds for every call unless a call overrides them. */
  private constructor(private readonly defaults: Private = {}) {}

  /** Deploy: run the constructor (async in runtime 0.21). */
  static async create(defaults: Private = {}): Promise<ClaimsSimulator> {
    const sim = new ClaimsSimulator(defaults);
    const initial = await contract({}).initialState(
      createConstructorContext({}, COIN),
    );
    sim.chain = initial.currentContractState.data;
    return sim;
  }

  get state(): Ledger {
    return ledger(this.chain);
  }

  /** A printout of the whole public state, to check that nothing grows with use. */
  get stateText(): string {
    return String((this.chain as unknown as { state: unknown }).state);
  }

  private context(circuit: string): Ctx {
    return createCircuitContext({
      circuitId: circuit,
      contractAddress: this.address,
      coinPublicKeyOrZswapState: COIN,
      contractState: this.chain,
      privateState: {},
    });
  }

  async call<N extends ClaimCircuit>(
    p: Private,
    circuit: N,
    ...args: Args<N>
  ): Promise<void> {
    const fn = contract({ ...this.defaults, ...p }).impureCircuits[circuit] as (
      c: Ctx,
      ...a: unknown[]
    ) => Promise<{ context: Ctx }>;
    const out = await fn(this.context(circuit), ...args);
    this.chain = out.context.callContext.currentQueryContext.state;
  }

  async prove<N extends ClaimCircuit>(
    p: Private,
    circuit: N,
    ...args: Args<N>
  ): Promise<{ transcript: unknown; effects: unknown }> {
    const fn = contract({ ...this.defaults, ...p }).impureCircuits[circuit] as (
      c: Ctx,
      ...a: unknown[]
    ) => Promise<{ context: Ctx }>;
    const r = await fn(this.context(circuit), ...args);
    const root = r.context.callProofDataTrace.filter(
      (t) => t.circuitId === circuit,
    );
    if (root.length !== 1)
      throw new Error(`test error: expected one ${circuit} call in the trace`);
    return {
      transcript: root[0].publicTranscript,
      effects: r.context.callContext.currentQueryContext.effects,
    };
  }

  land(p: { transcript: unknown; effects: unknown }): void {
    const q = new QueryContext(this.chain, this.address);
    const landed = q.runTranscript(
      { gas: GAS, effects: p.effects, program: p.transcript } as Parameters<
        QueryContext["runTranscript"]
      >[0],
      CostModel.initialCostModel(),
    );
    this.chain = landed.state;
  }
}
