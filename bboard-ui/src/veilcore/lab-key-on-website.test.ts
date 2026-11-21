// A lab's key on its own website (docs/lab-key-on-website.md), with real Ed25519 keys:
//   - the key's own signature naming the website is checked in this browser, and a page names
//     the website only when it verifies (never on the registry's word for it);
//   - a website that stopped listing the key reads as such, never as "not checked";
//   - did:web: the key in did.json form matches did:key's encoding;
//   - the words, in all five languages, never say the lab is real, verified or owns anything.
// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { generateKeypair, signAttestation, type SignedAttestation } from 'veilcore-records';
import { checkAttestations, signerLabel } from './attesters';
import {
  didDocumentFor,
  didVerificationMethod,
  domainClaimPayload,
  domainClaimValid,
  ed25519Multibase,
} from './lab-domain';
import { makeTranslator } from '../i18n/translate';
import { appEn } from '../i18n/app/en';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';

const PLANT = '1'.repeat(64);
const NOW = Date.parse('2026-11-18T12:00:00Z');
const LOOKED = '2026-11-18T03:00:00.000Z';

let lab: { publicKey: string; privateKey: string };
let other: { publicKey: string; privateKey: string };

const toHex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => new Uint8Array((h.match(/.{2}/g) ?? []).map((x) => parseInt(x, 16)));
const claimBy = async (
  signer: { privateKey: string },
  publicKey: string,
  domain: string,
  issuedAt = 1_763_000_000_000,
) => {
  const key = await crypto.subtle.importKey('pkcs8', fromHex(signer.privateKey), { name: 'Ed25519' }, false, ['sign']);
  const sig = await crypto.subtle.sign(
    'Ed25519',
    key,
    new TextEncoder().encode(domainClaimPayload(publicKey, domain, issuedAt)),
  );
  return { issuedAt, signature: toHex(sig) };
};
const signed = async (): Promise<SignedAttestation> =>
  signAttestation(
    {
      attestationId: 'att_web',
      type: 'laboratory-report',
      subjectCommitment: PLANT,
      attester: { publicKey: lab.publicKey, displayName: 'Acme Labs' },
      documentHash: 'e'.repeat(64),
      hashAlgorithm: 'sha256',
      issuedAt: '2026-11-17T10:00:00Z',
    },
    lab.privateKey,
  );
const row = async (registeredAs: Record<string, unknown>) => ({
  ...(await signed()),
  strength: 'signed',
  vettedAttester: false,
  registeredAs: { displayName: 'Acme Labs', ...registeredAs },
  retraction: null,
});
const label = async (registeredAs: Record<string, unknown>, tr = makeTranslator('en', appEn)) => {
  const [a] = await checkAttestations([await row(registeredAs)], PLANT);
  return signerLabel(a, 'Receipt signed by', NOW, tr);
};
const NOT_CHECKED = 'Receipt signed by a key calling itself “Acme Labs” (not verified)';

beforeAll(async () => {
  lab = await generateKeypair();
  other = await generateKeypair();
});

describe('the key names its website: checked here, not taken from the registry', () => {
  it('a claim the key signed: the line, with who looked and when', async () => {
    const claim = await claimBy(lab, lab.publicKey, 'acme-labs.com');
    const s = await label({ domainCheck: { domain: 'acme-labs.com', method: 'file', checkedAt: LOOKED, claim } });
    expect(s.text).toBe(
      `Receipt signed by a key calling itself “Acme Labs”, listed by acme-labs.com. The key names the website acme-labs.com, and VeilCore found it listed there on 2026-11-18.`,
    );
    expect(s.published).toMatchObject({
      state: 'listed',
      host: 'acme-labs.com',
      href: 'https://acme-labs.com/.well-known/veilcore-lab.json',
    });
    expect(s.checked).toBe(false);
  });

  it('no line for a claim signed by another key, for another domain, with no claim, or a registry that says it checked', async () => {
    const domainCheck = { domain: 'acme-labs.com', method: 'file', checkedAt: LOOKED };
    const forged = await claimBy(other, lab.publicKey, 'acme-labs.com');
    const elsewhere = await claimBy(lab, lab.publicKey, 'acme-lab.com');
    for (const dc of [
      { ...domainCheck, claim: forged },
      { ...domainCheck, claim: elsewhere },
      domainCheck,
      { ...domainCheck, claimChecked: true },
      { ...domainCheck, claim: { issuedAt: 'x', signature: 'zz' } },
    ]) {
      const s = await label({ domainCheck: dc });
      expect(s.text).toBe(NOT_CHECKED);
      expect(s.published).toBeNull();
    }
  });

  it('domainClaimValid: one check per claim, and false for anything malformed', async () => {
    const claim = await claimBy(lab, lab.publicKey, 'acme-labs.com');
    expect(await domainClaimValid(lab.publicKey, 'acme-labs.com', claim)).toBe(true);
    expect(await domainClaimValid(lab.publicKey, 'acme-labs.com', { ...claim, issuedAt: claim.issuedAt + 1 })).toBe(
      false,
    );
    expect(await domainClaimValid('nope', 'acme-labs.com', claim)).toBe(false);
    expect(await domainClaimValid(lab.publicKey, 'acme-labs.com', null)).toBe(false);
  });

  it('a website that stopped listing the key: said plainly, dated, linked; never shown while it is listed', async () => {
    const claim = await claimBy(lab, lab.publicKey, 'acme-labs.com');
    const withdrawn = { domain: 'acme-labs.com', method: 'file', withdrawnAt: '2026-11-10T03:00:00.000Z', claim };
    const s = await label({ domainCheck: null, domainWithdrawn: withdrawn });
    expect(s.text).toBe(
      `Receipt signed by a key calling itself “Acme Labs” (withdrawn by acme-labs.com). The key names the website acme-labs.com, but VeilCore found it no longer listed there on 2026-11-10.`,
    );
    expect(s.published?.state).toBe('withdrawn');
    // Not signed by this key: nothing, as for a listing.
    const forged = await label({
      domainWithdrawn: { ...withdrawn, claim: await claimBy(other, lab.publicKey, 'acme-labs.com') },
    });
    expect(forged.published).toBeNull();
    // A withdrawal wins over a listing elsewhere (a thief's lookalike, say).
    const both = await label({
      domainCheck: { domain: 'acme-labs.com', method: 'file', checkedAt: LOOKED, claim },
      domainWithdrawn: withdrawn,
    });
    expect(both.published?.state).toBe('withdrawn');
    // A look older than 7 days: no "listed"; and no withdrawal either, unless one was recorded.
    const stale = await label({
      domainCheck: { domain: 'acme-labs.com', method: 'file', checkedAt: '2026-11-01T00:00:00Z', claim },
    });
    expect(stale.published).toBeNull();
  });

  it('an older registry with neither field: no line, nothing breaks', async () => {
    expect((await label({})).text).toBe(NOT_CHECKED);
  });
});

describe('did:web', () => {
  it('the multibase key is did:key’s encoding (the W3C did:key spec’s example)', () => {
    // The did:key spec's first Ed25519 example and its raw key.
    const hex = '2e6fcce36701dc791488e0d0b1745cc1e33a4c1c9fcc41c63bd343dbbe0970e6';
    expect(ed25519Multibase(hex)).toBe('z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK');
  });

  it('did.json lists the key for signing statements, under did:web:<domain>', () => {
    const doc = JSON.parse(didDocumentFor('acme-labs.com', 'ab'.repeat(32))) as {
      id: string;
      verificationMethod: { id: string }[];
      assertionMethod: string[];
    };
    expect(doc.id).toBe('did:web:acme-labs.com');
    expect(doc.verificationMethod).toEqual([didVerificationMethod('acme-labs.com', 'ab'.repeat(32))]);
    expect(doc.verificationMethod[0]).toMatchObject({ type: 'Multikey', controller: 'did:web:acme-labs.com' });
    expect(didVerificationMethod('acme-labs.com', 'ab'.repeat(32)).publicKeyMultibase).toMatch(/^z6Mk/);
    expect(doc.assertionMethod).toEqual([doc.verificationMethod[0].id]);
    expect(doc.verificationMethod[0].id.startsWith('did:web:acme-labs.com#')).toBe(true);
  });
});

describe('the words in every language', () => {
  const langs = { en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa } as const;
  // What the line must never say: that the lab is real, verified or certified, or owns anything.
  const OVERCLAIM =
    /verif|certif|genuine|real lab|owns|ownership|verifiziert|zertifiziert|echt|vérifié|certifié|véritable|verificad|certificad|auténtic|認証|本物|所有/i;
  for (const [lang, dict] of Object.entries(langs)) {
    it(`${lang}: listed and withdrawn read as what was seen, with the domain and the date`, async () => {
      const tr = makeTranslator(lang as keyof typeof langs, dict);
      const claim = await claimBy(lab, lab.publicKey, 'acme-labs.com');
      const listed = await label(
        { domainCheck: { domain: 'acme-labs.com', method: 'file', checkedAt: LOOKED, claim } },
        tr,
      );
      const gone = await label(
        { domainWithdrawn: { domain: 'acme-labs.com', withdrawnAt: '2026-11-10T00:00:00Z', claim } },
        tr,
      );
      for (const s of [listed, gone]) {
        expect(s.published?.host).toBe('acme-labs.com');
        expect(s.rest).toContain('acme-labs.com');
        expect(s.rest).toContain('VeilCore');
        expect(s.published?.before + s.published!.after).not.toMatch(OVERCLAIM);
      }
      expect(listed.rest).toContain('2026-11-18');
      expect(gone.rest).toContain('2026-11-10');
      expect(listed.published?.after).not.toBe(gone.published?.after);
    });
  }
});
