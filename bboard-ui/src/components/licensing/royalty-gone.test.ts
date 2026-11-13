// The licensee's page once the license is gone (LicenseeAfterRevoke): a line about the revoked report
// that is not "revoked" stays in the list, with Dispute (round-6 review, P6-8).
import { describe, expect, it } from 'vitest';
import { noticeRef, type RegistryView } from '../../veilcore/license-notices';
import { ledgerOf } from '../../veilcore/royalty-ledger';
import type { DealEntry } from '../../veilcore/deal-client';
import { revokedLineExcept } from './RoyaltyPay';

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
});
