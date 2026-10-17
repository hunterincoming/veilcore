// The check page's words for an anchor it looked up on Midnight (anchor-words.ts).
import { describe, expect, it } from 'vitest';
import {
  anchorConfirmed,
  anchorHeading,
  anchorHistoryEvent,
  anchorLine,
  anchorSummary,
  registryDateWords,
} from './anchor-words';
import { checkedSummary } from '../../veilcore/verify-link';

const TX = 'e13c88f5a2fb38cf4feb08d7188d1c0dc3c575a4fb4dba3dbacb2f601896bcbf';
const OK = {
  status: 'checked',
  txHash: TX,
  blockHeight: 2973563,
  blockTime: Date.UTC(2026, 9, 11, 14, 3, 7),
  indexers: 1,
} as const;

describe('anchorLine', () => {
  it('a confirmed anchor: the transaction, block and time in UTC, ticked only against the link’s fingerprint', () => {
    expect(anchorLine(OK, { network: 'mainnet', bound: true })).toEqual({
      status: 'checked',
      text: `Checked on Midnight: this batch root was written by transaction ${TX} in block 2973563 at 2026-10-11 14:03 UTC.`,
    });
    expect(anchorLine(OK, { network: 'mainnet', bound: false })?.status).toBe('reported');
    expect(anchorLine({ ...OK, indexers: 2 }, { network: 'mainnet', bound: true })?.text).toMatch(
      /Two separate Midnight indexers gave the same answer\.$/,
    );
    expect(anchorLine(OK, { network: 'preprod', bound: true })?.text).toMatch(/A test network can be reset/);
  });

  it('a failure is plain, marked failed, and says not to rely on the date', () => {
    expect(
      anchorLine(
        { status: 'failed', reason: 'that transaction wrote a different batch root (abc…)' },
        { network: 'mainnet', bound: true },
      ),
    ).toEqual({
      status: 'failed',
      text: 'Not confirmed on Midnight: that transaction wrote a different batch root (abc…). Don’t rely on the date the registry reports.',
    });
  });

  it('no indexer answered: the registry’s date, in UTC and labelled as its report, not marked checked', () => {
    expect(
      anchorLine(
        { status: 'unreachable', reason: 'the indexer did not answer' },
        { network: 'mainnet', bound: true, reportedAt: '2026-10-11T14:03:07.000Z' },
      ),
    ).toEqual({
      status: 'reported',
      text: 'Couldn’t reach a Midnight indexer. The date is 2026-10-11 14:03 UTC, as VeilCore’s registry reports it; not checked here.',
    });
    expect(
      anchorLine(
        { status: 'unreachable', reason: 'only one of the two indexers answered, and both must' },
        { network: 'mainnet', bound: true, reportedAt: '2026-10-11T14:03:07.000Z' },
      )?.text,
    ).toMatch(/^Only one of the two Midnight indexers answered, and both must\. The date is 2026-10-11 14:03 UTC/);
  });

  it('never says “the date shown” when there is no date: it says the registry gives none', () => {
    for (const reportedAt of [undefined, '', 'not a date']) {
      const t = anchorLine({ status: 'unreachable', reason: 'x' }, { network: 'mainnet', bound: true, reportedAt });
      expect(t?.text).toBe(
        'Couldn’t reach a Midnight indexer. The date is not given (VeilCore’s registry gives no date for that transaction); not checked here.',
      );
      expect(t?.text).not.toMatch(/date shown/);
    }
    expect(registryDateWords('2026-10-11T14:03:07Z')).toBe('2026-10-11 14:03 UTC, as VeilCore’s registry reports it');
  });

  it('nothing to look it up with: no extra line (the registry’s report already says so)', () => {
    expect(
      anchorLine({ status: 'not-checked', why: 'not-configured', reason: '' }, { network: 'mainnet', bound: true }),
    ).toBeUndefined();
  });

  it('while looking: says so, without a mark of its own', () => {
    expect(anchorLine('checking', { network: 'mainnet', bound: true })).toEqual({
      status: 'reported',
      text: 'Looking that transaction up on Midnight’s main network…',
    });
  });
});

describe('heading, seal and footer', () => {
  const base = 'Date stamp reported by the registry, not checked here';
  it('the heading changes only for a confirmed or failed anchor against the link’s own fingerprint', () => {
    expect(anchorHeading(base, OK, true)).toBe('Date stamp checked on Midnight');
    expect(anchorHeading(base, OK, true, 'mainnet')).toBe('Date stamp checked on Midnight');
    expect(anchorHeading(base, OK, false)).toBe(base);
    expect(anchorHeading(base, { status: 'failed', reason: 'x' }, true)).toBe('Date stamp not confirmed on Midnight');
    expect(anchorHeading(base, { status: 'unreachable', reason: 'x' }, true)).toBe(base);
    expect(anchorHeading(base, 'checking', true)).toBe(base);
  });

  it('a date checked on a test network says so in the heading: never the mainnet wording', () => {
    for (const n of ['preprod', 'preview', 'undeployed']) {
      const h = anchorHeading(base, OK, true, n);
      expect(h).toBe('Date stamp checked on a test network: practice data, not a real date');
      expect(h).not.toBe(anchorHeading(base, OK, true, 'mainnet'));
    }
  });

  it('one word set: “date stamp”, never “dated batch” or “anchored” in the headings', () => {
    const all = [
      base,
      anchorHeading(base, OK, true),
      anchorHeading(base, OK, true, 'preview'),
      anchorHeading(base, { status: 'failed', reason: 'x' }, true),
    ];
    for (const h of all) {
      expect(h).toMatch(/^Date stamp /);
      expect(h).not.toMatch(/dated batch|anchored/i);
    }
  });

  it('the seal: only a confirmed anchor', () => {
    expect(anchorConfirmed(OK)).toBe(true);
    for (const c of [
      'checking',
      undefined,
      { status: 'failed', reason: '' },
      { status: 'unreachable', reason: '' },
    ] as const)
      expect(anchorConfirmed(c)).toBe(false);
  });

  it('the footer adds the anchor to the list of what this browser checked', () => {
    const one = checkedSummary({ bound: true, proofChecked: false, signaturesChecked: 0 });
    expect(anchorSummary(one, OK)).toBe(
      'Checked in this browser: the link’s proof code matches the one the registry reports and the batch root’s date stamp, looked up on Midnight. Everything else is the VeilCore registry’s report.',
    );
    const two = checkedSummary({
      bound: true,
      proofChecked: true,
      signaturesChecked: 1,
      signatureKinds: ['Lab report (x)'],
    });
    expect(anchorSummary(two, OK)).toBe(
      'Checked in this browser: the link’s proof code matches the one the registry reports, the record is in its batch and one signature about it (a lab report), and the batch root’s date stamp, looked up on Midnight. Everything else is the VeilCore registry’s report.',
    );
    expect(anchorSummary(two, { status: 'unreachable', reason: '' })).toBe(two);
    expect(anchorSummary(two, 'checking')).toBe(two);
  });
});

describe('History’s entry for the date stamp (same answer as the plant page and the check page)', () => {
  const a = { network: 'preview', txHash: TX, anchoredAt: '2026-10-11T14:00:00Z', batchId: 'B-1' };
  it('checked: dated by the block, says the network in plain words', () => {
    const e = anchorHistoryEvent(OK, a);
    expect(e.at).toBe(OK.blockTime);
    expect(e.title).toBe('Date stamp checked on a test network');
    expect(e.detail).toContain('Midnight Preview (test network)');
    expect(e.detail).not.toMatch(/midnight preview/);
    expect(anchorHistoryEvent(OK, { ...a, network: 'mainnet' })).toMatchObject({
      title: 'Date stamp checked on Midnight',
      strong: true,
    });
  });
  it('not confirmed, or not checked: never presented as the date', () => {
    expect(
      anchorHistoryEvent({ status: 'failed', reason: 'that transaction wrote a different batch root' }, a),
    ).toMatchObject({
      title: 'Date stamp not confirmed on Midnight',
      strong: false,
    });
    for (const c of ['checking', { status: 'unreachable', reason: 'x' }, undefined] as const) {
      const e = anchorHistoryEvent(c, a);
      expect(e.title).toBe('Date stamp reported by the registry');
      expect(e.detail).toMatch(/2026-10-11 14:00 UTC, as VeilCore’s registry reports it/);
      expect(e.detail).toMatch(/Don’t rely on the date until it is checked/);
      expect(e.strong).toBe(false);
    }
  });
});
