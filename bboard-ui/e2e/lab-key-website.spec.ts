// A lab's key on its own website (docs/lab-key-on-website.md), on the built check page, against
// a stand-in registry serving a real Ed25519-signed receipt:
//   - the key signed a claim naming its website and the registry found it listed: the line
//     names the website, says VeilCore looked and when, and links the file to look yourself;
//   - the website stopped listing the key: said plainly, never as "listed";
//   - a claim signed by another key: no website at all, whatever the registry says.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Route } from '@playwright/test';
import { generateKeypair, signAttestation, signRetraction } from 'veilcore-records';
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

const toHex = (b: ArrayBuffer) => Buffer.from(b).toString('hex');
const claimBy = async (privateKey: string, publicKey: string, domain: string) => {
  const issuedAt = Date.now() - 86_400_000;
  const key = await crypto.subtle.importKey('pkcs8', Buffer.from(privateKey, 'hex'), { name: 'Ed25519' }, false, [
    'sign',
  ]);
  const payload = `veilcore:lab-domain:v1\n${publicKey}\n${domain}\n${String(issuedAt)}`;
  return { issuedAt, signature: toHex(await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(payload))) };
};

/** The check page for a record with one receipt signed by `lab`, its registration as given. */
const openCheck = async (
  page: Page,
  registeredAs: Record<string, unknown>,
  lab: { publicKey: string; privateKey: string },
  opts: { withdrawn?: boolean } = {},
) => {
  const receipt = await signAttestation(
    {
      attestationId: 'att_web_e2e',
      type: 'chain-of-custody',
      subjectCommitment: fixture.fingerprint,
      attester: { publicKey: lab.publicKey, displayName: 'Stand-in Lab' },
      documentHash: 'e'.repeat(64),
      hashAlgorithm: 'sha256',
      issuedAt: '2026-11-17T10:00:00Z',
    },
    lab.privateKey,
  );
  // A receipt its lab withdrew, signed by the lab's own key (attester-keys.ts retract).
  const retraction = opts.withdrawn
    ? await signRetraction(
        {
          attestationId: receipt.attestationId,
          attesterPublicKey: lab.publicKey,
          reason: 'other',
          retractedAt: '2026-11-18T10:00:00Z',
        },
        lab.privateKey,
      )
    : null;
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
            ...receipt,
            strength: 'signed',
            vettedAttester: false,
            registeredAs: { displayName: 'Stand-in Lab', ...registeredAs },
            retraction,
          },
        ],
        total: 1,
      }),
  });
  await page.route('https://indexer.preview.midnight.network/**', indexer);
  await page.goto(`/verify/${RECORD}?fp=${fixture.fingerprint}`);
  await expect(page.locator('[data-verdict]')).not.toHaveAttribute('data-verdict', 'wait', { timeout: 30_000 });
  // A withdrawn signature opens the checks by itself, never folded under a green line.
  if (opts.withdrawn) await expect(page.locator('[data-see-checks]')).toHaveAttribute('aria-expanded', 'true');
  // The signature lines are among the checks folded under "See the checks".
  await seeChecks(page);
};

const today = () => new Date().toISOString().slice(0, 10);

test('listed on the lab’s website: the line says so, who looked and when, and links the file', async ({ page }) => {
  const errors = watch(page);
  const lab = await generateKeypair();
  await openCheck(
    page,
    {
      domainCheck: {
        domain: 'stand-in-lab.example',
        method: 'file',
        checkedAt: new Date().toISOString(),
        claim: await claimBy(lab.privateKey, lab.publicKey, 'stand-in-lab.example'),
      },
    },
    lab,
  );
  const link = page.locator('[data-lab-domain="listed"]');
  await expect(link).toHaveText('stand-in-lab.example');
  await expect(link).toHaveAttribute('href', 'https://stand-in-lab.example/.well-known/veilcore-lab.json');
  // The level, in words (docs/lab-identity-levels.md), with when VeilCore last saw the listing.
  const badge = page.locator('[data-lab-identity="website"]');
  await expect(badge).toContainText('Verified by website');
  await expect(badge).toContainText(`VeilCore last saw it there on ${today()}.`);
  await expect(
    page.getByText('a key calling itself “Stand-in Lab”, listed by stand-in-lab.example').first(),
  ).toBeVisible();
  // The box names the level as the signer's words do.
  await expect(page.locator('[data-who-vouches]')).toContainText('listed by stand-in-lab.example');
  // Never more than what was seen.
  await expect(page.locator('main')).not.toContainText(/real lab|verified lab|owns this key/i);
  expectNoErrors(errors);
});

test('the website stopped listing the key: said plainly, with the date', async ({ page }) => {
  const errors = watch(page);
  const lab = await generateKeypair();
  await openCheck(
    page,
    {
      domainCheck: null,
      domainWithdrawn: {
        domain: 'stand-in-lab.example',
        method: 'file',
        withdrawnAt: new Date().toISOString(),
        claim: await claimBy(lab.privateKey, lab.publicKey, 'stand-in-lab.example'),
      },
    },
    lab,
  );
  await expect(page.locator('[data-lab-domain="withdrawn"]')).toHaveText('stand-in-lab.example');
  const badge = page.locator('[data-lab-identity="website-withdrawn"]');
  await expect(badge).toContainText('Withdrawn by website');
  await expect(badge).toContainText(`no longer lists this key: VeilCore saw that on ${today()}.`);
  await expect(page.locator('[data-lab-domain="listed"]')).toHaveCount(0);
  // Said briefly in "What each fact rests on" too, on the signer's own row.
  await expect(page.locator('[data-who-vouches]')).toContainText(
    'Its website has since stopped listing this key (below).',
  );
  expectNoErrors(errors);
});

test('a claim another key signed: no website named, whatever the registry says', async ({ page }) => {
  const errors = watch(page);
  const lab = await generateKeypair();
  const other = await generateKeypair();
  await openCheck(
    page,
    {
      domainCheck: {
        domain: 'stand-in-lab.example',
        method: 'file',
        checkedAt: new Date().toISOString(),
        claim: await claimBy(other.privateKey, lab.publicKey, 'stand-in-lab.example'),
        claimChecked: true,
      },
    },
    lab,
  );
  await expect(page.getByText('a key calling itself “Stand-in Lab” (not verified)').first()).toBeVisible();
  await expect(page.locator('[data-lab-domain]')).toHaveCount(0);
  expectNoErrors(errors);
});

test('a receipt its lab withdrew: an amber top line that says so, and the checks open', async ({ page }) => {
  const errors = watch(page);
  await openCheck(page, {}, await generateKeypair(), { withdrawn: true });
  const verdict = page.locator('[data-verdict]');
  await expect(verdict).toHaveAttribute('data-verdict', 'warn');
  // The e2e build reads a test network, but a withdrawal is said before "practice".
  await expect(verdict).toContainText('but a lab withdrew its signature. See the checks below.');
  await expect(verdict).not.toContainText('All checks passed');
  expectNoErrors(errors);
});
