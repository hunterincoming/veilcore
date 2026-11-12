// A laboratory's signature on a record's numbers (lab-attest.ts), end to end in memory: the
// holder's request, the laboratory's key and signature, the holder's check, the claims
// contract's own proveAttested circuit accepting it (simulator), and a claim link that names it
// being checked against what the contract recorded. Every tampered file is refused.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claimMaterial, commitmentHex, slotInput } from './claims-input';
import { makeFieldSet, OFFERED_SCHEMAS, SCHEMAS } from './field-set';
import {
  keyFromHex,
  keyHex,
  labRequestFor,
  labSignatureChecks,
  readLabRequest,
  readLabSignature,
  signLabRequest,
  signatureParts,
} from './lab-attest';
import { newAttesterKey, verifyRecordSignature } from '../../../contract/src/attest';
import { ClaimsSimulator } from '../../../contract/src/test/claims-simulator';
import { RangeOp } from '../../../contract/src/managed/veilcore-claims/contract/index.js';
import { claimFromCells } from '../../../contract/src/verify-claims';
import { claimLink, compareAttested, readClaimLink, type MadeClaim } from './claim-link';
import { checkClaim } from './chain/claim-check';
import { labSigningEnabledFor } from '../config/network';
import { REQUIRED_FEATURES } from '../../../scripts/registry-features.mjs';

/** A laboratory's signing key, as tests need one (the app derives it: claims-key.ts). */
const labKey = () => {
  const { secret, key } = newAttesterKey();
  return { secretN: secret, name: 'Lab', key: keyHex(key) };
};

const dir = path.dirname(fileURLToPath(import.meta.url));
const v = JSON.parse(fs.readFileSync(path.join(dir, '../../../contract/vectors/document-v1.json'), 'utf8')) as {
  records: { appRecord: Record<string, unknown>; fields: { keyBinding?: string }; fieldSet?: unknown }[];
};
const base = v.records.find((r) => r.fieldSet)!;
const SOY = 'veilcore/schema/variety-similarity/v1';
const CONTRACT = 'c1'.repeat(32);
const unhex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

/** A document record carrying a soybean similarity certificate: 94.37 %, 5,103 SNPs, 287 differ, 412 varieties. */
const similarityRecord = async () => {
  const { held, fieldSchema, fieldSetRoot } = await makeFieldSet(SOY, [9437n, 5103n, 287n, 12n, 201900123n, 1n]);
  return {
    ...base.appRecord,
    strainName: 'Similarity report SB-2026-118',
    fieldSchema,
    fieldSetRoot,
    fieldSet: held,
  } as never;
};

describe('the genetic forms', () => {
  it('are published, offered only to a laboratory, and name what was compared in numbers a claim can show', () => {
    for (const id of [SOY, 'veilcore/schema/variety-identity/v1', 'veilcore/schema/animal-parentage/v1']) {
      expect(SCHEMAS[id], id).toBeDefined();
      expect(OFFERED_SCHEMAS).not.toContain(id);
    }
    expect(SCHEMAS[SOY].slots.map((x) => x.path)).toContain('genetic.comparedVariety');
    expect(SCHEMAS['veilcore/schema/variety-identity/v1'].slots.map((x) => x.path)).toContain('identity.variety');
  });
});

describe('a request, signed by a laboratory', () => {
  it('round-trips, and the signature is one the contract’s own check accepts', async () => {
    const record = await similarityRecord();
    const req = await labRequestFor(record);
    const read = await readLabRequest(JSON.stringify(req));
    expect(read.commitment).toBe(commitmentHex(await claimMaterial(record)));
    const key = labKey();
    const sig = signLabRequest(key, read);
    expect(sig.key).toBe(key.key);
    const { key: point, signature } = signatureParts(sig);
    expect(verifyRecordSignature(point, unhex(read.commitment), signature)).toBe(true);
    expect(readLabSignature(JSON.stringify(sig), read.commitment)).toEqual(sig);
    expect(labSignatureChecks(sig, read.commitment)).toBe(true);
  });

  it('is refused when its numbers or fields were changed after it was made', async () => {
    const req = await labRequestFor(await similarityRecord());
    const values = [...req.record.fieldSet.values];
    values[0] = '9300';
    const changedNumber = { ...req, record: { ...req.record, fieldSet: { ...req.record.fieldSet, values } } };
    await expect(readLabRequest(JSON.stringify(changedNumber))).rejects.toThrow(/don’t make the root/);
    const changedTitle = { ...req, record: { ...req.record, strainName: 'Something else' } };
    await expect(readLabRequest(JSON.stringify(changedTitle))).rejects.toThrow(/don’t make the record/);
    await expect(readLabRequest('{"kind":"veilcore-lab-request"}')).rejects.toThrow(/isn’t a request/);
  });

  it('is refused when anything committed would be signed unseen, or written two ways', async () => {
    const req = await labRequestFor(await similarityRecord());
    const withValues = (values: (string | null)[]) => ({
      ...req,
      record: { ...req.record, fieldSet: { ...req.record.fieldSet, values } },
    });
    const v = [...req.record.fieldSet.values];
    // A number in slot 9, which the form doesn't name, so the laboratory would never see it.
    const hidden = [...v];
    hidden[9] = '1';
    await expect(readLabRequest(JSON.stringify(withValues(hidden)))).rejects.toThrow(/aren’t in the form/);
    // The same number written another way.
    for (const odd of ['09437', '0x24dd', ' 9437', '-1', '9437.0']) {
      const w = [...v];
      w[0] = odd;
      await expect(readLabRequest(JSON.stringify(withValues(w))), odd).rejects.toThrow(/aren’t in the form/);
    }
    await expect(readLabRequest(JSON.stringify(withValues(v.slice(0, 4))))).rejects.toThrow(/aren’t in the form/);
    // A sealed root that isn't these numbers' root, with the commitment recomputed to match.
    const lying = { ...req.record, fieldSetRoot: 'ab'.repeat(32) };
    const lyingReq = { ...req, record: lying, commitment: commitmentHex(await claimMaterial(lying)) };
    await expect(readLabRequest(JSON.stringify(lyingReq))).rejects.toThrow(/don’t make the root/);
    // Not a document record at all.
    const plant = { ...req.record, profile: 'veilcore/profile/cannabis/v1' };
    const plantReq = { ...req, record: plant, commitment: commitmentHex(await claimMaterial(plant)) };
    await expect(readLabRequest(JSON.stringify(plantReq))).rejects.toThrow(/isn’t a document record/);
  });

  it('gives a signature that is refused on any other record, by any other key, or altered', async () => {
    const a = await labRequestFor(await similarityRecord());
    const b = await labRequestFor(await similarityRecord()); // same numbers, fresh salts: another record
    expect(a.commitment).not.toBe(b.commitment);
    const key = labKey();
    const sig = signLabRequest(key, a);
    expect(() => readLabSignature(JSON.stringify(sig), b.commitment)).toThrow(/different record/);
    // Moved to the other record by hand: the signature no longer checks.
    expect(() => readLabSignature(JSON.stringify({ ...sig, record: b.commitment }), b.commitment)).toThrow(
      /doesn’t check/,
    );
    const other = labKey().key;
    expect(() => readLabSignature(JSON.stringify({ ...sig, key: other }), a.commitment)).toThrow(/doesn’t check/);
    expect(() =>
      readLabSignature(JSON.stringify({ ...sig, s: (BigInt(sig.s) + 1n).toString() }), a.commitment),
    ).toThrow(/doesn’t check/);
    expect(() => readLabSignature(JSON.stringify({ ...sig, key: '00'.repeat(64) }), a.commitment)).toThrow(
      /isn’t a laboratory signing key/,
    );
    expect(labSignatureChecks({ ...sig, s: '1' }, a.commitment)).toBe(false);
  });
});

describe('on the claims contract', () => {
  it('proveAttested accepts the browser’s signature, and a claim link naming it checks', async () => {
    const record = await similarityRecord();
    const m = await claimMaterial(record);
    const key = labKey();
    const sig = signLabRequest(key, await labRequestFor(record));
    const { key: attester, signature } = signatureParts(sig);

    const sim = new ClaimsSimulator();
    sim.call({ attester, signature }, 'proveAttested', m.commitment);
    const attested = claimFromCells(sim.state);
    expect(attested.kind).toBe('attested');
    expect(keyHex(attested.attester!)).toBe(key.key);

    // "Similarity to the closest variety is at most 95.00 %": slot 0 at most 9500.
    const { opening, number } = slotInput(m, 0);
    sim.call({ opening, number, terms: m.terms }, 'proveRange', m.commitment, m.schemaId, 0n, RangeOp.AT_MOST, 9500n);
    const range = claimFromCells(sim.state);

    const link: MadeClaim = {
      kind: 'range',
      contract: CONTRACT,
      txId: 'ab'.repeat(32),
      record: commitmentHex(m),
      schema: SOY,
      slot: 0,
      op: 'at-most',
      bound: '9500',
      attested: { txId: 'cd'.repeat(32), attester: key.key },
    };
    expect(readClaimLink(claimLink(link, 'https://veilcore.org').split('/check-claim')[1])).toEqual(link);
    expect(compareAttested(link, attested)).toEqual({ ok: true, attester: key.key });

    const read = (_c: string, txId: string) =>
      Promise.resolve(
        txId === link.txId ? { claim: range, blockHeight: 9 } : { claim: attested, blockHeight: 8, blockTime: 5 },
      );
    expect(await checkClaim(link, { read, contract: CONTRACT })).toEqual({
      ok: true,
      blockHeight: 9,
      lab: { ok: true, attester: key.key, blockHeight: 8, blockTime: 5, signer: { kind: 'none' } },
    });

    // The link names another key, or its "signature" is the range claim itself: not confirmed.
    const wrongKey = { ...link, attested: { ...link.attested!, attester: labKey().key } };
    const w = await checkClaim(wrongKey, { read, contract: CONTRACT });
    expect(w.ok && w.lab && !w.lab.ok && w.lab.reason).toMatch(/different key/);
    const notASignature = { ...link, attested: { ...link.attested!, txId: link.txId } };
    const n = await checkClaim(notASignature, { read, contract: CONTRACT });
    expect(n.ok && n.lab && !n.lab.ok && n.lab.reason).toMatch(/not a laboratory signature/);
  });

  it('the contract refuses a laboratory’s signature offered for another record', async () => {
    const r1 = await similarityRecord();
    const r2 = await similarityRecord();
    const key = labKey();
    const sig = signLabRequest(key, await labRequestFor(r1));
    const { key: attester, signature } = signatureParts(sig);
    const other = (await claimMaterial(r2)).commitment;
    const sim = new ClaimsSimulator();
    expect(() => sim.call({ attester, signature }, 'proveAttested', other)).toThrow();
  });

  it('a link with a malformed signature part is not read at all', () => {
    const bad = (attested: unknown) =>
      readClaimLink(
        '#c=' +
          Buffer.from(
            JSON.stringify({
              v: 1,
              kind: 'range',
              contract: CONTRACT,
              txId: 'ab'.repeat(32),
              record: 'ee'.repeat(32),
              schema: SOY,
              slot: 0,
              op: 'at-most',
              bound: '9500',
              attested,
            }),
          ).toString('base64url'),
      );
    expect(bad({ txId: 'zz', attester: 'aa'.repeat(64) })).toBeUndefined();
    expect(bad({ txId: 'ab', attester: 'aa' })).toBeUndefined();
    expect(bad(null)).toBeUndefined();
    expect(bad({ txId: 'ab', attester: 'aa'.repeat(64) })).toBeDefined();
    // A claim on a slot the schema doesn't name is not a claim this page can describe.
    const link: MadeClaim = {
      kind: 'range',
      contract: CONTRACT,
      txId: 'ab'.repeat(32),
      record: 'ee'.repeat(32),
      schema: SOY,
      slot: 9,
      op: 'at-most',
      bound: '1',
    };
    expect(readClaimLink(claimLink(link, 'https://veilcore.org').split('/check-claim')[1])).toBeUndefined();
  });
});

describe('on veilcore.org', () => {
  it('laboratory signing and the genetic forms are on on mainnet, behind one switch that can turn them off', () => {
    const src = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8');
    // On in every build since 12 Nov 2026, after lab signatures went private (the registry's
    // private-lab-signatures-v1, which every site deploy requires).
    expect(labSigningEnabledFor('mainnet')).toBe(true);
    expect(labSigningEnabledFor('preprod')).toBe(true);
    expect(src('../config/network.ts')).toMatch(/const LAB_SIGNING_OFF: readonly string\[\] = \[\];/);
    expect(src('../config/network.ts')).toContain(
      'export const LAB_SIGNING_ENABLED: boolean = labSigningEnabledFor(NETWORK);',
    );
    expect(REQUIRED_FEATURES).toHaveProperty('private-lab-signatures-v1');
    // Every place that signs or offers signing still reads the one switch, so listing a network
    // in LAB_SIGNING_OFF turns all of it off there again.
    expect(src('../components/document/DocumentDetail.tsx')).toContain('LAB_SIGNING_ENABLED && <LabSignaturePanel');
    expect(src('../components/flow/LabResults.tsx')).toContain('LAB_SIGNING_ENABLED && file && kind &&');
    expect(src('../components/flow/LabResults.tsx')).toContain('if (numbersBytes && LAB_SIGNING_ENABLED)');
    expect(src('../components/flow/AppHome.tsx')).toContain('{LAB_SIGNING_ENABLED && (');
    expect(src('../App.tsx')).not.toContain('/lab"');
    expect(src('../veilcore/field-set.ts')).toMatch(/LAB_SCHEMAS: readonly string\[\] = LAB_SIGNING_ENABLED\s*\?/);
    expect(src('../veilcore/field-set.ts')).toMatch(/RESULT_CALL_SCHEMAS\.includes\(id\)\)\s*: \[\]/);
    // Lab results v2 (lab-result.ts): the lab's tools and the delivery flow's result box.
    expect(src('../components/lab/LabResultsPage.tsx')).toContain('!LAB_SIGNING_ENABLED ? (');
    // The check page offers adding and publishing a result (review, 8 Nov).
    expect(src('../components/lab/LabResultCheck.tsx')).toContain('!LAB_SIGNING_ENABLED ? (');
    expect(src('../components/flow/LabResults.tsx')).toContain('if (LAB_SIGNING_ENABLED && withResult)');
  });
});
