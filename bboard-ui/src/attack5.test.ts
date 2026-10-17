// The fifth review's findings (sealed/report-round5.md), as the site fixes them (CONTRACT.md
// #32-#37). One block per finding; the review's proofs are ported to scripts/release-manifest.test.mjs
// (1), partner-kit/record-check/test/check.test.ts (2, 3), site-registry-features.test.ts (4),
// e2e/round6.spec.ts (2, 3, 5), e2e/round5.spec.ts and i18n/sealed-copy.test.ts (6), and the
// registry's test/round6.test.mjs (3, 7, 8). These are the site's own pieces of each fix.
// SPDX-License-Identifier: Apache-2.0
import { createHash, hkdfSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_ROUTES, routesToCheck } from '../../scripts/release-check.mjs';
import { linkName, nameCheckOf, nameCodeOf, nameLinkParams, nameSaltFromLink } from './veilcore/verify-link';
import {
  LAB_DOC_ID_SUFFIX,
  labDocSaltOf,
  labDocument,
  labLinkParams,
  labSaltFromLink,
  signsReport,
} from './veilcore/lab-doc';
import { guardHolderRequests, holderRequestsPaused, HOLDER_KEY_REFUSED } from './veilcore/holder-guard';
import { publicReportLine } from './veilcore/saved-report';
import type { ResolvedAttestation } from './veilcore/attesters';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
const hex = (n: number) =>
  Array.from({ length: n }, (_, i) => ((i * 37 + 11) % 256).toString(16).padStart(2, '0')).join('');

describe('finding 1: the site check fetches every page the app serves, with random ids', () => {
  it('APP_ROUTES covers every route in App.tsx', () => {
    const app = fs.readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
    const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*');
    expect(routes.length).toBeGreaterThan(15);
    const listed = APP_ROUTES.map((r) => r.replace(/\?.*$/, '').replace(/:[a-z]+/g, ':x'));
    for (const r of routes) {
      const shape = r.replace(/:[a-zA-Z]+/g, ':x');
      expect(
        listed.some((l) => l === shape || (shape === '/docs/:x' && l.startsWith('/docs/'))),
        r,
      ).toBe(true);
    }
    // A fresh random id each time: a host can't keep a list of the addresses a checker asks for.
    expect(routesToCheck()).not.toEqual(routesToCheck());
  });
});

describe('finding 2: the name in a link is checked against the record’s name code (#33)', () => {
  const FP = hex(32);
  const SALT = sha('salt');
  const NAME = 'Ébène Kush №5';
  const CODE = nameCodeOf(NAME, FP, SALT)!;

  it('the code is SHA-256("veilcore:name:v1" 0 name 0 proof code 0 salt), the contract’s exact bytes', () => {
    const want = sha(
      Buffer.concat([
        Buffer.from('veilcore:name:v1\0'),
        Buffer.from(NAME.normalize('NFC'), 'utf8'),
        Buffer.from(`\0${FP}\0${SALT}`),
      ]),
    );
    expect(CODE).toBe(want);
    // The same name as a link carries it: NFC, trimmed.
    expect(nameCodeOf(`  ${NAME.normalize('NFD')} `, FP, SALT)).toBe(CODE);
    expect(linkName(`  ${NAME} `)).toBe(NAME.normalize('NFC'));
    expect(nameCodeOf('', FP, SALT)).toBeUndefined();
    expect(nameCodeOf(NAME, 'xy', SALT)).toBeUndefined();
  });

  it('a forged name does not match; the holder’s matches; no salt or no code is "not checked"; none is none', () => {
    const base = { linkSalt: SALT, nameCode: CODE, proofCode: FP };
    expect(nameCheckOf({ ...base, linkName: 'Gelato 41 (lab certified clone)' })).toEqual({
      state: 'differs',
      name: 'Gelato 41 (lab certified clone)',
    });
    expect(nameCheckOf({ ...base, linkName: NAME })).toEqual({ state: 'matches', name: NAME.normalize('NFC') });
    expect(nameCheckOf({ ...base, linkName: NAME, linkSalt: null }).state).toBe('unchecked');
    expect(nameCheckOf({ ...base, linkName: NAME, nameCode: null }).state).toBe('unchecked');
    // Finding 6: a link without a name is just that.
    expect(nameCheckOf({ ...base, linkName: null })).toEqual({ state: 'none' });
  });

  it('a name the holder published wins, and a different one in the link is flagged', () => {
    expect(nameCheckOf({ linkName: 'Other', linkSalt: SALT, nameCode: CODE, proofCode: FP, published: NAME })).toEqual({
      state: 'published',
      name: NAME,
      conflict: 'Other',
    });
    expect(nameCheckOf({ linkName: NAME, linkSalt: SALT, nameCode: CODE, proofCode: FP, published: NAME })).toEqual({
      state: 'published',
      name: NAME,
    });
  });

  it('the holder’s link carries the name with its salt (`ns`), read back from the #', () => {
    const p = nameLinkParams({ strainName: NAME, nameSalt: SALT });
    expect(p.ns).toBe(SALT);
    expect(nameSaltFromLink(`#n=${p.n}&ns=${SALT}`)).toBe(SALT);
    expect(nameLinkParams({ strainName: NAME })).not.toHaveProperty('ns');
  });
});

describe('finding 3: a lab signs the report bound to the record (#34)', () => {
  const OFFER_KEY = Buffer.from(hex(32), 'hex').toString('base64url');
  const FP = hex(32);
  const REPORT = sha('%PDF practice report');

  it('s is HKDF-SHA256(offer key, info "veilcore:labdoc-salt:v1", 32 bytes); the document the contract’s bytes', () => {
    const s = labDocSaltOf(OFFER_KEY)!;
    const want = Buffer.from(
      hkdfSync(
        'sha256',
        Buffer.from(OFFER_KEY, 'base64url'),
        Buffer.alloc(0),
        Buffer.from('veilcore:labdoc-salt:v1'),
        32,
      ),
    ).toString('hex');
    expect(s).toBe(want);
    const doc = labDocument(REPORT, FP, s);
    expect(doc).toBe(
      sha(
        Buffer.concat([
          Buffer.from('veilcore:labdoc:v1\0'),
          Buffer.from(REPORT, 'hex'),
          Buffer.from(FP, 'hex'),
          Buffer.from(s, 'hex'),
        ]),
      ),
    );
    // The point: the document is not the file's SHA-256, and says nothing about it without s.
    expect(doc).not.toBe(REPORT);
    expect(labDocSaltOf('not a key')).toBeUndefined();
  });

  it('a bound signature names the file only with the delivery’s s; an old one by its plain SHA-256', () => {
    const s = labDocSaltOf(OFFER_KEY)!;
    const bound = {
      attestationId: `att_x${LAB_DOC_ID_SUFFIX}`,
      subjectCommitment: FP,
      documentHash: labDocument(REPORT, FP, s),
    };
    expect(signsReport(bound, REPORT, [s])).toBe(true);
    expect(signsReport(bound, REPORT, [])).toBe(false);
    expect(signsReport(bound, sha('another file'), [s])).toBe(false);
    expect(signsReport({ attestationId: 'att_old', subjectCommitment: FP, documentHash: REPORT }, REPORT, [])).toBe(
      true,
    );
    expect(signsReport({ attestationId: 'att_old', subjectCommitment: FP }, REPORT, [s])).toBe(false);
    // The breeder's link carries s only when it ties the saved report to a bound signature.
    expect(labLinkParams({ dnaFileSha256: REPORT, offerKeys: { 'TR-1': OFFER_KEY } }, [bound])).toEqual({ ls: s });
    expect(labLinkParams({ dnaFileSha256: sha('x'), offerKeys: { 'TR-1': OFFER_KEY } }, [bound])).toEqual({});
    expect(labSaltFromLink(`#ls=${s}`)).toBe(s);
  });

  it('the check page: a bound signature is tied with the file and `ls`; without `ls`, or for a withheld one, it says it can’t tell', () => {
    const s = labDocSaltOf(OFFER_KEY)!;
    const DS = hex(32).split('').reverse().join('');
    const att = (over: Partial<ResolvedAttestation>): ResolvedAttestation => ({
      attestationId: `att_y${LAB_DOC_ID_SUFFIX}`,
      type: 'laboratory-report',
      subjectCommitment: FP,
      documentHash: labDocument(REPORT, FP, s),
      hashAlgorithm: 'sha256',
      issuedAt: '2026-10-17T09:00:00Z',
      attester: { publicKey: 'ab'.repeat(32), displayName: 'Practice Lab' },
      signature: 'cd'.repeat(64),
      strength: 'signed',
      registeredAs: null,
      retraction: null,
      signatureValid: true,
      ...over,
    });
    // The record's bound DNA value, as dna-link.ts makes it with the record's pairing salt.
    const H = (tag: string, ...parts: string[]) => {
      const t = Buffer.alloc(32);
      t.write(tag, 'utf8');
      return sha(Buffer.concat([t, ...parts.map((p) => Buffer.from(p, 'hex'))]));
    };
    const binding = H('veilcore:v1:dnapair', REPORT, FP, DS);
    const base = { paired: true, binding, linkDna: { salt: DS, identity: FP }, chosenSha: REPORT, bound: true };
    const tied = publicReportLine({ ...base, atts: [att({})], labSalt: s });
    expect(tied.status).toBe('checked');
    expect(tied.text).toMatch(/matches the lab report signed by/);
    const noLs = publicReportLine({ ...base, atts: [att({})] });
    expect(noLs.text).toMatch(
      /A lab signed a report about this record, but this page can’t tell whether it is this file: this link doesn’t carry the lab report’s key/,
    );
    expect(noLs.text).not.toMatch(/holder’s own statement/);
    const withheld = publicReportLine({
      ...base,
      atts: [
        att({
          attestationId: 'att_old',
          documentHash: undefined,
          signatureValid: false,
          documentWithheld: true,
        }),
      ],
    });
    expect(withheld.text).toMatch(
      /that lab signature was made before 17 October 2026, and the registry shows it only to the breeder and the lab/,
    );
  });
});

describe('finding 5: no request with the holder key leaves a prove or check page (#36)', () => {
  it('the paused pages are /prove/… and /verify/…', () => {
    for (const p of ['/prove/PR-1', '/verify/VEIL-1', '/verify', '/prove'])
      expect(holderRequestsPaused(p), p).toBe(true);
    for (const p of ['/records', '/record/VEIL-1', '/', '/verifyx', '/backup'])
      expect(holderRequestsPaused(p), p).toBe(false);
  });

  it('the guard refuses a request carrying the holder key there, and lets every other request through', async () => {
    const sent: string[] = [];
    const win = {
      fetch: ((u: RequestInfo | URL) => {
        sent.push(u instanceof Request ? u.url : u instanceof URL ? u.href : u);
        return Promise.resolve(new Response('{}'));
      }) as typeof fetch,
    };
    guardHolderRequests(win);
    const loc = Object.getOwnPropertyDescriptor(globalThis, 'location');
    Object.defineProperty(globalThis, 'location', { value: { pathname: '/prove/PR-1' }, configurable: true });
    try {
      await expect(
        win.fetch('https://r.example/api/records', { headers: { 'x-holder-key': 'ab'.repeat(32) } }),
      ).rejects.toThrow(HOLDER_KEY_REFUSED);
      await expect(
        win.fetch(new Request('https://r.example/api/records', { headers: { 'X-Holder-Key': 'ab'.repeat(32) } })),
      ).rejects.toThrow(HOLDER_KEY_REFUSED);
      await win.fetch('https://r.example/prove-requests/PR-1');
      Object.defineProperty(globalThis, 'location', { value: { pathname: '/records' }, configurable: true });
      await win.fetch('https://r.example/api/records', { headers: { 'x-holder-key': 'ab'.repeat(32) } });
    } finally {
      if (loc) Object.defineProperty(globalThis, 'location', loc);
      else delete (globalThis as { location?: unknown }).location;
    }
    expect(sent).toEqual(['https://r.example/prove-requests/PR-1', 'https://r.example/api/records']);
  });

  it('the record and agreement syncs start only off those pages, and main.tsx installs the guard first', () => {
    const main = fs.readFileSync(path.join(SRC, 'main.tsx'), 'utf8');
    expect(main.indexOf('guardHolderRequests(window)')).toBeGreaterThan(0);
    expect(main.indexOf('guardHolderRequests(window)')).toBeLessThan(main.indexOf('ReactDOM.createRoot'));
    const records = fs.readFileSync(path.join(SRC, 'veilcore/records.ts'), 'utf8');
    expect(records).toMatch(/if \(!firstSync && !holderRequestsPaused\(\)\)/);
    expect(fs.readFileSync(path.join(SRC, 'veilcore/licenses.ts'), 'utf8')).toMatch(
      /if \(started \|\| holderRequestsPaused\(\)\) return;/,
    );
    // The check page no longer reads the holder's own deliveries.
    expect(fs.readFileSync(path.join(SRC, 'pages/VerifyPage.tsx'), 'utf8')).not.toMatch(
      /useBreederReceipt|useRecords\(/,
    );
  });
});
