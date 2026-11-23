// A lab key's identity level on the built check page (docs/lab-identity-levels.md), against a
// stand-in registry serving a real Ed25519-signed lab report: each level says its own words, in
// every language, with the website or the listing shown, and "What does this mean?" opens.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Route } from '@playwright/test';
import { generateKeypair, signAttestation } from 'veilcore-records';
import { REAL_REGISTRY, expectNoErrors, isolate, json, seeChecks, watch } from './helpers';

test.skip(REAL_REGISTRY, 'these use the stand-in registry');

const fixture = JSON.parse(
  readFileSync(new URL('../src/veilcore/chain/fixtures/anchor-indexer.json', import.meta.url), 'utf8'),
) as { fingerprint: string; proof: Record<string, unknown>; stateHex: string };

const RECORD = `VEIL-${'5D'.repeat(16)}`;
const TX = 'e13c88f5a2fb38cf4feb08d7188d1c0dc3c575a4fb4dba3dbacb2f601896bcbf';
const CONTRACT = '00'.repeat(32);
const ANCHOR = {
  chain: 'midnight',
  network: 'preview',
  contractAddress: CONTRACT,
  txHash: TX,
  anchoredAt: '2026-10-11T14:00:00.000Z',
};
const DOMAIN = 'stand-in-lab.example';
const LISTING = 'https://cannabis.example.gov/licensed-testing-labs';

const indexer = (route: Route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({
      data: {
        byHash: [
          {
            hash: TX,
            block: { height: 2973563, timestamp: Date.UTC(2026, 9, 11, 14, 3, 7) },
            identifiers: ['ab'.repeat(32)],
            transactionResult: { status: 'SUCCESS' },
            contractActions: [{ address: CONTRACT, state: fixture.stateHex, entryPoint: 'anchorBatch' }],
          },
        ],
        byId: [],
      },
    }),
  });

const claimBy = async (privateKey: string, publicKey: string, domain: string) => {
  const issuedAt = Date.now() - 86_400_000;
  const key = await crypto.subtle.importKey('pkcs8', Buffer.from(privateKey, 'hex'), { name: 'Ed25519' }, false, [
    'sign',
  ]);
  const payload = `veilcore:lab-domain:v1\n${publicKey}\n${domain}\n${String(issuedAt)}`;
  return {
    issuedAt,
    signature: Buffer.from(await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(payload))).toString('hex'),
  };
};

const day = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

type Level = 'none' | 'website' | 'listing' | 'website-withdrawn' | 'listing-withdrawn' | 'expired';

/** What the registry says about the key, for each level. */
const registration = async (level: Level, lab: { publicKey: string; privateKey: string }) => {
  const claim = await claimBy(lab.privateKey, lab.publicKey, DOMAIN);
  const check = {
    source: 'licence-listing',
    sourceUrl: LISTING,
    licenceNo: 'TL-000123',
    emailDomain: DOMAIN,
    checkedAt: day(-30),
    checkedBy: 'HR',
    expiresAt: day(300),
    checkedName: 'Stand-in Lab',
  };
  switch (level) {
    case 'none':
      return { vetted: false, reg: { nameCheckStatus: 'not-checked' } };
    case 'website':
      return {
        vetted: false,
        reg: { domainCheck: { domain: DOMAIN, method: 'file', checkedAt: new Date().toISOString(), claim } },
      };
    case 'listing':
      return { vetted: true, reg: { vetted: true, nameCheck: check, nameCheckStatus: 'checked' } };
    case 'website-withdrawn':
      return {
        vetted: false,
        reg: { domainWithdrawn: { domain: DOMAIN, method: 'file', withdrawnAt: new Date().toISOString(), claim } },
      };
    case 'listing-withdrawn':
      return { vetted: false, reg: { nameCheckStatus: 'withdrawn' } };
    case 'expired':
      return { vetted: false, reg: { nameCheckStatus: 'expired' } };
  }
};

const openCheck = async (page: Page, level: Level, lang: string) => {
  const lab = await generateKeypair();
  const report = await signAttestation(
    {
      attestationId: 'att_level_e2e',
      type: 'laboratory-report',
      subjectCommitment: fixture.fingerprint,
      attester: { publicKey: lab.publicKey, displayName: 'Stand-in Lab' },
      documentHash: 'e'.repeat(64),
      hashAlgorithm: 'sha256',
      issuedAt: '2026-11-17T10:00:00Z',
    },
    lab.privateKey,
  );
  const { vetted, reg } = await registration(level, lab);
  await isolate(page, {
    'GET /verify/:record': (route) =>
      json(route, 200, {
        found: true,
        id: RECORD,
        recordFingerprint: fixture.fingerprint,
        anchored: true,
        anchor: { network: 'preview', txHash: TX },
        disclosed: [],
      }),
    [`GET /proof/${fixture.fingerprint}`]: (route) => json(route, 200, { ...fixture.proof, anchor: ANCHOR }),
    [`GET /attestations/subject/${fixture.fingerprint}`]: (route) =>
      json(route, 200, {
        attestations: [
          {
            ...report,
            strength: 'signed',
            vettedAttester: vetted,
            registeredAs: { displayName: 'Stand-in Lab', ...reg },
            retraction: null,
          },
        ],
        total: 1,
      }),
  });
  await page.route('https://indexer.preview.midnight.network/**', indexer);
  await page.goto(`/verify/${RECORD}?fp=${fixture.fingerprint}&lang=${lang}`);
  await expect(page.locator('[data-verdict]')).not.toHaveAttribute('data-verdict', 'wait', { timeout: 30_000 });
  await seeChecks(page);
};

/**
 * The app's words for labs in one language, read from its source file (app/<lang>/lab.ts):
 * importing the dictionaries here would pull in the build's environment.
 */
const words = (lang: string): Record<string, string> => {
  const src = readFileSync(new URL(`../src/i18n/app/${lang}/lab.ts`, import.meta.url), 'utf8');
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/^ {2}'([\w.-]+)':\s*(['"])(.*?)\2,$/gms)) out[m[1]] = m[3];
  return out;
};
const DICTS: Record<string, Record<string, string>> = Object.fromEntries(
  ['en', 'de', 'es', 'fr', 'ja'].map((l) => [l, words(l)]),
);
const TITLE: Record<Level, string> = {
  none: 'app.labid.none.title',
  expired: 'app.labid.none.title',
  website: 'app.labid.website.title',
  listing: 'app.labid.listing.title',
  'website-withdrawn': 'app.labid.websiteWithdrawn.title',
  'listing-withdrawn': 'app.labid.listingWithdrawn.title',
};
const LEVELS: Level[] = ['none', 'website', 'listing', 'website-withdrawn', 'listing-withdrawn', 'expired'];
const SHOTS = process.env.LAB_LEVEL_SHOTS;

for (const lang of Object.keys(DICTS))
  test(`${lang}: each identity level says its own words on the check page`, async ({ page }) => {
    test.setTimeout(180_000);
    const d = DICTS[lang];
    const errors = watch(page);
    for (const level of LEVELS) {
      await openCheck(page, level, lang);
      const badge = page.locator(`[data-lab-identity="${level}"]`).first();
      await expect(badge).toBeVisible();
      const title = d[TITLE[level]].replace('{listing}', 'cannabis.example.gov').replace('{domain}', DOMAIN);
      await expect(badge.locator('[data-lab-identity-title]')).toHaveText(title);
      if (level === 'none') {
        await expect(badge).toContainText(d['app.labid.none.body']);
        await expect(badge).toContainText('Stand-in Lab');
      }
      if (level === 'expired') await expect(badge).toContainText(d['app.labid.expired.body']);
      if (level === 'website' || level === 'website-withdrawn') {
        const link = badge.locator(`[data-lab-domain="${level === 'website' ? 'listed' : 'withdrawn'}"]`);
        await expect(link).toHaveText(DOMAIN);
        await expect(link).toHaveAttribute('href', `https://${DOMAIN}/.well-known/veilcore-lab.json`);
        await expect(badge).toContainText(day());
      }
      if (level === 'listing') {
        await expect(badge.locator('[data-name-check-source]')).toHaveAttribute('href', LISTING);
        await expect(badge).toContainText(d['app.signer.disclaimer']);
      }
      // Only a listing match is "verified": no other level carries the listing title's words,
      // and a level below the website never carries the website's.
      const listingWords = d['app.labid.listing.title'].replace(' {listing}', '').replace('{listing}', '');
      const websiteWords = d['app.labid.website.title'].replace(' {domain}', '').replace('{domain}', '');
      if (level !== 'listing') await expect(badge.locator('[data-lab-identity-title]')).not.toContainText(listingWords);
      if (level !== 'website' && level !== 'listing') await expect(badge).not.toContainText(websiteWords);
      if (level === 'website')
        await expect(badge.locator('[data-lab-identity-title] [data-lab-domain]')).toHaveText(DOMAIN);
      // Screenshots for review (LAB_LEVEL_SHOTS): the page, then the badge with its explainer open.
      const shoot = async (open: boolean) => {
        if (!SHOTS || (lang !== 'en' && lang !== 'ja')) return;
        for (const width of [390, 1366]) {
          await page.setViewportSize({ width, height: 900 });
          await badge.scrollIntoViewIfNeeded();
          const name = `${SHOTS}/${lang}-${level}-${String(width)}`;
          if (open) await badge.screenshot({ path: `${name}-explained.png` });
          else await page.screenshot({ path: `${name}.png` });
        }
        await page.setViewportSize({ width: 390, height: 844 });
      };
      await shoot(false);
      // What it means: which key signed and whose it is, never the quality of the result.
      // The opened checks finish drawing a moment after they open, and what they add above
      // moves the badge down; a tap during that move lands beside the link. Wait until it stays put.
      const more = badge.locator('[data-lab-identity-more]');
      await expect
        .poll(async () => {
          const before = await more.boundingBox();
          await page.waitForTimeout(250);
          return before?.y === (await more.boundingBox())?.y;
        })
        .toBe(true);
      await more.click();
      await expect(badge).toContainText(d['app.labid.more.what']);
      await shoot(true);
    }
    expectNoErrors(errors);
  });
