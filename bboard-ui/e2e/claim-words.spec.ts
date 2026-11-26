// A claim on a lab result's yes/no call (veilcore/claim-call.ts), on the check page: the result
// word ("Not detected") only when a lab stands behind the numbers, and the slot and number in
// every other state. The mainnet run of 18 November 2026 showed "Detected (1 yes, 0 no) is at
// most 0" for HLVd not detected; a review then found the word would also have shown while
// checking, on a failed check, and with no lab, an unnamed key or a withdrawn result.
//
// The chain's answer is stood in for (veilcore/chain/e2e-chain.ts `claim`, e2e build only).
// SPDX-License-Identifier: Apache-2.0

import { expect, test, type Page } from '@playwright/test';
import { REAL_REGISTRY, expectNoErrors, isolate, watch } from './helpers';

test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

const KEY = '6f'.repeat(64);
const linkFor = (more: Record<string, unknown>) =>
  Buffer.from(
    JSON.stringify({
      v: 1,
      contract: 'c1'.repeat(32),
      txId: 'ab'.repeat(32),
      record: 'cd'.repeat(32),
      schema: 'veilcore/schema/pathogen/v1',
      slot: 0,
      attested: { txId: 'ef'.repeat(32), attester: KEY, about: '7e'.repeat(32) },
      ...more,
    }),
  ).toString('base64url');

/** Open the check page with the chain answering `verdict` ('checking': no answer yet). */
const open = async (page: Page, verdict: unknown, more: Record<string, unknown> = {}) => {
  await page.addInitScript((v) => {
    (window as unknown as { __veilcoreE2EChain: unknown }).__veilcoreE2EChain = { claim: () => v };
  }, verdict);
  await isolate(page);
  await page.goto(`/check-claim#c=${linkFor({ kind: 'range', op: 'at-most', bound: '0', ...more })}`);
};

const RAW = 'Detected (1 yes, 0 no) is at most 0';
const ok = (signer?: unknown) => ({
  ok: true,
  blockHeight: 3514956,
  lab: { ok: true, attester: KEY, blockHeight: 3514926, ...(signer ? { signer } : {}) },
});
const BOUND = {
  kind: 'bound',
  attestation: { signatureValid: true, retraction: null, attester: { displayName: 'TEST Lab (Hunter)' } },
};

test('a lab standing behind it: the result word, with the slot and number under it', async ({ page }) => {
  const errors = watch(page);
  await open(page, ok(BOUND));
  await expect(page.locator('[data-claim-verdict="ok"]')).toBeVisible();
  await expect(page.locator('[data-claim-statement]')).toHaveText('Not detected');
  await expect(page.locator('[data-claim-raw]')).toHaveText(`As proved on Midnight: ${RAW}.`);
  await expect(page.locator('[data-claim-signer="bound"]')).toContainText('TEST Lab (Hunter)');
  // The claim checked, but nothing dates its record on Midnight here: the top line warns, never green.
  await expect(page.locator('[data-verdict]')).toHaveAttribute('data-verdict', 'warn');
  await expect(page.locator('[data-verdict]')).toContainText('no date on Midnight was confirmed for a record it names');
  // The closing line says what a yes/no claim shows: the result, not "the number meets the bound".
  await expect(page.locator('[data-claim-check]')).toContainText(
    'What this shows: the result sealed in that record is “Not detected”, and the key above signed that record’s results.',
  );
  await expect(page.locator('[data-claim-check]')).not.toContainText('meets the bound');
  expectNoErrors(errors);
});

test('"exactly 1" with a lab standing behind it says Detected; "at least 1" keeps the number', async ({ page }) => {
  await open(page, ok(BOUND), { kind: 'value', value: '1', op: undefined, bound: undefined });
  await expect(page.locator('[data-claim-statement]')).toHaveText('Detected');
  await page.goto('about:blank');
  await page.goto(`/check-claim#c=${linkFor({ kind: 'range', op: 'at-least', bound: '1' })}`);
  await expect(page.locator('[data-claim-statement]')).toHaveText('Detected (1 yes, 0 no) is at least 1');
  await expect(page.locator('[data-claim-raw]')).toHaveCount(0);
  // "At least 1" doesn't force Detected: the closing line keeps to the code, never the word.
  await expect(page.locator('[data-claim-check]')).toContainText(
    'What this shows: the result code sealed in that record meets the line above, and the key above signed',
  );
});

for (const [state, verdict, footer] of [
  [
    'while it is being checked',
    'checking',
    /the result code sealed in that record meets the line above\..*the holder typed the result\./,
  ],
  [
    'when the check fails',
    { ok: false, reason: 'That transaction is not a claim.' },
    /the result code sealed in that record meets the line above\..*the holder typed the result\./,
  ],
  [
    'with no lab signature',
    { ok: true, blockHeight: 1 },
    /the result code sealed in that record meets the line above\..*the holder typed the result\./,
  ],
  [
    'when the lab signature fails',
    { ok: true, lab: { ok: false, reason: 'A different key.' } },
    /the result code sealed in that record meets the line above\..*the holder typed the result\./,
  ],
  ['with a key no lab is tied to', ok({ kind: 'none' }), /the result code .* read the result as the holder’s own/],
  [
    'with a key more than one lab claims',
    ok({ kind: 'conflict' }),
    /the result code .* read the result as the holder’s own/,
  ],
  [
    'when the lab withdrew the result',
    ok({ kind: 'retracted', attestation: { retraction: { reason: 'retraction' } } }),
    /the result code sealed in that record .*The lab has since withdrawn this result/,
  ],
] as const)
  test(`the slot and number, never the result word, ${state}`, async ({ page }) => {
    const errors = watch(page);
    await open(page, verdict);
    await expect(page.locator('[data-claim-statement]')).toHaveText(RAW);
    await expect(page.locator('[data-claim-raw]')).toHaveCount(0);
    await expect(page.getByText('Not detected', { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-claim-check]')).not.toContainText('“Not detected”');
    await expect(page.locator('[data-claim-check]')).toContainText(footer);
    expectNoErrors(errors);
  });
