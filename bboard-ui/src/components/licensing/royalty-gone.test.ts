// The licensee's page once the license is gone (LicenseeAfterRevoke): a line about the revoked report
// that is not "revoked" stays in the list, with Dispute (round-6 review, P6-8).
import { describe, expect, it } from 'vitest';
import { noticeRef, type RegistryView } from '../../veilcore/license-notices';
import { ledgerOf } from '../../veilcore/royalty-ledger';
import type { DealEntry } from '../../veilcore/deal-client';
import { answerKey, revokedBoxSays, revokedLineExcept } from './RoyaltyPay';

describe('M1 gone path', () => {
  const at = (day: string) => Date.parse(`${day}T12:00:00Z`);
  let n = 0;
  const msg = (seq: number, m: Record<string, unknown>, receivedAt = at('2026-01-01') + seq): DealEntry =>
    ({
      seq,
      fingerprint: `f${seq}`.padEnd(64, '0'),
      receivedAt,
      mine: false,
      signature: `${(++n).toString(16)}`.padStart(128, 'c'),
      ...m,
    }) as unknown as DealEntry;
  const statement = msg(1, {
    type: 'statement',
    statementId: 'S-1',
    periodFrom: '2026-01-01',
    periodTo: '2026-03-31',
    basis: 'units',
    quantity: '400',
    currency: 'USD',
    amountOwed: '1000.00',
    from: 'licensee',
    at: at('2026-04-02'),
  });
  const sig = statement.signature;
  const reply = msg(2, {
    type: 'reply',
    statementSig: sig,
    decision: 'accepted',
    from: 'issuer',
    at: at('2026-04-03'),
  });
  const notice = (seq: number, over: Record<string, unknown>) =>
    msg(
      seq,
      {
        type: 'notice',
        kind: 'breach',
        about: 'payment',
        periodFrom: '2026-01-01',
        periodTo: '2026-03-31',
        statementSig: sig,
        asOf: '2026-05-20',
        note: 'x',
        from: 'issuer',
        at: at('2026-05-20'),
        ...over,
      },
      at((over.asOf as string | undefined) ?? '2026-05-20'),
    );
  const entries = [
    statement,
    reply,
    notice(3, {}),
    notice(5, { kind: 'revoked', asOf: '2026-05-25', note: 'Revoked.' }),
  ];
  const REF = noticeRef(statement.fingerprint);
  // The public page still carries "overdue since 2026-05-15, notice of breach 2026-05-20" on that report
  // (the registry refused "revoked", and the gone sync that takes it off never ran, or the licensor's
  // client is modified).
  const view: RegistryView = {
    lines: new Map([[REF, { ref: REF, kind: 'overdue', since: '2026-05-15', breachNoticeOn: '2026-05-20' } as never]]),
    answers: new Map(),
    now: at('2026-07-01'),
    read: Date.now(),
  };
  it('keeps an overdue or breach line about the revoked report in the list', () => {
    expect([...revokedLineExcept(view, ledgerOf(entries))]).toEqual([]);
  });

  it('leaves a "revoked" line to the revoked box', () => {
    const revokedView: RegistryView = {
      ...view,
      lines: new Map([
        [
          REF,
          { ref: REF, kind: 'revoked', since: '2026-05-15', breachNoticeOn: '2026-05-20', on: '2026-06-20' } as never,
        ],
      ]),
    };
    expect([...revokedLineExcept(revokedView, ledgerOf(entries))]).toEqual([REF]);
  });

  it('leaves nothing out with no revoked notice in the deal', () => {
    expect([...revokedLineExcept(view, ledgerOf(entries.slice(0, 3)))]).toEqual([]);
  });

  // The revoked box says the public page is silent only after a full read found no line
  // (round-7 review, R7-1).
  it('says nothing about the public page while the read is loading, failed or incomplete', () => {
    expect(revokedBoxSays(undefined, undefined, false)).toBeUndefined();
    expect(revokedBoxSays({ ...view, lines: new Map(), incomplete: true }, undefined, false)).toBeUndefined();
    expect(revokedBoxSays({ ...view, lines: new Map() }, undefined, true)).toBeUndefined();
  });

  it('leaves an overdue or breach line to the list, and says "none" only after a full read', () => {
    const line = view.lines.get(REF);
    expect(revokedBoxSays(view, line, false)).toBeUndefined();
    expect(revokedBoxSays({ ...view, lines: new Map() }, undefined, false)).toBe('none');
    expect(revokedBoxSays({ ...view, lines: new Map(), predates: true }, undefined, false)).toBe('predates');
  });

  it('says "revoked" for a revoked line, even if the read was incomplete', () => {
    const revoked = { ref: REF, kind: 'revoked', since: '2026-05-15', on: '2026-06-20' } as never;
    expect(revokedBoxSays(view, revoked, true)).toBe('revoked');
  });

  // An answer not shown as filed is said to be pending, or not fileable, only after a full read
  // (round-8 review).
  it('says nothing about filing an answer before a full read', () => {
    expect(answerKey(undefined, false)).toBe('app.rpay.l.answerSeen');
    expect(answerKey({ ...view, incomplete: true }, false)).toBe('app.rpay.l.answerSeen');
    expect(answerKey(view, true)).toBe('app.rpay.l.answerSeen');
    expect(answerKey(view, false)).toBe('app.rpay.l.answerPending');
    expect(answerKey({ ...view, predates: true }, false)).toBe('app.rpay.l.answerPredates');
  });
});
