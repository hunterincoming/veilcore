// A key's identity level (docs/lab-identity-levels.md): every state a signature can be in maps
// to one level, the level's words name it in every language, and "Not verified" can't read as
// a verified level.
// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { generateKeypair } from 'veilcore-records';
import {
  LAB_IDENTITY_LEVELS,
  labIdentity,
  signerLabel,
  strengthLabel,
  type DomainCheck,
  type DomainWithdrawn,
  type LabIdentity,
  type LabIdentityLevel,
  type NameCheck,
  type ResolvedAttestation,
} from './attesters';
import {
  labIdentityNext,
  labIdentitySeverity,
  labIdentityText,
  labIdentityTone,
  labIdentityWords,
} from './lab-identity-words';
import { ownIdentityFrom } from './lab-own-level';
import { domainClaimPayload } from './lab-domain';
import { makeTranslator, type Translator } from '../i18n/translate';
import { appEn } from '../i18n/app/en';
import { appDe } from '../i18n/app/de';
import { appEs } from '../i18n/app/es';
import { appFr } from '../i18n/app/fr';
import { appJa } from '../i18n/app/ja';

const NOW = Date.parse('2026-11-21T12:00:00Z');
const LAB = 'a1'.repeat(32);
const LOOKED = '2026-11-20T03:00:00.000Z';

const check = (over: Partial<NameCheck> = {}): NameCheck => ({
  source: 'licence-listing',
  sourceUrl: 'https://www.cannabis.example.gov/licensed-testing-labs',
  licenceNo: 'TL-000123',
  emailDomain: 'acmelabs.example',
  checkedAt: '2026-10-01',
  checkedBy: 'HR',
  expiresAt: '2027-10-01',
  checkedName: 'Acme Labs',
  ...over,
});
const listed = (over: Partial<DomainCheck> = {}): DomainCheck => ({
  domain: 'acmelabs.example',
  method: 'file',
  checkedAt: LOOKED,
  claimChecked: true,
  ...over,
});
const gone = (over: Partial<DomainWithdrawn> = {}): DomainWithdrawn => ({
  domain: 'acmelabs.example',
  method: 'file',
  withdrawnAt: '2026-11-19T08:00:00.000Z',
  claimChecked: true,
  ...over,
});

type Reg = NonNullable<ResolvedAttestation['registeredAs']>;
const att = (reg: Partial<Reg> = {}, over: Partial<ResolvedAttestation> = {}): ResolvedAttestation => ({
  attestationId: 'att_1',
  type: 'laboratory-report',
  subjectCommitment: 'b'.repeat(64),
  attester: { publicKey: LAB, displayName: 'Acme Labs' },
  documentHash: 'e'.repeat(64),
  hashAlgorithm: 'sha256',
  issuedAt: '2026-11-20T10:00:00Z',
  signature: 'sig',
  strength: 'signed',
  vettedAttester: reg.nameCheck ? true : false,
  registeredAs: { displayName: 'Acme Labs', nameCheck: null, ...reg },
  retraction: null,
  signatureValid: true,
  ...over,
});
const retracted: Partial<ResolvedAttestation> = {
  retraction: {
    attestationId: 'att_1',
    attesterPublicKey: LAB,
    reason: 'other',
    retractedAt: '2026-11-20T11:00:00Z',
    signature: 's',
  } as unknown as ResolvedAttestation['retraction'],
};

/** One signature in each state, and the level it must show. */
const CASES: [string, ResolvedAttestation, LabIdentityLevel][] = [
  ['no check of any kind', att(), 'none'],
  ['a key with no name', att({ displayName: undefined }, { attester: { publicKey: LAB } }), 'none'],
  ['a current listing check', att({ nameCheck: check(), nameCheckStatus: 'checked' }), 'listing'],
  ['a listing check and a website', att({ nameCheck: check(), domainCheck: listed() }), 'listing'],
  [
    'a listing check expired by this browser’s clock',
    att({ nameCheck: check({ checkedAt: '2025-10-01', expiresAt: '2026-10-01' }) }),
    'expired',
  ],
  ['a listing check the registry says expired', att({ nameCheckStatus: 'expired' }), 'expired'],
  ['a listing match the operator took off', att({ nameCheckStatus: 'withdrawn' }), 'listing-withdrawn'],
  ['the key’s website lists it', att({ domainCheck: listed() }), 'website'],
  ['a website, and a listing match taken off', att({ domainCheck: listed(), nameCheckStatus: 'withdrawn' }), 'website'],
  ['a website look more than 7 days old', att({ domainCheck: listed({ checkedAt: '2026-11-10T00:00:00Z' }) }), 'none'],
  ['a website the page couldn’t tie to the key', att({ domainCheck: listed({ claimChecked: undefined }) }), 'none'],
  ['the website stopped listing the key', att({ domainWithdrawn: gone() }), 'website-withdrawn'],
  [
    'a withdrawal wins over a listing check and a website',
    att({ nameCheck: check(), domainCheck: listed(), domainWithdrawn: gone() }),
    'website-withdrawn',
  ],
  [
    'a signature that does not verify',
    att({ nameCheck: check(), domainCheck: listed() }, { signatureValid: false }),
    'none',
  ],
  [
    'a retracted signature: no listing, no website',
    att({ nameCheck: check(), domainCheck: listed() }, retracted),
    'none',
  ],
  [
    'a retracted signature whose website withdrew the key',
    att({ domainWithdrawn: gone() }, retracted),
    'website-withdrawn',
  ],
];

describe('labIdentity: one level for every state', () => {
  for (const [what, a, level] of CASES)
    it(`${what}: ${level}`, () => {
      expect(labIdentity(a, NOW).level).toBe(level);
      // The label every screen uses carries the same level.
      expect(signerLabel(a, 'Signed by', NOW).identity.level).toBe(level);
    });

  it('covers every level', () => {
    expect(new Set(CASES.map(([, , l]) => l))).toEqual(new Set(LAB_IDENTITY_LEVELS));
  });

  it('keeps what a page shows: the website, the listing, the dates', () => {
    const w = labIdentity(att({ domainCheck: listed() }), NOW);
    expect(w).toMatchObject({
      level: 'website',
      domain: 'acmelabs.example',
      href: 'https://acmelabs.example/.well-known/veilcore-lab.json',
      date: '2026-11-20',
    });
    const l = labIdentity(att({ nameCheck: check(), domainCheck: listed() }), NOW);
    expect(l).toMatchObject({
      level: 'listing',
      listing: 'cannabis.example.gov',
      date: '2026-10-01',
      until: '2027-10-01',
      licenceNo: 'TL-000123',
      website: { domain: 'acmelabs.example', date: '2026-11-20' },
    });
    expect(labIdentity(att({ domainCheck: listed(), nameCheckStatus: 'withdrawn' }), NOW)).toMatchObject({
      listingWithdrawn: true,
    });
  });
});

const LANGS = { en: appEn, de: appDe, es: appEs, fr: appFr, ja: appJa } as const;
const trs = Object.entries(LANGS).map(([l, d]): [string, Translator] => [
  l,
  makeTranslator(l as keyof typeof LANGS, d),
]);
const sample = (level: LabIdentityLevel): LabIdentity => labIdentity(CASES.find(([, , l]) => l === level)![1], NOW);

describe('the words, in every language', () => {
  for (const [lang, tr] of trs) {
    it(`${lang}: each level has its own title, and says what was seen`, () => {
      const titles = LAB_IDENTITY_LEVELS.map((l) => {
        const w = labIdentityWords(sample(l), tr);
        return tr.t(w.title.key, w.title.vars);
      });
      // "Not verified" and "expired" share a title; every other level has its own.
      expect(new Set(titles).size).toBe(LAB_IDENTITY_LEVELS.length - 1);
      for (const t of titles) expect(t.trim()).not.toBe('');
      const text = (l: LabIdentityLevel) => labIdentityText(sample(l), tr);
      expect(text('none')).toContain('Acme Labs');
      expect(text('website')).toContain('acmelabs.example');
      expect(text('website')).toContain('2026-11-20');
      expect(text('website-withdrawn')).toContain('acmelabs.example');
      expect(text('website-withdrawn')).toContain('2026-11-19');
      expect(text('listing')).toContain('cannabis.example.gov');
      expect(text('listing')).toContain('2026-10-01');
      expect(text('listing')).toContain(tr.t('app.signer.disclaimer'));
      // Every level but the top tells the reader to ask the lab, or to check the address.
      for (const l of ['none', 'expired', 'listing-withdrawn', 'website-withdrawn'] as const)
        expect(text(l).length).toBeGreaterThan(titles[0].length + 20);
    });

    it(`${lang}: "Not verified" never reads as a verified level`, () => {
      const none = labIdentityText(sample('none'), tr);
      const web = labIdentityWords(sample('website'), tr);
      const list = labIdentityWords(sample('listing'), tr);
      const webTitle = tr.t(web.title.key);
      const listTitle = tr.t(list.title.key, list.title.vars);
      expect(none).not.toContain(webTitle);
      expect(none).not.toContain(listTitle);
      // The title of the lowest level is not a substring trick of a verified one, nor the reverse.
      const noneTitle = tr.t('app.labid.none.title');
      expect(webTitle).not.toContain(noneTitle);
      expect(listTitle).not.toContain(noneTitle);
      // Said as caution, never drawn like a verified level.
      expect(labIdentityTone('none')).toBe('caution');
      expect(labIdentitySeverity('none')).toBe('warning');
      expect(labIdentitySeverity('expired')).toBe('warning');
      expect(labIdentitySeverity('listing-withdrawn')).toBe('error');
      expect(labIdentitySeverity('website-withdrawn')).toBe('error');
      expect(labIdentitySeverity('website')).toBe('info');
      expect(labIdentitySeverity('listing')).toBe('success');
    });

    it(`${lang}: only a listing match is called verified`, () => {
      const VERIFIED = /verif|vérif|確認済み/i;
      const web = labIdentityWords(sample('website'), tr);
      expect(tr.t(web.title.key, web.title.vars)).not.toMatch(VERIFIED);
      expect(tr.t(web.title.key, web.title.vars)).toContain('acmelabs.example');
      expect(tr.t('app.lab.strength.website', { domain: 'acmelabs.example' })).not.toMatch(VERIFIED);
      const list = labIdentityWords(sample('listing'), tr);
      expect(tr.t(list.title.key, list.title.vars)).toMatch(VERIFIED);
    });

    it(`${lang}: the plain-text signer says the level too`, () => {
      const who = (a: ResolvedAttestation) => signerLabel(a, 'Signed by', NOW, tr).who;
      expect(who(att({ domainCheck: listed() }))).toContain('acmelabs.example');
      expect(who(att({ domainWithdrawn: gone() }))).toContain('acmelabs.example');
      expect(who(att())).not.toContain('acmelabs.example');
      expect(who(att({ nameCheck: check() }))).toBe('Acme Labs');
      // History titles follow the level.
      const label = (a: ResolvedAttestation) => strengthLabel(a, tr).label;
      expect(
        new Set(
          [att(), att({ domainCheck: listed() }), att({ nameCheck: check() }), att({ domainWithdrawn: gone() })].map(
            label,
          ),
        ).size,
      ).toBe(4);
    });

    it(`${lang}: what it means says VeilCore checks who signed, not the result`, () => {
      const more = [
        'app.labid.more.what',
        'app.labid.more.none',
        'app.labid.more.website',
        'app.labid.more.listing',
        'app.labid.more.withdrawn',
        'app.labid.more.how',
      ] as const;
      for (const k of more) expect(tr.t(k).trim(), k).not.toBe('');
      expect(tr.t('app.labid.more.what')).toMatch(/VeilCore/);
      // Never a word that vouches for the lab or its work.
      for (const k of Object.keys(appEn).filter((x) => x.startsWith('app.labid.')))
        expect(tr.t(k as keyof typeof appEn), k).not.toMatch(
          /VeilCore (vouches|guarantees|certifies|approves)|trusted by VeilCore|accurate result|correct result|fraud|fake/i,
        );
    });
  }
});

describe('the next step, on the lab’s own key screen', () => {
  it('names one action for every level below the top', () => {
    expect(labIdentityNext(sample('none')).action).toBe('website');
    expect(labIdentityNext(sample('listing-withdrawn')).action).toBe('website');
    expect(labIdentityNext(sample('website')).action).toBe('listing');
    expect(labIdentityNext(sample('expired')).action).toBe('listing');
    expect(labIdentityNext(sample('listing')).action).toBeNull();
    expect(labIdentityNext(sample('listing')).text.vars).toEqual({ date: '2027-10-01' });
    expect(labIdentityNext(sample('website-withdrawn')).text.vars).toEqual({ domain: 'acmelabs.example' });
  });
});

describe('ownIdentityFrom: the registry’s record of the lab’s own key', () => {
  let lab: { publicKey: string; privateKey: string };
  let other: { publicKey: string; privateKey: string };
  beforeAll(async () => {
    lab = await generateKeypair();
    other = await generateKeypair();
  });
  const claimBy = async (privateKey: string, publicKey: string, domain: string) => {
    const issuedAt = 1_763_000_000_000;
    const key = await crypto.subtle.importKey(
      'pkcs8',
      new Uint8Array((privateKey.match(/.{2}/g) ?? []).map((x) => parseInt(x, 16))),
      { name: 'Ed25519' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign(
      'Ed25519',
      key,
      new TextEncoder().encode(domainClaimPayload(publicKey, domain, issuedAt)),
    );
    return {
      issuedAt,
      signature: Array.from(new Uint8Array(sig), (x) => x.toString(16).padStart(2, '0')).join(''),
    };
  };

  it('reads each level as a check page would', async () => {
    const base = { publicKey: lab.publicKey, displayName: 'Acme Labs' };
    expect(
      (await ownIdentityFrom(lab.publicKey, { ...base, vetted: false, nameCheckStatus: 'not-checked' }, NOW))?.level,
    ).toBe('none');
    expect(
      (
        await ownIdentityFrom(
          lab.publicKey,
          { ...base, vetted: true, nameCheckStatus: 'checked', nameCheck: check() },
          NOW,
        )
      )?.level,
    ).toBe('listing');
    expect((await ownIdentityFrom(lab.publicKey, { ...base, nameCheckStatus: 'withdrawn' }, NOW))?.level).toBe(
      'listing-withdrawn',
    );
    const claim = await claimBy(lab.privateKey, lab.publicKey, 'acmelabs.example');
    expect(
      (
        await ownIdentityFrom(
          lab.publicKey,
          { ...base, domainCheck: { domain: 'acmelabs.example', method: 'file', checkedAt: LOOKED, claim } },
          NOW,
        )
      )?.level,
    ).toBe('website');
    expect(
      (
        await ownIdentityFrom(
          lab.publicKey,
          { ...base, domainWithdrawn: { domain: 'acmelabs.example', withdrawnAt: LOOKED, claim } },
          NOW,
        )
      )?.level,
    ).toBe('website-withdrawn');
  });

  it('never on the registry’s word for the website: a claim another key signed shows none', async () => {
    const claim = await claimBy(other.privateKey, lab.publicKey, 'acmelabs.example');
    const id = await ownIdentityFrom(
      lab.publicKey,
      {
        publicKey: lab.publicKey,
        displayName: 'Acme Labs',
        domainCheck: { domain: 'acmelabs.example', method: 'file', checkedAt: LOOKED, claim, claimChecked: true },
      },
      NOW,
    );
    expect(id?.level).toBe('none');
  });

  it('answers null for another key’s record or none at all', async () => {
    expect(await ownIdentityFrom(lab.publicKey, { publicKey: other.publicKey }, NOW)).toBeNull();
    expect(await ownIdentityFrom(lab.publicKey, null, NOW)).toBeNull();
  });
});
