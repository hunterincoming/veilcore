// A record that names its own key (key-binding.ts, docs/identity-in-record.md): the
// published vectors (contract/vectors/key-bound-v1.json, also checked by the registry and
// an independent Python checker), older records unchanged byte for byte, and what a check
// page does with a link whose key isn't the record's.
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { pureCircuits } from '../../../contract/src/managed/veilcore/contract/index.js';
import {
  KEY_NOT_THIS_RECORDS,
  bindingForSecret,
  checkLinkKey,
  identityFromSecret,
  keyBindingOf,
  keyBoundFingerprint,
  keyMatchesRecord,
  keySaltOf,
} from './key-binding';
import { contentHashOf, fingerprintRecord, newNonce, type CommittedRecordInput } from './commitment';

type Vectors = {
  keys: { recordSecret: string; identity: string; keySalt: string; keyBinding: string }[];
  records: { name: string; fields: CommittedRecordInput; contentHash: string; fingerprint: string }[];
  checks: {
    name: string;
    identity: string;
    fingerprint: string;
    keySalt: string;
    contentHash: string;
    matches: boolean;
  }[];
  refusals: { name: string; fields: CommittedRecordInput }[];
};
const read = <T>(p: string): T => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8')) as T;
const V = read<Vectors>('../../../contract/vectors/key-bound-v1.json');
const OLD = read<{ sdk: string; records: (CommittedRecordInput & { id: string; recordFingerprint?: string })[] }>(
  './fixtures/site-records-0.13.json',
);
const hex = () => randomBytes(32).toString('hex');

describe('the published vectors', () => {
  it('keys: identity, salt and binding from the record secret', () => {
    for (const k of V.keys) {
      expect(identityFromSecret(k.recordSecret)).toBe(k.identity);
      expect(keySaltOf(k.recordSecret)).toBe(k.keySalt);
      expect(keyBindingOf(k.identity, k.keySalt)).toBe(k.keyBinding);
      expect(bindingForSecret(k.recordSecret)).toEqual({
        identity: k.identity,
        keySalt: k.keySalt,
        keyBinding: k.keyBinding,
      });
    }
  });

  it('records: the content hash and the fingerprint, older and bound', async () => {
    for (const r of V.records) {
      expect(await contentHashOf(r.fields), r.name).toBe(r.contentHash);
      expect(await fingerprintRecord(r.fields), r.name).toBe(r.fingerprint);
    }
  });

  it('checks: a key matches only the record that named it', () => {
    for (const c of V.checks) expect(keyMatchesRecord(c.identity, c), c.name).toBe(c.matches);
  });

  it('refusals: a malformed keyBinding is never sealed', async () => {
    for (const r of V.refusals) await expect(fingerprintRecord(r.fields), r.name).rejects.toThrow(/keyBinding/);
  });
});

describe('the key', () => {
  it('is the contract’s own commit(record secret), so it exists before anything goes on chain', () => {
    for (let i = 0; i < 20; i++) {
      const s = hex();
      expect(identityFromSecret(s)).toBe(Buffer.from(pureCircuits.commit(Buffer.from(s, 'hex'))).toString('hex'));
    }
  });

  it('is hidden from the record: the binding alone says nothing about which key it is', () => {
    const { identity, keyBinding } = bindingForSecret(hex());
    expect(keyBinding).not.toBe(identity);
    // Without the salt, trying the key itself (or any other) doesn't reproduce the binding.
    expect(keyBindingOf(identity, identity)).not.toBe(keyBinding);
  });
});

describe('older records', () => {
  it('records the site wrote under 0.13 recompute byte for byte, unchanged', async () => {
    const sealed = OLD.records.filter((r) => r.recordFingerprint && r.nonce);
    expect(sealed.length).toBeGreaterThan(3);
    for (const r of sealed) {
      expect((r as { keyBinding?: string }).keyBinding).toBeUndefined();
      expect(await fingerprintRecord(r), r.id).toBe(r.recordFingerprint);
    }
  });

  it('a binding added to an older record after sealing changes its fingerprint (refused on save)', async () => {
    const r = OLD.records.find((x) => x.recordFingerprint && x.nonce)!;
    const added = await fingerprintRecord({ ...r, keyBinding: bindingForSecret(hex()).keyBinding });
    expect(added).not.toBe(r.recordFingerprint);
  });
});

describe('sealing a new record', () => {
  const fields = (keyBinding: string): CommittedRecordInput => ({
    nonce: newNonce(),
    keyBinding,
    strainName: 'Harbour Mist',
    bredBy: 'Example Farm',
    dateCreated: '2026-10-14',
    notes: '',
    loggedAt: 1760400000000,
    profile: 'veilcore/profile/plant-variety/v1',
  });

  it('folds the key in at the top: the link’s parts recompute the fingerprint', async () => {
    const secret = hex();
    const { identity, keySalt, keyBinding } = bindingForSecret(secret);
    const f = fields(keyBinding);
    const fingerprint = await fingerprintRecord(f);
    const contentHash = await contentHashOf(f);
    expect(fingerprint).toBe(keyBoundFingerprint(keyBinding, contentHash));
    expect(keyMatchesRecord(identity, { fingerprint, keySalt, contentHash })).toBe(true);
  });

  it('the same details with another key give another fingerprint', async () => {
    const f = fields(bindingForSecret(hex()).keyBinding);
    const g = { ...f, keyBinding: bindingForSecret(hex()).keyBinding };
    expect(await fingerprintRecord(f)).not.toBe(await fingerprintRecord(g));
  });
});

describe('a check page reading a link', () => {
  const [mine, theirs] = [bindingForSecret(hex()), bindingForSecret(hex())];
  const contentHash = hex();
  const fingerprint = keyBoundFingerprint(mine.keyBinding, contentHash);

  it('a link naming the record’s own key: bound', () => {
    expect(
      checkLinkKey({ identity: mine.identity, fingerprint, keySalt: mine.keySalt, contentHash, keyBound: true }),
    ).toEqual({ kind: 'bound', record: { fingerprint, keySalt: mine.keySalt, contentHash } });
  });

  it('an attacker swaps chain= for a key they control: refused, with the reason', () => {
    for (const keySalt of [mine.keySalt, theirs.keySalt]) {
      expect(checkLinkKey({ identity: theirs.identity, fingerprint, keySalt, contentHash, keyBound: true })).toEqual({
        kind: 'refused',
        reason: KEY_NOT_THIS_RECORDS,
      });
    }
  });

  it('a link to a bound record with the key’s parts left out: refused, not the older wording', () => {
    const v = checkLinkKey({ identity: theirs.identity, fingerprint, keyBound: true });
    expect(v.kind).toBe('refused');
    expect(v.kind === 'refused' && v.reason).toMatch(/names its own key/);
  });

  it('a link whose fingerprint isn’t the record’s: refused', () => {
    const v = checkLinkKey({ identity: mine.identity, keySalt: mine.keySalt, contentHash, keyBound: true });
    expect(v.kind).toBe('refused');
  });

  it('an older record (the registry reports no key): the older wording', () => {
    expect(checkLinkKey({ identity: theirs.identity, fingerprint, keyBound: false })).toEqual({ kind: 'older' });
    expect(checkLinkKey({ identity: theirs.identity })).toEqual({ kind: 'older' });
  });
});

describe('the exported envelope', () => {
  it('names the key-bound form, and anyone can recompute the registered fingerprint from it', async () => {
    const { exportEnvelopeFor, REGISTERED_EXTENSION } = await import('./envelope');
    const { canonicalise } = await import('veilcore-records');
    const { createHash } = await import('node:crypto');
    const { keyBinding } = bindingForSecret(hex());
    const r = {
      id: 'VEIL-EXPORT',
      nonce: newNonce(),
      keyBinding,
      strainName: 'Harbour Mist',
      bredBy: 'Example Farm',
      dateCreated: '2026-10-14',
      notes: '',
      loggedAt: 1760400000000,
      recordFingerprint: '',
    };
    const rec = { ...r, recordFingerprint: await fingerprintRecord(r) };
    const env = await exportEnvelopeFor(rec, 'holder', 'match', { status: 'none' });
    const reg = (
      env.extensions as Record<string, { algorithm: string; fields: Record<string, unknown>; fingerprint: string }>
    )[REGISTERED_EXTENSION];
    expect(reg.algorithm).toBe('sha256/key-bound/v1');
    expect(reg.fields.keyBinding).toBe(keyBinding);
    const content = createHash('sha256').update(canonicalise(reg.fields), 'utf8').digest('hex');
    expect(keyBoundFingerprint(reg.fields.keyBinding as string, content)).toBe(reg.fingerprint);
  });
});

describe('the holder’s link (prove-link.ts)', () => {
  const anchorFor = (identity: string) => ({
    identity,
    network: 'preprod',
    contractAddress: 'c0'.repeat(32),
    txId: 'a7'.repeat(32),
    txHash: 'a7'.repeat(32),
    blockHeight: 1,
  });
  const recordWith = async (keyBinding?: string) => {
    const r = {
      id: 'VEIL-LINK',
      nonce: newNonce(),
      ...(keyBinding ? { keyBinding } : {}),
      strainName: 'Harbour Mist',
      bredBy: 'Example Farm',
      dateCreated: '2026-10-14',
      notes: '',
      loggedAt: 1760400000000,
      recordFingerprint: '',
    };
    return { ...r, recordFingerprint: await fingerprintRecord(r) };
  };

  it('a bound record’s link carries what the check page needs, and the check page accepts it', async () => {
    const { proveLinkParams } = await import('./prove-link');
    const secret = hex();
    const b = bindingForSecret(secret);
    const rec = await recordWith(b.keyBinding);
    const keys = {
      recordId: rec.id,
      recordSecret: secret,
      recoverySecret: hex(),
      createdAt: 1,
      anchor: anchorFor(b.identity),
    };
    const p = await proveLinkParams(rec, keys);
    expect(p).toMatchObject({ chain: b.identity, anchorTx: 'a7'.repeat(32), ks: b.keySalt });
    expect(
      checkLinkKey({
        identity: p!.chain,
        fingerprint: rec.recordFingerprint,
        keySalt: p!.ks,
        contentHash: p!.cd,
        keyBound: true,
      }).kind,
    ).toBe('bound');
    // Keys the record never named, or an anchor of another key: no link at all.
    expect(await proveLinkParams(rec, { ...keys, recordSecret: hex() })).toBeNull();
    expect(await proveLinkParams(rec, { ...keys, anchor: anchorFor(hex()) })).toBeNull();
  });

  it('an older record’s link names its key as before; no date stamp, no link', async () => {
    const { proveLinkParams } = await import('./prove-link');
    const rec = await recordWith();
    const identity = hex();
    const keys = { recordId: rec.id, recordSecret: hex(), recoverySecret: hex(), createdAt: 1 };
    expect(await proveLinkParams(rec, { ...keys, anchor: anchorFor(identity) })).toEqual({
      chain: identity,
      anchorTx: 'a7'.repeat(32),
    });
    expect(await proveLinkParams(rec, keys)).toBeNull();
  });
});
