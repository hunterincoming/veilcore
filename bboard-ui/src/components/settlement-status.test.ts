// The holder's "Date on Midnight" section (SettlementStatus.tsx): it looks the registry's
// anchor up on Midnight the way the check page does, and words it the same way.
// Run: npx vitest run src/components/settlement-status.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reportedText, settlementChip } from './settlement-words';
import { anchorLine } from './verify/anchor-words';
import { withEnglish } from '../i18n/source-words';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TX = 'e13c88f5a2fb38cf4feb08d7188d1c0dc3c575a4fb4dba3dbacb2f601896bcbf';
const OK = {
  status: 'checked',
  txHash: TX,
  blockHeight: 2973563,
  blockTime: Date.UTC(2026, 9, 11, 14, 3),
  indexers: 1,
} as const;

describe('the chip', () => {
  it('says "checked on Midnight" only once this browser found the root there', () => {
    expect(settlementChip(false, 'mainnet', undefined)).toBe('In a batch, not yet anchored');
    expect(settlementChip(true, 'mainnet', OK)).toBe('In a batch · date checked on Midnight’s main network');
    for (const a of [undefined, 'checking', { status: 'unreachable', reason: 'x' }] as const)
      expect(settlementChip(true, 'mainnet', a)).toBe('In a batch · anchor reported on Midnight’s main network');
    expect(settlementChip(true, 'mainnet', { status: 'failed', reason: 'x' })).toBe(
      'In a batch · date stamp not confirmed',
    );
    // Never "Anchored" on the registry's word.
    for (const a of [undefined, 'checking', OK, { status: 'failed', reason: 'x' }] as const)
      expect(settlementChip(true, 'mainnet', a)).not.toMatch(/^Anchored/);
  });
});

describe('the paragraph', () => {
  it('without an indexer to ask: says this page has not looked the transaction up', () => {
    const t = reportedText('B-1', 'mainnet', false, false);
    expect(t).toMatch(/this page has not looked the transaction up, so it is not shown as anchored/);
    expect(t).not.toMatch(/test network/);
  });
  it('while or after looking: the registry’s report, with the result on its own line', () => {
    const t = reportedText('B-1', 'preprod', true, false);
    expect(t).toMatch(/The registry reports that root was recorded on/);
    expect(t).not.toMatch(/has not looked/);
    expect(t).toMatch(/A test network can be reset/);
  });
  it('confirmed: no "the registry reports", and the test note comes once, from the line under it', () => {
    const t = reportedText('B-1', 'preprod', true, true);
    expect(t).toBe(
      "Checked in this browser: your record's proof code is in batch B-1, and the path from it folds to the batch root.",
    );
    const line = anchorLine(OK, { network: 'preprod', bound: true });
    expect(line?.status).toBe('checked');
    expect(`${t} ${line?.text}`.match(/A test network can be reset/g)?.length).toBe(1);
  });
});

describe('the component', () => {
  // Each t('app.…') read as the English it shows (i18n/source-words.ts).
  const src = withEnglish(fs.readFileSync(path.join(HERE, 'SettlementStatus.tsx'), 'utf8'));
  it('looks the anchor up through the shared look-up (the contract this build pins, never the registry’s)', () => {
    // record-date.test.ts checks lookUpAnchor itself; here, that this section uses it.
    expect(src).toMatch(/useRecordDate\(record\.recordFingerprint\)/);
    expect(src).not.toMatch(/checkAnchorOnChain|proofFor\(/);
    expect(src).not.toMatch(/contractAddress: a\.contractAddress/);
  });
  it('uses the check page’s words and marks (anchor-words.ts, Fact)', () => {
    expect(src).toMatch(
      /anchorLine\(anchor, \{ network, bound: true, reportedAt: proof\.anchor\?\.anchoredAt \}, tr\)/,
    );
    expect(src).toMatch(/<Fact status=\{anchorText\.status\}>\{anchorText\.text\}<\/Fact>/);
  });
  it('points to the evidence bundle and the check page, not “the open-source package and a lookup”', () => {
    expect(src).not.toMatch(/open-source package and a lookup on the network/);
    expect(src).toMatch(/The evidence bundle has everything/);
    expect(src).toMatch(/the check page does the look-up in the browser when it can reach Midnight/);
  });
});
