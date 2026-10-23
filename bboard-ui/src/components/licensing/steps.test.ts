// The license's steps and the royalty side's one next thing (steps.ts).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { issuerSteps, licenseeSteps, nextRoyaltyStep, suggestedPeriod } from './steps';

const states = (s: { state: string }[]) => s.map((x) => x.state).join(' ');

describe('making a license, in steps', () => {
  it('the licensor sees which step is now', () => {
    const f = { linkMade: false, accepted: false, issued: false, live: false };
    expect(states(issuerSteps(f))).toBe('now later later later');
    expect(states(issuerSteps({ ...f, linkMade: true }))).toBe('done now later later');
    expect(states(issuerSteps({ ...f, linkMade: true, accepted: true }))).toBe('done done now later');
    expect(states(issuerSteps({ linkMade: true, accepted: true, issued: true, live: false }))).toBe(
      'done done done now',
    );
    expect(states(issuerSteps({ linkMade: true, accepted: true, issued: true, live: true }))).toBe(
      'done done done done',
    );
  });

  it('the licensee: the backup is done whenever it was saved, before or after the issue', () => {
    const f = { accepted: false, backedUp: false, issued: false, live: false };
    expect(states(licenseeSteps(f))).toBe('now later later later');
    // A backup made before accepting holds no license key: not done.
    expect(states(licenseeSteps({ ...f, backedUp: true }))).toBe('now later later later');
    expect(states(licenseeSteps({ ...f, accepted: true }))).toBe('done now later later');
    expect(states(licenseeSteps({ ...f, accepted: true, backedUp: true }))).toBe('done done now later');
    expect(states(licenseeSteps({ ...f, accepted: true, issued: true }))).toBe('done now done later');
    expect(states(licenseeSteps({ accepted: true, backedUp: true, issued: true, live: false }))).toBe(
      'done done done now',
    );
  });
});

const st = (from: string, to: string, owed = '500.00') => ({
  periodFrom: from,
  periodTo: to,
  amountOwed: owed,
  currency: 'USD',
});
const PAYOUT = { method: 'bank transfer', account: 'Practice Bank 0001', currency: 'USD' };

describe('royalties: the one next thing', () => {
  it('the licensor: payout first, then the oldest statement to check, then money to confirm', () => {
    expect(nextRoyaltyStep('issuer', [], undefined)).toEqual({
      text: 'Tell them how you want to be paid.',
      yours: true,
    });
    expect(nextRoyaltyStep('issuer', [], PAYOUT).yours).toBe(false);
    // Newest first, as ledgerOf gives them: the oldest unchecked one is asked about.
    const lines = [{ statement: st('2026-09-01', '2026-09-30') }, { statement: st('2026-08-01', '2026-08-31') }];
    expect(nextRoyaltyStep('issuer', lines, PAYOUT).text).toBe(
      'Check their statement for 2026-08-01 to 2026-08-31, then accept or dispute it.',
    );
    const paid = [
      {
        statement: st('2026-08-01', '2026-08-31'),
        reply: { decision: 'accepted' },
        paid: { amount: '500.00', currency: 'USD' },
      },
    ];
    expect(nextRoyaltyStep('issuer', paid, PAYOUT)).toEqual({
      text: 'They say they paid 500.00 USD for 2026-08-01 to 2026-08-31. Check it arrived, then confirm.',
      yours: true,
    });
    // An older payment to confirm comes before a newer statement to check.
    expect(nextRoyaltyStep('issuer', [{ statement: st('2026-09-01', '2026-09-30') }, ...paid], PAYOUT).text).toMatch(
      /^They say they paid 500.00 USD for 2026-08-01/,
    );
    expect(nextRoyaltyStep('issuer', [{ ...paid[0], received: {} }], PAYOUT).text).toBe(
      'Nothing to do. They file a statement for each period.',
    );
  });

  it('the licensee: pay what was accepted, fix what was disputed, else file', () => {
    expect(nextRoyaltyStep('licensee', [], undefined)).toEqual({
      text: 'File your statement when the period ends.',
      yours: true,
      file: true,
    });
    const accepted = [{ statement: st('2026-08-01', '2026-08-31'), reply: { decision: 'accepted' } }];
    expect(nextRoyaltyStep('licensee', accepted, PAYOUT)).toEqual({
      text: 'Pay 500.00 USD by bank transfer to Practice Bank 0001, then tap “I paid it”.',
      yours: true,
    });
    expect(nextRoyaltyStep('licensee', accepted, undefined).yours).toBe(false);
    const disputed = [
      { statement: st('2026-08-01', '2026-08-31'), reply: { decision: 'disputed', note: 'sales were higher' } },
    ];
    expect(nextRoyaltyStep('licensee', disputed, PAYOUT).text).toBe(
      'They disputed 2026-08-01 to 2026-08-31: “sales were higher”. File a corrected statement.',
    );
    // Once a corrected statement for those days is filed, the dispute is answered.
    const refiled = [{ statement: st('2026-08-01', '2026-08-31', '600.00') }, ...disputed];
    expect(nextRoyaltyStep('licensee', refiled, PAYOUT).text).toBe(
      'Waiting for them to check your statement for 2026-08-01 to 2026-08-31.',
    );
    expect(nextRoyaltyStep('issuer', refiled, PAYOUT).text).toBe(
      'Check their statement for 2026-08-01 to 2026-08-31, then accept or dispute it.',
    );
    expect(nextRoyaltyStep('licensee', [{ statement: st('2026-08-01', '2026-08-31') }], PAYOUT)).toEqual({
      text: 'Waiting for them to check your statement for 2026-08-01 to 2026-08-31.',
      yours: false,
    });
  });
});

describe('the period a new statement starts with', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  it('no statement yet: last month', () => {
    expect(suggestedPeriod([], now)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });
  it('after a statement: the day after it ended, through the end of last month', () => {
    expect(suggestedPeriod([{ statement: st('2026-07-01', '2026-07-31') }], now)).toEqual({
      from: '2026-08-01',
      to: '2026-09-30',
    });
  });
  it('a statement already covering last month: from the next day to today', () => {
    expect(suggestedPeriod([{ statement: st('2026-09-01', '2026-09-30') }], now)).toEqual({
      from: '2026-10-01',
      to: '2026-10-22',
    });
    expect(suggestedPeriod([{ statement: st('2026-10-01', '2026-10-22') }], now)).toEqual({
      from: '2026-10-23',
      to: '2026-10-23',
    });
  });
});
