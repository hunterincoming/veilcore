// Test helper: real ledger transactions built offline, with either ledger: Ledger 9 (mainnet
// since its 6 November 2026 fork; the default) or Ledger 8 (a network not yet forked), `kit(L)`. The proofs are placeholders (the
// ledger accepts any well-formed proof bytes when assembling), which is enough to test
// what the sponsor reads; the network would reject them, and nothing here sends them.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as Ledger8 from "@midnightntwrk/ledger-v8";
import * as Ledger9 from "@midnightntwrk/ledger-v9";

const FIXTURE_VK = new Uint8Array(
  readFileSync(
    resolve(
      import.meta.dirname,
      '../../node_modules/@midnight-ntwrk/testkit-js/dist/fixtures/hf/counter-016/compiled/keys/increment.verifier',
    ),
  ),
);

/** The two ledgers' modules have the same classes and functions used here. */
type Ledger = typeof Ledger9;

/** Everything below, built with ledger `L`. */
export const kit = (L: Ledger) => {
  const {
    communicationCommitmentRandomness,
    ContractCallPrototype,
    ContractDeploy,
    ContractOperation,
    ContractState,
    CostModel,
    createShieldedCoinInfo,
    DustActions,
    Intent,
    MaintenanceUpdate,
    Proof,
    sampleCoinPublicKey,
    sampleContractAddress,
    sampleEncryptionPublicKey,
    sampleUserAddress,
    shieldedToken,
    Transaction,
    UnshieldedOffer,
    unshieldedToken,
    ZswapOffer,
    ZswapOutput,
  } = L;
  type UnprovenIntent = Ledger9.UnprovenIntent;
  type UnprovenTransaction = Ledger9.UnprovenTransaction;

  const VC = sampleContractAddress();
  const OTHER = sampleContractAddress();

  const empty = { value: [], alignment: [] };
  const placeholderProver = {
    check: () => Promise.resolve([]),
    prove: () => Promise.resolve(new Proof("0100").serialize()),
    // Ledger 9's prover asks for each circuit's files before proving; placeholders do (the
    // verifier key is a real pre-fork one, midnight-js 5's own fixture, as Ledger 9 parses it).
    lookupKey: () => Promise.resolve({ proverKey: new Uint8Array(), verifierKey: FIXTURE_VK, ir: new Uint8Array() }),
  };

  const call = (circuit: string, address = VC) =>
    new ContractCallPrototype(
      address,
      circuit,
      new ContractOperation(),
      undefined,
      undefined,
      [],
      empty,
      empty,
      communicationCommitmentRandomness(),
      circuit,
    );

  const ttlIn = (ms: number, from = Date.now()) => new Date(from + ms);

  const intentWith = (ttl: Date, ...circuits: string[]): UnprovenIntent => {
    let i = Intent.new(ttl);
    for (const c of circuits) i = i.addCall(call(c));
    return i;
  };

  /** Prove with placeholder proofs and seal (bind): what the browser sends. */
  const seal = async (tx: UnprovenTransaction): Promise<Uint8Array> =>
    (await tx.prove(placeholderProver, CostModel.initialCostModel()))
      .bind()
      .serialize();

  const sealedCall = (
    circuit = "anchor",
    ttl = ttlIn(10 * 60_000),
    address = VC,
  ) =>
    seal(
      Transaction.fromParts(
        "preprod",
        undefined,
        undefined,
        Intent.new(ttl).addCall(call(circuit, address)),
      ),
    );

  const hostile = {
    unproven: (ttl = ttlIn(600_000)) =>
      Transaction.fromParts(
        "preprod",
        undefined,
        undefined,
        intentWith(ttl, "anchor"),
      ).serialize(),
    provenNotBound: async (ttl = ttlIn(600_000)) =>
      (
        await Transaction.fromParts(
          "preprod",
          undefined,
          undefined,
          intentWith(ttl, "anchor"),
        ).prove(placeholderProver, CostModel.initialCostModel())
      ).serialize(),
    twoCalls: () =>
      seal(
        Transaction.fromParts(
          "preprod",
          undefined,
          undefined,
          intentWith(ttlIn(600_000), "anchor", "pairDna"),
        ),
      ),
    deploy: () =>
      Transaction.fromParts(
        "preprod",
        undefined,
        undefined,
        Intent.new(ttlIn(600_000)).addDeploy(
          new ContractDeploy(new ContractState()),
        ),
      )
        .mockProve()
        .serialize(),
    maintenance: () =>
      Transaction.fromParts(
        "preprod",
        undefined,
        undefined,
        Intent.new(ttlIn(600_000)).addMaintenanceUpdate(
          new MaintenanceUpdate(VC, [], 0n),
        ),
      )
        .mockProve()
        .serialize(),
    shieldedOffer: () => {
      const coin = createShieldedCoinInfo(shieldedToken().raw, 10n);
      const offer = ZswapOffer.fromOutput(
        ZswapOutput.new(
          coin,
          0,
          sampleCoinPublicKey(),
          sampleEncryptionPublicKey(),
        ),
        shieldedToken().raw,
        10n,
      );
      return seal(
        Transaction.fromParts(
          "preprod",
          offer,
          undefined,
          intentWith(ttlIn(600_000), "anchor"),
        ),
      );
    },
    unshieldedOffer: () => {
      const i = intentWith(ttlIn(600_000), "anchor");
      i.guaranteedUnshieldedOffer = UnshieldedOffer.new(
        [],
        [
          {
            value: 5n,
            owner: sampleUserAddress(),
            type: unshieldedToken().raw,
          },
        ],
        [],
      );
      return seal(Transaction.fromParts("preprod", undefined, undefined, i));
    },
    dustActions: () => {
      const i = intentWith(ttlIn(600_000), "anchor");
      i.dustActions = new DustActions(
        "signature",
        "pre-proof",
        new Date(),
        [],
        [],
      );
      return seal(Transaction.fromParts("preprod", undefined, undefined, i));
    },
    twoIntents: () => {
      const a = Transaction.fromPartsRandomized(
        "preprod",
        undefined,
        undefined,
        intentWith(ttlIn(600_000), "anchor"),
      );
      const b = Transaction.fromPartsRandomized(
        "preprod",
        undefined,
        undefined,
        intentWith(ttlIn(600_000), "pairDna"),
      );
      return seal(a.merge(b));
    },
  };
  return { VC, OTHER, call, ttlIn, intentWith, seal, sealedCall, hostile };
};

/** The ledger the tests use by default: VEILCORE_TEST_ERA=v8 for Ledger 8, else Ledger 9. */
export const LEDGER: Ledger =
  process.env.VEILCORE_TEST_ERA === "v8"
    ? (Ledger8 as unknown as Ledger)
    : Ledger9;
export const { VC, OTHER, call, ttlIn, intentWith, seal, sealedCall, hostile } =
  kit(LEDGER);
