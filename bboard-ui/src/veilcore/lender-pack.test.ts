// The lender pack (lender-pack.ts): built from deal records this app signs, summed by the
// published checker, with the limits said plainly.
import { describe, expect, it } from 'vitest';
import { strFromU8 } from 'fflate';
import * as deal from './deal';
import { dealRecordOf, type DealEntry } from './deal-client';
import { dealsOf, lenderPackFiles } from './lender-pack';
import type { OnChainLicense } from './licenses';

const H = (c: string) => c.repeat(64);
const at = (d: string) => Date.parse(`${d}T12:00:00Z`);

/** A deal record made the way the app makes one: sealed, opened, kept, then written out. */
const recordFor = async (amountPaid: string, amountReceived: string) => {
  const iss = 'a1'.repeat(32);
  const lic = 'b2'.repeat(32);
  const I = { secret: iss, public: deal.publicOf(iss) };
  const L = { secret: lic, public: deal.publicOf(lic) };
  const kI = await deal.dealKeys(I.secret, L.public, H('c'), H('d'));
  const kL = await deal.dealKeys(L.secret, I.public, H('c'), H('d'));
  const entries: DealEntry[] = [];
  let seq = 0;
  const send = async (m: deal.DealMessage) => {
    const mine = m.from === 'issuer';
    const sealed = await deal.sealMessage(m, mine ? I.secret : L.secret, mine ? kI : kL);
    const o = (await deal.openMessage(sealed, kI, 'issuer'))!;
    entries.push({
      ...o.message,
      seq: ++seq,
      fingerprint: 'f'.repeat(64),
      receivedAt: m.at,
      signature: o.signature,
      mine: o.mine,
    });
    return o.signature;
  };
  const s = await send({
    type: 'statement',
    statementId: 'S-1',
    periodFrom: '2026-07-01',
    periodTo: '2026-07-31',
    basis: 'sales',
    quantity: '2',
    currency: 'USD',
    amountOwed: '120.50',
    from: 'licensee',
    at: at('2026-08-01'),
  });
  await send({
    type: 'reply',
    statementId: 'S-1',
    statementSig: s,
    decision: 'accepted',
    from: 'issuer',
    at: at('2026-08-02'),
  });
  await send({
    type: 'paid',
    statementId: 'S-1',
    statementSig: s,
    amount: amountPaid,
    currency: 'USD',
    method: 'bank transfer',
    payTo: 'x',
    reference: 'R-1',
    paidOn: '2026-08-03',
    from: 'licensee',
    at: at('2026-08-03'),
  });
  await send({
    type: 'received',
    statementId: 'S-1',
    statementSig: s,
    amount: amountReceived,
    currency: 'USD',
    from: 'issuer',
    at: at('2026-08-04'),
  });
  const party = {
    side: 'issuer' as const,
    mySecret: I.secret,
    theirPublic: L.public,
    commitment: H('c'),
    issuerRecord: H('d'),
  };
  return dealRecordOf(party, I.public, entries) as Record<string, unknown>;
};

describe('lender pack', () => {
  it('holds each deal record, a summary from the published checker, and a README with the limits', async () => {
    const files = await lenderPackFiles(
      { recordId: 'VEIL-1', agreementFingerprint: H('e') },
      [
        { label: 'First Grower', record: await recordFor('120.50', '120.5') },
        { label: 'Second Grower', record: await recordFor('120.50', '100') },
      ],
      new Date('2026-10-23T12:00:00Z'),
    );
    expect(Object.keys(files).sort()).toEqual([
      'README.txt',
      'deal-records/1-First-Grower.json',
      'deal-records/2-Second-Grower.json',
      'summary.txt',
    ]);
    const summary = strFromU8(files['summary.txt']);
    expect(summary).toMatch(/== First Grower[\s\S]*Messages: 4 of 4 signed[\s\S]*Settled \(both signed\): 120\.5 USD/);
    // Paid one amount, confirmed another: not counted, and said so.
    expect(summary).toMatch(/== Second Grower[\s\S]*not counted[\s\S]*Settled \(both signed\): none/);
    const readme = strFromU8(files['README.txt']);
    expect(readme).toMatch(/Who holds the licensee key/);
    expect(readme).toMatch(/npx veilcore-records deal/);
    expect(readme).toMatch(/not a legal filing/);
    expect(readme).not.toMatch(/—/); // no em dashes
  });

  it('a record altered after the fact shows as not counting', async () => {
    const r = await recordFor('120.50', '120.5');
    const msgs = r.messages as { message: Record<string, unknown> }[];
    msgs[0].message.amountOwed = '999.00';
    const files = await lenderPackFiles({ recordId: 'VEIL-1', agreementFingerprint: H('e') }, [
      { label: 'X', record: r },
    ]);
    expect(strFromU8(files['summary.txt'])).toMatch(
      /Does not count: message 0 \(statement\): signature does not verify/,
    );
  });

  it('lists earlier holders first, and only deals whose terms were sent', () => {
    const base = { acceptToken: 'a', issuerToken: 't', identity: H('1'), invitedAt: 1, issuerRecord: H('2') };
    const d = (label: string, sent = true) => ({
      ...base,
      inviteId: `LI-${label}`,
      label,
      partySecret: H('3'),
      licenseeNonce: H('4'),
      commitment: H('5'),
      ...(sent ? { termsSentAt: 1 } : {}),
    });
    const oc: OnChainLicense = { ...d('Third'), previous: [d('First'), d('Second', false)] };
    expect(dealsOf(oc, true).map((x) => x.label)).toEqual(['First', 'Third']);
    // By default only today's holder: earlier holders' payments are theirs too.
    expect(dealsOf(oc).map((x) => x.label)).toEqual(['Third']);
  });
});
