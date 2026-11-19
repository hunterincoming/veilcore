// The one line at the top of a check page (verdict.ts): never kinder than the checks under it.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { checkProblems, claimVerdict, recordVerdict } from './verdict';
import type { ClaimVerdict } from '../../veilcore/claim-link';
import type { ProofState } from '../../veilcore/proofs';
import type { AnchorState } from './anchor-words';

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
    // "none" is also a failed proof request: when the registry says the batch is dated, it can't
    // be "waiting" (review of PR #140). A document's page says it has no date for that document.
    expect(recordVerdict({ ...base, proof: { status: 'none' }, anchoredReported: true })).toMatchObject({
      tone: 'warn',
      key: 'app.verify.verdict.dateUnchecked',
    });
    expect(recordVerdict({ ...base, proof: { status: 'none' }, document: true }).key).toBe('app.doc.verdict.noDate');
    expect(recordVerdict({ ...base, proof: { status: 'pending' } as ProofState, anchoredReported: true }).key).toBe(
      'app.verify.verdict.notYet',
    );
  });
});

describe('the green line never stands over something that didn’t pass (review of PR #140)', () => {
  const none = {
    badSignatures: 0,
    noneVerified: false,
    nameState: 'none',
    savedReport: 'reported',
    withdrawnSignatures: false,
  };
  it('every failure source on the page counts', () => {
    expect(checkProblems(none)).toEqual({ failed: false, withdrawn: false });
    expect(checkProblems({ ...none, badSignatures: 1 }).failed).toBe(true);
    expect(checkProblems({ ...none, noneVerified: true }).failed).toBe(true);
    expect(checkProblems({ ...none, nameState: 'differs' }).failed).toBe(true);
    expect(checkProblems({ ...none, nameState: 'published', nameConflict: true }).failed).toBe(true);
    // The saved DNA report: its signature withdrawn or replaced, or a chosen file that differs.
    expect(checkProblems({ ...none, savedReport: 'failed' }).failed).toBe(true);
    expect(checkProblems({ ...none, withdrawnSignatures: true })).toEqual({ failed: false, withdrawn: true });
  });

  it('a withdrawn lab signature gets its own amber line', () => {
    expect(recordVerdict({ ...base, withdrawn: true })).toMatchObject({
      tone: 'warn',
      key: 'app.verify.verdict.datedWithdrawn',
    });
    expect(recordVerdict({ ...base, anchor: undefined, withdrawn: true }).key).toBe(
      'app.verify.verdict.reportedButFailed',
    );
  });

  it('a failure with only the server’s date says so', () => {
    expect(recordVerdict({ ...base, anchor: undefined, failed: true }).key).toBe(
      'app.verify.verdict.reportedButFailed',
    );
    expect(recordVerdict({ ...base, anchor: undefined, reportedAt: undefined, failed: true }).key).toBe(
      'app.verify.verdict.reportedNoDateButFailed',
    );
  });

  it('every failing or unchecked state, in every combination, is never "ok"', () => {
    const proofs: (ProofState | 'checking')[] = [
      'checking',
      { status: 'none' },
      { status: 'pending' } as ProofState,
      reported,
    ];
    const anchors: (AnchorState | undefined)[] = [
      undefined,
      'checking',
      checked,
      { status: 'failed', reason: 'x' },
      { status: 'unreachable', reason: 'x' },
      { status: 'not-checked' } as AnchorState,
    ];
    const sources = [
      { badSignatures: 1 },
      { noneVerified: true },
      { nameState: 'differs' },
      { nameState: 'published', nameConflict: true },
      { savedReport: 'failed' },
      { withdrawnSignatures: true },
    ];
    let seen = 0;
    for (const src of sources)
      for (const proof of proofs)
        for (const anchor of anchors)
          for (const sealed of [true, false])
            for (const bound of [true, false])
              for (const testNetwork of [true, false])
                for (const signaturesChecking of [true, false]) {
                  const p = checkProblems({ ...none, ...src });
                  const v = recordVerdict({
                    ...base,
                    ...p,
                    proof,
                    anchor,
                    sealed,
                    bound,
                    testNetwork,
                    signaturesChecking,
                  });
                  expect(v.tone).not.toBe('ok');
                  seen++;
                }
    expect(seen).toBe(6 * 4 * 6 * 2 * 2 * 2 * 2);
    // And the green line needs all of: bound, sealed, checked on Midnight, the main network, no problem.
    expect(recordVerdict({ ...base, bound: false }).tone).not.toBe('ok');
    expect(recordVerdict({ ...base, testNetwork: true }).tone).not.toBe('ok');
    expect(recordVerdict({ ...base, anchor: undefined }).tone).not.toBe('ok');
  });

  it('the claim page: never green over a withdrawn or disputed lab key, or another claim that failed', () => {
    const ok = { ok: true, blockTime: Date.UTC(2026, 9, 11) } as ClaimVerdict;
    const lab = (signer: object) => ({ ...ok, lab: { ok: true, attester: 'k', signer } }) as unknown as ClaimVerdict;
    const one = (verdict: ClaimVerdict | undefined, more: (ClaimVerdict | undefined)[] = []) =>
      claimVerdict({ readable: true, off: false, verdict, more });
    expect(one(ok)?.tone).toBe('ok');
    expect(one(lab({ kind: 'bound', attestation: {} }))?.tone).toBe('ok');
    expect(one(lab({ kind: 'retracted', attestation: {} }))).toMatchObject({
      tone: 'warn',
      key: 'app.claim.verdict.labWithdrawn',
    });
    expect(one(lab({ kind: 'conflict' }))).toMatchObject({ tone: 'warn', key: 'app.claim.verdict.labConflict' });
    expect(one({ ...ok, lab: { ok: false, reason: 'x' } } as ClaimVerdict)?.key).toBe('app.claim.verdict.labFailed');
    expect(one(ok, [{ ok: false, reason: 'x' }])?.key).toBe('app.claim.verdict.someFailed');
    expect(one(ok, [undefined])?.tone).toBe('wait');
    expect(one({ ok: false, reason: 'x' })?.tone).toBe('fail');
    expect(claimVerdict({ readable: false, off: false, verdict: undefined, more: [] })?.tone).toBe('fail');
  });
});
