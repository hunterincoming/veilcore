// The one line at the top of a check page (verdict.ts): never kinder than the checks under it.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { recordVerdict } from './verdict';
import type { ProofState } from '../../veilcore/proofs';
import type { AnchorState } from './anchor-words';
import { isIosHomeScreenApp, showHomeScreenStart } from '../site/home-screen';

const reported = { status: 'anchor-reported', proof: { anchor: { anchoredAt: '2026-10-11T14:03:00Z' } } } as ProofState;
const checked = { status: 'checked', blockTime: Date.UTC(2026, 9, 11), blockHeight: 1 } as unknown as AnchorState;
const base = {
  sealed: true,
  bound: true,
  proof: reported,
  anchor: checked as AnchorState | undefined,
  signaturesChecking: false,
  failed: false,
  testNetwork: false,
  reportedAt: '2026-10-11T14:03:00Z',
};

describe('the check page’s one line', () => {
  it('says "all checks passed" only when the date was checked on Midnight and nothing failed', () => {
    expect(recordVerdict(base)).toMatchObject({ tone: 'ok', key: 'app.verify.verdict.dated' });
    expect(recordVerdict({ ...base, failed: true })).toMatchObject({
      tone: 'warn',
      key: 'app.verify.verdict.datedButFailed',
    });
    expect(recordVerdict({ ...base, testNetwork: true }).key).toBe('app.verify.verdict.datedTest');
  });

  it('a date the browser hasn’t confirmed is the server’s report; a failed one says not to rely on it', () => {
    expect(recordVerdict({ ...base, anchor: undefined })).toMatchObject({
      tone: 'warn',
      key: 'app.verify.verdict.reported',
      date: '2026-10-11T14:03:00Z',
    });
    expect(recordVerdict({ ...base, anchor: { status: 'unreachable', reason: 'x' } }).key).toBe(
      'app.verify.verdict.reported',
    );
    expect(recordVerdict({ ...base, anchor: undefined, reportedAt: undefined }).key).toBe(
      'app.verify.verdict.reportedNoDate',
    );
    expect(recordVerdict({ ...base, anchor: { status: 'failed', reason: 'x' } })).toMatchObject({
      tone: 'fail',
      key: 'app.verify.verdict.dateFailed',
    });
  });

  it('a link without its proof code, a record without one, waiting and not yet dated', () => {
    expect(recordVerdict({ ...base, bound: false }).key).toBe('app.verify.verdict.unbound');
    expect(recordVerdict({ ...base, sealed: false }).key).toBe('app.verify.verdict.nothing');
    expect(recordVerdict({ ...base, proof: 'checking' }).key).toBe('app.verify.verdict.checking');
    expect(recordVerdict({ ...base, signaturesChecking: true }).key).toBe('app.verify.verdict.checking');
    expect(recordVerdict({ ...base, anchor: 'checking' }).key).toBe('app.verify.verdict.checking');
    expect(recordVerdict({ ...base, proof: { status: 'none' } })).toMatchObject({ tone: 'wait' });
    expect(recordVerdict({ ...base, proof: { status: 'none' }, failed: true }).key).toBe(
      'app.verify.verdict.notYetFailed',
    );
  });
});

describe('the iPhone Home Screen start screen', () => {
  it('only for an iOS Home Screen app with nothing stored, on the pages it opens on', () => {
    expect(isIosHomeScreenApp({ standalone: true })).toBe(true);
    expect(isIosHomeScreenApp({})).toBe(false);
    expect(isIosHomeScreenApp(undefined)).toBe(false);
    const f = { standalone: true, hasRecords: false, pathname: '/records', dismissed: false };
    expect(showHomeScreenStart(f)).toBe(true);
    expect(showHomeScreenStart({ ...f, hasRecords: true })).toBe(false);
    expect(showHomeScreenStart({ ...f, standalone: false })).toBe(false);
    expect(showHomeScreenStart({ ...f, dismissed: true })).toBe(false);
    // Never over the restore page it points to, or a check page.
    expect(showHomeScreenStart({ ...f, pathname: '/restore' })).toBe(false);
    expect(showHomeScreenStart({ ...f, pathname: '/verify/VEIL-1' })).toBe(false);
  });
});
