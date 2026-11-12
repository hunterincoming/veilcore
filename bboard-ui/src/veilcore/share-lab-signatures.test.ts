// Lab signatures the holder chooses to show on their check link (8 Nov 2026).
//
// The registry keeps a lab's reports and receipts private: only the holder, the delivery's
// parties and the lab can read them. The holder names the ones to show in the grant
// (values.sharedAttestations), /verify answers them as `sharedAttestations`, and the check
// page verifies each here exactly like the open list. Custody lines name their receipt only
// when it is shown; a line without one is still said, without the lab. The page never says
// "no lab signed" when the registry may simply be keeping signatures private.
//
// fetch and localStorage are stubbed; nothing touches the network.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeypair, signAttestation, signRetraction, type SignedAttestation } from 'veilcore-records';
import { checkAttestations, mergeAttestations, sharedAttestationsOf } from './attesters';
import { publicCustodyLines, publicCustodyOf, unnamedCustodyOf } from './custody';
import { grantValuesNow, resetSharedRefusal, sameGrantValues, saveGrant, registerGrantKeeper } from './disclosure';
import { publicReportLine } from './saved-report';
import type { StrainRecord } from './records';
import { appEn } from '../i18n/app/en';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';

const appTranslations = { en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa };

const PLANT = '1'.repeat(64);
const OTHER = '2'.repeat(64);
const HOLDER = 'ab'.repeat(32);

let lab: { publicKey: string; privateKey: string };
const signed = async (id: string, type: string, subject = PLANT): Promise<SignedAttestation> =>
  signAttestation(
    {
      attestationId: id,
      type,
      subjectCommitment: subject,
      attester: { publicKey: lab.publicKey, displayName: 'E2E Lab' },
      documentHash: 'e'.repeat(64),
      hashAlgorithm: 'sha256',
      issuedAt: '2026-11-08T10:00:00Z',
    },
    lab.privateKey,
  );
/** A row as /verify and /attestations/subject serve it. */
const row = (a: SignedAttestation, retraction: unknown = null) => ({
  ...a,
  strength: 'signed',
  vettedAttester: false,
  registeredAs: { displayName: 'E2E Lab' },
  retraction,
});

beforeAll(async () => {
  lab = await generateKeypair();
});

describe('sharedAttestationsOf: checked here like the open list', () => {
  it('verifies each signature, keeps only those about this record, and ignores anything else', async () => {
    const report = await signed('att_report', 'laboratory-report');
    const elsewhere = await signed('att_elsewhere', 'laboratory-report', OTHER);
    const tampered = { ...row(await signed('att_tampered', 'chain-of-custody')), documentHash: 'f'.repeat(64) };
    const out = await sharedAttestationsOf([row(report), row(elsewhere), tampered, 'junk', null, {}], PLANT);
    expect(out.map((a) => a.attestationId)).toEqual(['att_report', 'att_tampered']);
    expect(out[0].signatureValid).toBe(true);
    // A row whose signed fields were changed doesn't verify: never counted as signed.
    expect(out[1].signatureValid).toBe(false);
  });

  it('a retraction counts only when the lab signed it', async () => {
    const report = await signed('att_r', 'laboratory-report');
    const base = { attestationId: 'att_r', reason: 'issued-in-error' as const, retractedAt: '2026-11-09T00:00:00Z' };
    const real = await signRetraction({ ...base, attesterPublicKey: lab.publicKey }, lab.privateKey);
    const [a] = await sharedAttestationsOf([row(report, real)], PLANT);
    expect(a.retraction?.signature).toBe(real.signature);
    const [b] = await sharedAttestationsOf([row(report, { ...base, attesterPublicKey: lab.publicKey })], PLANT);
    expect(b.retraction).toBeNull();
    expect(b.retractionUnverified).toBe(true);
  });

  it('nothing for a field that is absent or not a list, or a fingerprint that is not one', async () => {
    expect(await sharedAttestationsOf(undefined, PLANT)).toEqual([]);
    expect(await sharedAttestationsOf({ a: 1 }, PLANT)).toEqual([]);
    expect(await sharedAttestationsOf([row(await signed('att_x', 'laboratory-report'))], 'nope')).toEqual([]);
  });

  it('merged with the open list, each signature once', async () => {
    const a = await checkAttestations([row(await signed('att_a', 'chain-of-custody'))], PLANT);
    const b = await checkAttestations(
      [row(await signed('att_a', 'chain-of-custody')), row(await signed('att_b', 'laboratory-report'))],
      PLANT,
    );
    expect(mergeAttestations(a, b).map((x) => x.attestationId)).toEqual(['att_a', 'att_b']);
  });
});

describe('custody lines without a receipt id (the receipt is not shown)', () => {
  const lines = [
    { receiptAttestationId: 'att_shown', covered: 'covered', differences: [] },
    { custody: 'sealed', receiptNamesSampleDetails: true, sampleDetailsCheckedBy: 'holder' },
    {
      custody: 'sealed',
      custodySummary: { covered: 'covered', differingFields: ['sealNumber'] },
      custodySummaryBy: 'holder',
    },
    { covered: 'covered', differences: ['sealNumber: sent "1" received "2"'] },
    { receiptAttestationId: 7, covered: 'covered', differences: [] },
  ];

  it('a line naming its receipt goes under it; one naming none is still read, without the lab', () => {
    expect([...publicCustodyOf(lines).keys()]).toEqual(['att_shown']);
    const unnamed = unnamedCustodyOf(lines);
    expect(unnamed).toHaveLength(3);
    expect(unnamed.every((c) => c.receiptAttestationId === '')).toBe(true);
    expect(publicCustodyLines(unnamed[0])[0]).toMatch(/The lab’s receipt names sample details/);
    expect(publicCustodyLines(unnamed[1]).join(' ')).toMatch(/differences in: Seal number/);
    expect(publicCustodyLines(unnamed[2]).join(' ')).toContain('sent "1" received "2"');
  });

  it('a registry from before 8 Nov 2026 names every receipt: nothing unnamed', () => {
    expect(unnamedCustodyOf([lines[0]])).toEqual([]);
    expect(unnamedCustodyOf(undefined)).toEqual([]);
  });
});

describe('the check page never says no lab signed', () => {
  const langs = ['en', 'de', 'es', 'fr', 'ja'] as const;
  it('the "none" line and the DNA lines say what is shown, in every language', () => {
    for (const l of langs) {
      const t = appTranslations[l] as Record<string, string>;
      for (const k of ['app.verify.noneSigned', 'app.verify.unnamedReceipt', 'app.verify.report.unnamedNone'])
        expect(t[k], `${l} ${k}`).toBeTruthy();
    }
    const en = appTranslations.en as Record<string, string>;
    expect(en['app.verify.noneSigned']).toBe(
      'The holder hasn’t shown any lab signatures here. A lab’s receipts and reports are private unless the holder chooses to show them.',
    );
    expect(Object.values(en).join('\n')).not.toMatch(/No lab's receipt or lab report has been signed/);
    const none = publicReportLine({ paired: true, atts: [], bound: true }).text;
    expect(none).not.toMatch(/No lab has signed/);
    expect(none).toMatch(/private unless the holder chooses to show them/);
  });
});

// ---- the grant: what the holder's browser sends ------------------------------------------

type Call = { url: string; method: string; body?: unknown };
let calls: Call[] = [];
let visible: unknown[] | 'down' = [];
let refuseShared = false;
const mem = new Map<string, string>();

beforeEach(() => {
  calls = [];
  visible = [];
  refuseShared = false;
  mem.clear();
  mem.set('veilcore.holder.v1', HOLDER);
  resetSharedRefusal();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    calls.push({ url, method, body });
    const reply = (status: number, v: unknown) =>
      Promise.resolve(new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } }));
    if (url.includes('/attestations/subject/')) {
      if (visible === 'down') return reply(503, { error: 'down' });
      return reply(200, { attestations: visible, total: visible.length });
    }
    if (url.endsWith('/disclosure') && method === 'PUT') {
      const values = (body as { values?: Record<string, unknown> }).values ?? {};
      if (refuseShared && 'sharedAttestations' in values)
        return reply(400, {
          error: 'values.sharedAttestations is not a value a grant publishes; they are loggedAt, parents',
        });
      return reply(200, { show: (body as { show: string[] }).show, values, updatedAt: '2026-11-09T00:00:00Z' });
    }
    return reply(404, { error: 'no route' });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const rec = (over: Partial<StrainRecord> = {}): StrainRecord =>
  ({
    id: 'VEIL-SHARE',
    strainName: 'Blue',
    recordFingerprint: PLANT,
    loggedAt: 1,
    ...over,
  }) as StrainRecord;

describe('grantValuesNow: the ids the holder chose, as they can be published now', () => {
  it('off unless chosen; only under attestation-status', async () => {
    visible = [row(await signed('att_r', 'laboratory-report'))];
    expect((await grantValuesNow(rec(), ['attestation-status'])).sharedAttestations).toBeUndefined();
    const r = rec({ sharedAttestations: ['att_r'] });
    expect((await grantValuesNow(r, ['existence'])).sharedAttestations).toBeUndefined();
    expect((await grantValuesNow(r, ['attestation-status'])).sharedAttestations).toEqual(['att_r']);
  });

  it('an id no longer about this record, or no longer visible, is left out (the registry would refuse the grant)', async () => {
    visible = [
      row(await signed('att_r', 'laboratory-report')),
      row(await signed('att_old', 'laboratory-report', OTHER)),
    ];
    const r = rec({ sharedAttestations: ['att_old', 'att_gone', 'att_r'] });
    expect((await grantValuesNow(r, ['attestation-status'])).sharedAttestations).toEqual(['att_r']);
    // Asked with the holder key: the registry serves private signatures only to it.
    const asked = calls.find((c) => c.url.includes('/attestations/subject/'));
    expect(asked).toBeTruthy();
  });

  it('when the list can’t be read now, the stored ids are kept, if still chosen', async () => {
    visible = 'down';
    const r = rec({ sharedAttestations: ['att_r', 'att_s'] });
    const v = await grantValuesNow(r, ['attestation-status'], { sharedAttestations: ['att_r', 'att_other'] });
    expect(v.sharedAttestations).toEqual(['att_r']);
    expect((await grantValuesNow(r, ['attestation-status'])).sharedAttestations).toBeUndefined();
  });

  it('a resync with the same shared ids is not a change; different ones are', () => {
    const stored = { dnaPairBinding: 'a'.repeat(64), sharedAttestations: ['att_b', 'att_a'] };
    expect(sameGrantValues(stored, { dnaPairBinding: 'a'.repeat(64), sharedAttestations: ['att_a', 'att_b'] })).toBe(
      true,
    );
    expect(sameGrantValues(stored, { dnaPairBinding: 'a'.repeat(64) })).toBe(false);
    expect(sameGrantValues({ dnaPairBinding: 'a'.repeat(64) }, { ...stored })).toBe(false);
  });
});

describe('saveGrant with shared signatures', () => {
  let kept: { show: string[]; shared?: readonly string[] }[] = [];
  beforeEach(() => {
    kept = [];
    registerGrantKeeper((id, show, shared) => {
      kept.push({ show, shared });
      return Promise.resolve(rec({ grant: show, ...(shared?.length ? { sharedAttestations: [...shared] } : {}) }));
    });
  });

  it('keeps the choice with the record, then sends the ids', async () => {
    visible = [row(await signed('att_r', 'laboratory-report'))];
    const out = await saveGrant(rec(), { ...noKeys(), 'attestation-status': true }, ['att_r']);
    expect('error' in out).toBe(false);
    expect(kept).toEqual([{ show: ['attestation-status'], shared: ['att_r'] }]);
    const put = calls.find((c) => c.method === 'PUT');
    expect((put?.body as { values: { sharedAttestations?: string[] } }).values.sharedAttestations).toEqual(['att_r']);
  });

  it('a registry from before 8 Nov 2026 refuses the field: sent again without it, and not again after', async () => {
    refuseShared = true;
    visible = [row(await signed('att_r', 'laboratory-report'))];
    const out = await saveGrant(rec(), { ...noKeys(), 'attestation-status': true }, ['att_r']);
    expect('error' in out).toBe(false);
    const puts = calls.filter((c) => c.method === 'PUT');
    expect(puts).toHaveLength(2);
    expect((puts[1].body as { values: object }).values).not.toHaveProperty('sharedAttestations');
    calls = [];
    await saveGrant(rec(), { ...noKeys(), 'attestation-status': true }, ['att_r']);
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1);
  });
});

const noKeys = () => ({
  existence: false,
  'attestation-status': false,
  'descent-clean': false,
  'sealed-at': false,
  'parent-names': false,
  'breeding-method': false,
  'individual-id': false,
  name: false,
  'bred-by': false,
});
