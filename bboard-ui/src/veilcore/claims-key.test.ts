// The claims key and its binding (claims-key.ts): derived from the attester key, bound per record,
// and every way to get a lab's name onto a key it doesn't hold, refused.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { generateKeypair } from 'veilcore-records';
import {
  bindingHash,
  bindingIdSuffix,
  claimsKeyFor,
  ed25519SeedOf,
  findBinding,
  isClaimsKeyBinding,
  ownerProofChecks,
  type BindingCandidate,
} from './claims-key';
import { SCHEMAS } from './field-set';
import { fieldSchemaId } from '../../../contract/src/field-schema';

const RECORD = 'aa'.repeat(32);
const PLANT = 'bb'.repeat(32);
const REPORT_ID = 'att_00112233445566ff_ld1';

/** The lab's own report signature on the plant (lab-doc.ts), which the binding names. */
const report = (lab: { publicKey: string }, over: Partial<BindingCandidate> = {}): BindingCandidate => ({
  attestationId: REPORT_ID,
  type: 'laboratory-report',
  subjectCommitment: PLANT,
  documentHash: 'ee'.repeat(32),
  attester: { publicKey: lab.publicKey },
  signatureValid: true,
  retraction: null,
  ...over,
});

const binding = (
  lab: { publicKey: string },
  suffix: string,
  over: Partial<BindingCandidate> = {},
  docHash?: string,
): BindingCandidate => ({
  attestationId: `att_0123456789abcdef${suffix}`,
  type: 'other',
  subjectCommitment: RECORD,
  documentHash: docHash ?? '',
  attester: { publicKey: lab.publicKey },
  signatureValid: true,
  retraction: null,
  ...over,
});

describe('the claims key', () => {
  it('comes from the attester key: the same every time, different per rotation and per lab', async () => {
    const lab = await generateKeypair();
    expect(ed25519SeedOf(lab.privateKey)).toHaveLength(32);
    const a = claimsKeyFor(lab.privateKey);
    expect(claimsKeyFor(lab.privateKey).keyText).toBe(a.keyText);
    expect(claimsKeyFor(lab.privateKey, 1).keyText).not.toBe(a.keyText);
    expect(claimsKeyFor((await generateKeypair()).privateKey).keyText).not.toBe(a.keyText);
    expect(a.keyText).toMatch(/^[0-9a-f]{128}$/);
    expect(() => ed25519SeedOf('00ff')).toThrow();
  });

  it('fits in an attestation id, which the registry caps at 200 characters', async () => {
    const lab = await generateKeypair();
    const suffix = bindingIdSuffix(claimsKeyFor(lab.privateKey), lab.publicKey);
    expect(`att_0123456789abcdef${suffix}`.length).toBeLessThanOrEqual(200);
    expect(isClaimsKeyBinding(`att_x${suffix}`)).toBe(true);
    expect(isClaimsKeyBinding('att_x_ld1')).toBe(false);
  });
});

describe('a binding', () => {
  it('names the lab that holds the key, on this record, about this plant', async () => {
    const lab = await generateKeypair();
    const k = claimsKeyFor(lab.privateKey);
    const b = binding(lab, bindingIdSuffix(k, lab.publicKey), {}, bindingHash(k.keyText, PLANT, REPORT_ID));
    expect(findBinding([b], RECORD, k.key, PLANT, [report(lab)])).toEqual({ kind: 'bound', attestation: b });
  });

  it('is not believed about another plant, another record, unsigned, or as another type', async () => {
    const lab = await generateKeypair();
    const k = claimsKeyFor(lab.privateKey);
    const b = binding(lab, bindingIdSuffix(k, lab.publicKey), {}, bindingHash(k.keyText, PLANT, REPORT_ID));
    expect(findBinding([b], RECORD, k.key, 'cc'.repeat(32), [report(lab)]).kind).toBe('none');
    expect(findBinding([b], 'dd'.repeat(32), k.key, PLANT, [report(lab)]).kind).toBe('none');
    expect(findBinding([{ ...b, signatureValid: false }], RECORD, k.key, PLANT, [report(lab)]).kind).toBe('none');
    expect(findBinding([{ ...b, type: 'laboratory-report' }], RECORD, k.key, PLANT, [report(lab)]).kind).toBe('none');
  });

  it('can’t be posted by another registered lab for a key it doesn’t hold', async () => {
    const real = await generateKeypair();
    const other = await generateKeypair();
    const k = claimsKeyFor(real.privateKey);
    // The other lab copies the real lab's owner proof: it names the real lab, not the other.
    const copied = binding(other, bindingIdSuffix(k, real.publicKey), {}, bindingHash(k.keyText, PLANT, REPORT_ID));
    expect(findBinding([copied], RECORD, k.key, PLANT, [report(real), report(other)]).kind).toBe('none');
    // Its own claims key's proof, for the real lab's key: doesn't check.
    const own = binding(
      other,
      bindingIdSuffix(claimsKeyFor(other.privateKey), other.publicKey),
      {},
      bindingHash(k.keyText, PLANT, REPORT_ID),
    );
    expect(findBinding([own], RECORD, k.key, PLANT, [report(real), report(other)]).kind).toBe('none');
    expect(ownerProofChecks(own.attestationId, k.key, other.publicKey)).toBe(false);
  });

  it('two labs bound to one key on one record: no name', async () => {
    const a = await generateKeypair();
    const b = await generateKeypair();
    const k = claimsKeyFor(a.privateKey);
    // Only possible if the claims secret leaked; even then, no name is printed.
    const h = bindingHash(k.keyText, PLANT, REPORT_ID);
    const ba = binding(a, bindingIdSuffix(k, a.publicKey), {}, h);
    const bb = binding(b, bindingIdSuffix(k, b.publicKey), {}, h);
    expect(findBinding([ba, bb], RECORD, k.key, PLANT, [report(a), report(b)]).kind).toBe('conflict');
  });

  it('withdrawn by the lab reads as withdrawn', async () => {
    const lab = await generateKeypair();
    const k = claimsKeyFor(lab.privateKey);
    const b = binding(
      lab,
      bindingIdSuffix(k, lab.publicKey),
      { retraction: { reason: 'issued-in-error' } },
      bindingHash(k.keyText, PLANT, REPORT_ID),
    );
    expect(findBinding([b], RECORD, k.key, PLANT, [report(lab)]).kind).toBe('retracted');
  });

  it('goes with its report: no standing report signature by that lab on that plant, no name', async () => {
    const lab = await generateKeypair();
    const other = await generateKeypair();
    const k = claimsKeyFor(lab.privateKey);
    const b = binding(lab, bindingIdSuffix(k, lab.publicKey), {}, bindingHash(k.keyText, PLANT, REPORT_ID));
    // No report signature at all, or one by another lab, or about another plant, or unsigned.
    expect(findBinding([b], RECORD, k.key, PLANT, []).kind).toBe('none');
    expect(findBinding([b], RECORD, k.key, PLANT, [report(other)]).kind).toBe('none');
    expect(findBinding([b], RECORD, k.key, PLANT, [report(lab, { subjectCommitment: 'cc'.repeat(32) })]).kind).toBe(
      'none',
    );
    expect(findBinding([b], RECORD, k.key, PLANT, [report(lab, { signatureValid: false })]).kind).toBe('none');
    // A different report by the same lab on the same plant: not the one the binding names.
    expect(
      findBinding([b], RECORD, k.key, PLANT, [report(lab, { attestationId: 'att_ffeeddccbbaa0099_ld1' })]).kind,
    ).toBe('none');
    // The lab withdrew the report, from anywhere: the numbers' name goes with it.
    expect(
      findBinding([b], RECORD, k.key, PLANT, [report(lab, { retraction: { reason: 'issued-in-error' } })]).kind,
    ).toBe('retracted');
  });

  it('reads only an Ed25519 key, by its exact form', async () => {
    const lab = await generateKeypair();
    // The same bytes under X25519's identifier (1.3.101.110): refused.
    expect(() => ed25519SeedOf(lab.privateKey.replace('06032b6570', '06032b656e'))).toThrow();
  });

  it('a damaged owner proof is refused, not read', async () => {
    const lab = await generateKeypair();
    const k = claimsKeyFor(lab.privateKey);
    const suffix = bindingIdSuffix(k, lab.publicKey);
    const flip = suffix.slice(0, -2) + (suffix.endsWith('AA') ? 'AB' : 'AA');
    expect(ownerProofChecks(`att_x${flip}`, k.key, lab.publicKey)).toBe(false);
    expect(ownerProofChecks('att_x_ck1_***', k.key, lab.publicKey)).toBe(false);
    expect(ownerProofChecks('att_x_ck1_', k.key, lab.publicKey)).toBe(false);
  });
});

describe('the check page', () => {
  it('names the lab only through a binding it checks, about the plant the link names', async () => {
    const { checkClaim } = await import('./chain/claim-check');
    const lab = await generateKeypair();
    const k = claimsKeyFor(lab.privateKey);
    const CONTRACT = 'c1'.repeat(32);
    const link = {
      kind: 'range' as const,
      contract: CONTRACT,
      txId: 'ab'.repeat(32),
      record: RECORD,
      schema: 'veilcore/schema/seed-quality/v1',
      slot: 0,
      op: 'at-least' as const,
      bound: '9500',
      attested: { txId: 'cd'.repeat(32), attester: k.keyText, about: PLANT },
    };
    const onChainRange = {
      kind: 'range',
      record: Uint8Array.from(Buffer.from(RECORD, 'hex')),
      schema: fieldSchemaId(SCHEMAS['veilcore/schema/seed-quality/v1']),
      slot: 0,
      op: 'at least',
      bound: 9500n,
    };
    const onChainAttested = { kind: 'attested', record: Uint8Array.from(Buffer.from(RECORD, 'hex')), attester: k.key };
    const read = (_c: string, txId: string) =>
      Promise.resolve({ claim: (txId === link.txId ? onChainRange : onChainAttested) as never, blockHeight: 7 });
    const good = binding(lab, bindingIdSuffix(k, lab.publicKey), {}, bindingHash(k.keyText, PLANT, REPORT_ID));
    const lists = (r: string) => Promise.resolve(r === PLANT ? [report(lab)] : [good]);
    const v = await checkClaim(link, { read, contract: CONTRACT, attestations: lists });
    expect(v.ok && v.lab).toMatchObject({ ok: true, signer: { kind: 'bound' } });
    // The same binding, for a link saying the numbers are about another plant: no name.
    const elsewhere = await checkClaim(
      { ...link, attested: { ...link.attested, about: 'ee'.repeat(32) } },
      { read, contract: CONTRACT, attestations: lists },
    );
    expect(elsewhere.ok && elsewhere.lab?.ok && elsewhere.lab.signer).toEqual({ kind: 'none' });
    // No plant named in the link (an older link): no name, the registry is not asked.
    let asked = false;
    const { about: _drop, ...noAbout } = link.attested;
    void _drop;
    const old = await checkClaim(
      { ...link, attested: noAbout },
      { read, contract: CONTRACT, attestations: (r: string) => ((asked = true), lists(r)) },
    );
    expect(old.ok && old.lab?.ok && old.lab.signer).toEqual({ kind: 'none' });
    expect(asked).toBe(false);
  });

  it('a v1 binding names the lab only while the plant’s holder shows the report it names', async () => {
    // The registry keeps a lab's report private (8 Nov 2026) and lists it by the plant's proof
    // code only while its holder shows it (shared-by-proof-code-v1, 12 Nov 2026): the claim
    // page reads the plant's list by that proof code, as a stranger, and nothing else.
    const { checkClaim } = await import('./chain/claim-check');
    const lab = await generateKeypair();
    const k = claimsKeyFor(lab.privateKey);
    const CONTRACT = 'c1'.repeat(32);
    const link = {
      kind: 'range' as const,
      contract: CONTRACT,
      txId: 'ab'.repeat(32),
      record: RECORD,
      schema: 'veilcore/schema/seed-quality/v1',
      slot: 0,
      op: 'at-least' as const,
      bound: '9500',
      attested: { txId: 'cd'.repeat(32), attester: k.keyText, about: PLANT },
    };
    const onChain = {
      [link.txId]: {
        kind: 'range',
        record: Uint8Array.from(Buffer.from(RECORD, 'hex')),
        schema: fieldSchemaId(SCHEMAS['veilcore/schema/seed-quality/v1']),
        slot: 0,
        op: 'at least',
        bound: 9500n,
      },
      [link.attested.txId]: { kind: 'attested', record: Uint8Array.from(Buffer.from(RECORD, 'hex')), attester: k.key },
    };
    const read = (_c: string, txId: string) => Promise.resolve({ claim: onChain[txId] as never, blockHeight: 7 });
    const good = binding(lab, bindingIdSuffix(k, lab.publicKey), {}, bindingHash(k.keyText, PLANT, REPORT_ID));
    let shown = false;
    const lists = (r: string) => Promise.resolve(r === PLANT ? (shown ? [report(lab)] : []) : [good]);
    const hidden = await checkClaim(link, { read, contract: CONTRACT, attestations: lists });
    expect(hidden.ok && hidden.lab?.ok && hidden.lab.signer).toEqual({ kind: 'none' });
    shown = true;
    const named = await checkClaim(link, { read, contract: CONTRACT, attestations: lists });
    expect(named.ok && named.lab).toMatchObject({ ok: true, signer: { kind: 'bound' } });
    // Taken back: no name again.
    shown = false;
    const again = await checkClaim(link, { read, contract: CONTRACT, attestations: lists });
    expect(again.ok && again.lab?.ok && again.lab.signer).toEqual({ kind: 'none' });
  });
});
