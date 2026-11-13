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
import { checkAttestations, loadAttestations, mergeAttestations, sharedAttestationsOf } from './attesters';
import { shareableLabSignatures } from '../components/wizard/LabSignatureShare';
import { labKeyProof, labKeyProofText, sendLockedResult } from './lab-results';
import { verifyEd25519 } from 'veilcore-records';
import { publicCustodyLines, publicCustodyOf, unnamedCustodyOf } from './custody';
import { grantValuesNow, resetSharedRefusal, sameGrantValues, saveGrant, registerGrantKeeper } from './disclosure';
import { publicReportLine } from './saved-report';
import type { StrainRecord } from './records';
import { appEn } from '../i18n/app/en';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
      // As the registry pages: at most 100 a time (?limit=, ?offset=).
      const q = new URL(url, 'http://registry.test').searchParams;
      const limit = Math.min(Number(q.get('limit') ?? 100), 100);
      const offset = Number(q.get('offset') ?? 0);
      return reply(200, { attestations: visible.slice(offset, offset + limit), total: visible.length });
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

// ---- final review fixes (12 Nov 2026) -----------------------------------------------------

describe('L3: the share list and the grant read every page of the holder’s signatures', () => {
  it('a lab report past the first 100 rows is offered and kept in the grant', async () => {
    const many: unknown[] = [];
    for (let i = 0; i < 140; i++) many.push(row(await signed(`att_open_${String(i)}`, 'genetic-fingerprint')));
    const late = row(await signed('att_late_report', 'laboratory-report'));
    visible = [...many, { ...late, private: true }];
    // One page, as before: the report is not in it.
    const first = await loadAttestations(PLANT, { asHolder: true });
    expect(first?.length).toBe(100);
    expect(first?.some((a) => a.attestationId === 'att_late_report')).toBe(false);
    // Every page: it is, once.
    calls = [];
    const all = await loadAttestations(PLANT, { asHolder: true, allPages: true });
    expect(all?.length).toBe(141);
    expect(all?.filter((a) => a.attestationId === 'att_late_report')).toHaveLength(1);
    expect(
      calls.filter((c) => c.url.includes('/attestations/subject/')).map((c) => new URL(c.url, 'http://x').search),
    ).toEqual(['?limit=100&offset=0', '?limit=100&offset=100']);
    expect(shareableLabSignatures(all ?? []).map((a) => a.attestationId)).toEqual(['att_late_report']);
    // The grant keeps a shared id from the second page.
    const r = rec({ sharedAttestations: ['att_late_report'] });
    expect((await grantValuesNow(r, ['attestation-status'])).sharedAttestations).toEqual(['att_late_report']);
  });

  it('a page that fails fails the whole list', async () => {
    const many: unknown[] = [];
    for (let i = 0; i < 101; i++) many.push(row(await signed(`att_f_${String(i)}`, 'genetic-fingerprint')));
    visible = many;
    const real = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
      (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).includes('offset=100')
        ? Promise.resolve(new Response('{}', { status: 503 }))
        : real(input, init),
    );
    expect(await loadAttestations(PLANT, { asHolder: true, allPages: true })).toBeNull();
  });

  it('running out of pages before the end is “couldn’t say”, not the whole list: stored shares are kept', async () => {
    // A registry that keeps saying there is more: one row a page, total far past every page.
    const one = row(await signed('att_page_row', 'genetic-fingerprint'));
    let pages = 0;
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!url.includes('/attestations/subject/')) return Promise.resolve(new Response('{}', { status: 404 }));
      pages++;
      const body = { attestations: [one], total: 1_000_000 };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
      );
    });
    expect(await loadAttestations(PLANT, { asHolder: true, allPages: true })).toBeNull();
    expect(pages).toBeGreaterThan(20);
    expect(pages).toBeLessThan(30);
    // The grant: the share the registry publishes now is kept, not dropped as gone.
    const r = rec({ sharedAttestations: ['att_far_report'] });
    const v = await grantValuesNow(r, ['attestation-status'], { sharedAttestations: ['att_far_report'] });
    expect(v.sharedAttestations).toEqual(['att_far_report']);
  });
});

describe('L5: a lab key’s genetic fingerprint or inspection, offered only when the registry marks it private', () => {
  it('private ones are offered, with their own words in every language; public ones are not', async () => {
    const rows = await checkAttestations(
      [
        { ...row(await signed('att_gf_private', 'genetic-fingerprint')), private: true },
        { ...row(await signed('att_insp_private', 'inspection')), private: true },
        row(await signed('att_gf_public', 'genetic-fingerprint')),
        row(await signed('att_insp_public', 'inspection')),
        row(await signed('att_report', 'laboratory-report')),
        { ...row(await signed('att_other', 'other')), private: true },
      ],
      PLANT,
    );
    expect(shareableLabSignatures(rows).map((a) => a.attestationId)).toEqual([
      'att_gf_private',
      'att_insp_private',
      'att_report',
    ]);
    for (const l of ['en', 'de', 'es', 'fr', 'ja'] as const) {
      const t = appTranslations[l] as Record<string, string>;
      for (const k of ['app.prove.share.labSigs.fingerprint', 'app.prove.share.labSigs.inspection'])
        expect(t[k], `${l} ${k}`).toMatch(/\{date\}/);
    }
  });
});

describe('L1: the lab’s key proves a first report is its own', () => {
  it('labKeyProof is the attester key’s Ed25519 signature over the delivery and signature ids', async () => {
    const proof = await labKeyProof(lab.privateKey, 'TR-ABC', 'att_x_ld1');
    expect(proof).toMatch(/^[0-9a-f]{128}$/);
    expect(labKeyProofText('TR-ABC', 'att_x_ld1')).toBe('veilcore:lab-result-key:v1\nTR-ABC\natt_x_ld1');
    expect(await verifyEd25519(labKeyProofText('TR-ABC', 'att_x_ld1'), proof, lab.publicKey)).toBe(true);
    // Another delivery or another signature: not this proof.
    expect(await verifyEd25519(labKeyProofText('TR-OTHER', 'att_x_ld1'), proof, lab.publicKey)).toBe(false);
    expect(await verifyEd25519(labKeyProofText('TR-ABC', 'att_y_ld1'), proof, lab.publicKey)).toBe(false);
  });

  it('sendLockedResult sends it as x-lab-key-proof with the signature, and not without one', async () => {
    const seen: Headers[] = [];
    vi.stubGlobal('fetch', (_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(new Headers(init?.headers));
      return Promise.resolve(new Response(JSON.stringify({ id: 'LR-1' }), { status: 200 }));
    });
    const proof = 'a'.repeat(128);
    expect(await sendLockedResult('TR-ABC', new Uint8Array([1]), 'att_x_ld1', undefined, proof)).toEqual({
      id: 'LR-1',
    });
    expect(seen[0].get('x-lab-key-proof')).toBe(proof);
    await sendLockedResult('TR-ABC', new Uint8Array([1]), undefined, undefined, proof);
    expect(seen[1].get('x-lab-key-proof')).toBeNull();
  });
});

describe('M2 and L6: what the share screen and the lab’s Sent screen say', () => {
  const langs = ['en', 'de', 'es', 'fr', 'ja'] as const;
  it('the custody line under “Whether a DNA report is saved” is said, in every language', () => {
    for (const l of langs) {
      const t = appTranslations[l] as Record<string, string>;
      for (const k of ['app.prove.share.custodyNote', 'app.prove.share.labSigs.intro', 'app.lab.out.sentText'])
        expect(t[k], `${l} ${k}`).toBeTruthy();
    }
    const en = appTranslations.en as Record<string, string>;
    expect(en['app.prove.share.custodyNote']).toMatch(
      /that a lab received a sample \(not which lab\) and whether what arrived matches what was sent/,
    );
    expect(en['app.prove.share.labSigs.intro']).not.toMatch(/only you and the lab can see them/);
    expect(en['app.prove.share.labSigs.intro']).toMatch(/without the lab’s name/);
    expect(en['app.lab.out.sentText']).toMatch(/without your lab’s name/);
    expect(en['app.verify.report.unnamedWithdrawn']).toMatch(/every lab report signature shown here was withdrawn/);
    const fr = appTranslations.fr as Record<string, string>;
    expect(Object.values(fr).join('\n')).not.toMatch(/enregistré sur cet enregistrement/);
  });
});

describe('the privacy pages name everyone who sees a lab’s signatures, as the share screen does', () => {
  // 13 Nov 2026: the share intro names the sender too; the privacy pages said "only you and
  // the lab". Every language, the test and mainnet pages alike.
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../i18n');
  const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8');
  const cases: [string[], RegExp, RegExp[]][] = [
    [
      ['en.ts', 'en-mainnet.ts'],
      /whoever sent the lab the sample/,
      [/only to you and the lab\b/, /only you and the lab see them/],
    ],
    [
      ['de.ts', 'de-mainnet.ts'],
      /die Probe geschickt hat/,
      [/nur Ihnen und dem Labor\b/, /Nur Sie und das Labor sehen sie/],
    ],
    [
      ['es.ts', 'es-mainnet.ts'],
      /quien le envió la muestra/,
      [/solo a usted y al laboratorio\b/, /solo usted y el laboratorio los ven/],
    ],
    [
      ['fr.ts', 'fr-mainnet.ts'],
      /la personne qui lui a envoyé l'échantillon/,
      [/qu'à vous et au laboratoire\b/, /seuls vous et le laboratoire les voyez/],
    ],
    [['ja.ts'], /ラボにサンプルを送った人/, [/あなたとラボにだけ見せます/, /あなたとラボだけが見られます/]],
  ];
  it('every language says the sender sees them too, and none says only you and the lab', () => {
    for (const [files, names, never] of cases)
      for (const f of files) {
        const src = read(f);
        expect(src, f).toMatch(names);
        for (const n of never) expect(src, `${f} ${String(n)}`).not.toMatch(n);
      }
  });
});
