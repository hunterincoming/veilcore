// The claims contract as the client runs it (src/claims.ts): the witnesses read one call's
// input from private state. (v1's ledger-8 deploy-subset tests are not ported: v2 has no
// ledger-8 deploy class.)
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type CircuitContext,
} from "@midnight-ntwrk/compact-runtime";
import {
  CLAIMS_PROVABLE_CIRCUITS,
  ClaimKind,
  RangeOp,
  type ClaimInput,
  type ClaimsPrivateState,
  claimsLedger,
  claimsWitnesses,
  emptyClaimsPrivateState,
} from "../claims.js";
import { Contract } from "../managed/veilcore-claims/contract/index.js";
import { type FieldSetFile, sealFieldSetFile } from "../field-schema.js";
import { numberFrom, openSlot } from "../fields.js";
import { newAttesterKey, signRecord } from "../attest.js";

const COIN = "0".repeat(64);
const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");
const V = JSON.parse(
  readFileSync(
    new URL("../../../contract/vectors/fields-v1.json", import.meta.url),
    "utf8",
  ),
) as { fieldSets: { input: Omit<FieldSetFile, "jsonDigest"> }[] };
const FILE: FieldSetFile = {
  ...V.fieldSets[0].input,
  jsonDigest: "cd".repeat(32),
};
const sealed = sealFieldSetFile(FILE);

type Ctx = CircuitContext<ClaimsPrivateState>;
/** A fresh deploy, with one call's input in private state (runtime 0.21: a context per call). */
const fresh = async (input: ClaimInput = {}): Promise<Ctx> => {
  const c = new Contract<ClaimsPrivateState>(claimsWitnesses);
  const init = await c.initialState(
    createConstructorContext(emptyClaimsPrivateState(), COIN),
  );
  return createCircuitContext({
    circuitId: "test",
    contractAddress: sampleContractAddress(),
    coinPublicKeyOrZswapState: COIN,
    contractState: init.currentContractState,
    privateState: { input },
  });
};
const impure = new Contract<ClaimsPrivateState>(claimsWitnesses).impureCircuits;

describe("the claims contract wrapper", () => {
  it("knows all five circuits that need a key", () => {
    expect([...CLAIMS_PROVABLE_CIRCUITS]).toEqual(
      [
        "proveAttested",
        "proveDistinct",
        "proveRange",
        "proveUnchanged",
        "proveValue",
      ].sort(),
    );
  });

  it("a range claim reads its input from private state and publishes the bound", async () => {
    const ctx = await fresh({
      opening: openSlot(sealed.fieldSet, 12),
      number: 9650n,
      terms: sealed.terms,
    });
    const r = await impure.proveRange(
      ctx,
      sealed.commitment,
      sealed.schemaId,
      12n,
      RangeOp.AT_LEAST,
      9500n,
    );
    const l = claimsLedger(r.context.callContext.currentQueryContext.state);
    expect(l.lastClaimKind).toBe(ClaimKind.RANGE);
    expect(hex(l.lastClaimRecord)).toBe(hex(sealed.commitment));
    expect(hex(l.lastClaimSchema)).toBe(hex(sealed.schemaId));
    expect(numberFrom(l.lastClaimParam)).toBe(9500n);
    // The witnesses hand the private state back untouched.
    expect(r.context.callContext.currentPrivateState?.input.number).toBe(9650n);
  });

  it("a claim missing part of its input is never built, and says what is missing", async () => {
    const ctx = await fresh({ opening: openSlot(sealed.fieldSet, 12) });
    await expect(() =>
      impure.proveRange(
        ctx,
        sealed.commitment,
        sealed.schemaId,
        12n,
        RangeOp.AT_LEAST,
        1n,
      ),
    ).rejects.toThrow(/needs the schema's terms/);
  });

  it("an out-of-bound range is refused by the circuit", async () => {
    const ctx = await fresh({
      opening: openSlot(sealed.fieldSet, 12),
      number: 9650n,
      terms: sealed.terms,
    });
    await expect(() =>
      impure.proveRange(
        ctx,
        sealed.commitment,
        sealed.schemaId,
        12n,
        RangeOp.AT_LEAST,
        9651n,
      ),
    ).rejects.toThrow(/does not meet the bound/);
  });

  it("a laboratory's attested claim publishes the record and the laboratory's key", async () => {
    const lab = newAttesterKey();
    const ctx = await fresh({
      attester: lab.key,
      signature: signRecord(lab.secret, sealed.commitment),
    });
    const r = await impure.proveAttested(ctx, sealed.commitment);
    const l = claimsLedger(r.context.callContext.currentQueryContext.state);
    expect(l.lastClaimKind).toBe(ClaimKind.ATTESTED);
    expect(hex(l.lastClaimRecord)).toBe(hex(sealed.commitment));
    expect(l.lastClaimAttesterX).toBe(lab.key.x);
    expect(l.lastClaimAttesterY).toBe(lab.key.y);
  });
});
