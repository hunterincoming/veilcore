// A claim from the browser, end to end against stand-ins (test-chain.ts): the claims contract's
// real compiled circuits and circuit IR, the real sealing, the real sponsor policy (paying
// claims on the claims contract only) and proof of work. What matters most: the sponsor would
// pay for it, a false bound never leaves the browser, and neither the number nor its salt is in
// anything that does.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { proveRangeOnChain, proveValueOnChain } from './claims-call';
import { ADDRESS, claimsContractState, standIns } from './test-chain';
import { claimMaterial, slotInput } from '../claims-input';

setNetworkId('preprod');
const dir = path.dirname(fileURLToPath(import.meta.url));
const v = JSON.parse(fs.readFileSync(path.join(dir, '../../../../contract/vectors/document-v1.json'), 'utf8')) as {
  records: {
    appRecord: Record<string, unknown>;
    fieldSet?: { schema: string; values: (string | null)[]; fieldSecret: string };
  }[];
};
const withSet = v.records.find((r) => r.fieldSet)!;
const record = {
  ...withSet.appRecord,
  fieldSet: {
    schema: withSet.fieldSet!.schema,
    values: [...withSet.fieldSet!.values, ...Array<null>(16 - withSet.fieldSet!.values.length).fill(null)],
    fieldSecret: withSet.fieldSet!.fieldSecret,
  },
} as never;
const contains = (hay: Uint8Array, needle: Uint8Array): boolean => Buffer.from(hay).indexOf(Buffer.from(needle)) !== -1;

describe('a claim from the browser (stand-in network)', () => {
  it('proveRange: proved, sealed, paid for by the sponsor on the claims contract, without the number or its salt', async () => {
    const r = standIns(await claimsContractState(), { claims: true });
    const m = await claimMaterial(record);
    const progress: string[] = [];
    const receipt = await proveRangeOnChain(m, 0, 'at-most', 300n, {
      deps: r.deps,
      contract: ADDRESS,
      progress: (x) => progress.push(x),
    });
    expect(receipt).toMatchObject({ circuit: 'proveRange', contract: ADDRESS, blockHeight: 42 });
    expect(r.checkedCircuits).toEqual(['proveRange']);
    expect(r.sealed).toHaveLength(1);
    const { opening } = slotInput(m, 0);
    // The record's commitment is public (that is what the claim is about); the slot's value
    // (210 as 32 bytes) and its salt are not.
    expect(contains(r.sealed[0], m.commitment)).toBe(true);
    expect(contains(r.sealed[0], opening.value)).toBe(false);
    expect(contains(r.sealed[0], opening.salt)).toBe(false);
    expect(r.requests.some((q) => (q.body ?? '').includes(withSet.fieldSet!.fieldSecret))).toBe(false);
    expect(progress.some((x) => /Proving on your device/.test(x))).toBe(true);
  });

  it('a false bound is refused in the browser: nothing is proved or sent', async () => {
    const r = standIns(await claimsContractState(), { claims: true });
    const m = await claimMaterial(record);
    await expect(proveRangeOnChain(m, 0, 'at-most', 200n, { deps: r.deps, contract: ADDRESS })).rejects.toThrow(
      /doesn’t meet that bound/,
    );
    expect(r.sealed).toHaveLength(0);
    expect(r.requests).toHaveLength(0);
  });

  it('proveValue: proved, sealed and paid for by the sponsor', async () => {
    const r = standIns(await claimsContractState(), { claims: true });
    const m = await claimMaterial(record);
    const receipt = await proveValueOnChain(m, 3, { deps: r.deps, contract: ADDRESS });
    expect(receipt.circuit).toBe('proveValue');
    expect(r.checkedCircuits).toEqual(['proveValue']);
    expect(r.sealed).toHaveLength(1);
  });

  it('stops before proving when the site’s proving files are not the claims contract’s', async () => {
    const r = standIns(await claimsContractState(), { claims: true, servedKeys: 'wrong' });
    const m = await claimMaterial(record);
    await expect(proveRangeOnChain(m, 0, 'at-most', 300n, { deps: r.deps, contract: ADDRESS })).rejects.toThrow(
      /proving files are not the ones the claims contract uses/,
    );
    expect(r.sealed).toHaveLength(0);
  });
});
