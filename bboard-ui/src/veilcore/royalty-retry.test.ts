// A royalty message is signed once and sent at most once (deal-client.ts sayOnce), and two
// copies of the same report count once (royalty-ledger.ts): a lost answer, a double tap or a
// second tab never doubles what is owed.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as deal from './deal';
import { LANDED_MS, __resetOutboxForTests, readAll, sayOnce, type DealEntry, type DealParty } from './deal-client';
import { balanceOwed, ledgerOf, stateOf } from './royalty-ledger';

const H = (c: string) => c.repeat(64);
const at = (d: string) => Date.parse(`${d}T12:00:00Z`);

/**
 * The registry's deal channel (registry lineage/deals.mjs), in memory: it keeps what it is sent
 * and can lose its answer after keeping it, or lose the request before it arrives.
 */
const fakeRegistry = () => {
  const deals = new Map<string, { seq: number; iv: string; ct: string; receivedAt: number }[]>();
  let seq = 0;
  const posts: string[] = [];
  const lose: ('answer' | 'request')[] = [];
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
  const answerTo = (url: string, init?: { body?: string }): Response => {
    const path = new URL(url, 'http://x').pathname;
    const body = JSON.parse(init?.body ?? '{}') as Record<string, unknown>;
    let m: RegExpMatchArray | null;
    if (path === '/deals') {
      if (!deals.has(body.dealId as string)) deals.set(body.dealId as string, []);
      return json(200, { ok: true });
    }
    if ((m = /^\/deals\/([0-9a-f]+)\/messages$/.exec(path))) {
      const next = lose.shift();
      if (next === 'request') throw new TypeError('Failed to fetch');
      posts.push(body.ct as string);
      const list = deals.get(m[1]) ?? [];
      deals.set(m[1], list);
      list.push({ seq: ++seq, iv: body.iv as string, ct: body.ct as string, receivedAt: Date.now() });
      if (next === 'answer') throw new TypeError('Failed to fetch');
      return json(200, { seq, fingerprint: 'f'.repeat(64) });
    }
    if ((m = /^\/deals\/([0-9a-f]+)\/read$/.exec(path))) {
      const list = deals.get(m[1]);
      if (!list) return json(404, { error: 'no such deal' });
      return json(200, { messages: list.filter((x) => x.seq > (body.after as number)) });
    }
    return json(404, { error: 'not here' });
  };
  const fetch = vi.fn((url: string, init?: { body?: string }) => Promise.resolve().then(() => answerTo(url, init)));
  return { fetch, deals, posts, lose };
};

const ISS = 'a1'.repeat(32);
const LIC = 'b2'.repeat(32);
const licensee: DealParty = {
  side: 'licensee',
  mySecret: LIC,
  theirPublic: deal.publicOf(ISS),
  commitment: H('c'),
  issuerRecord: H('d'),
};
const issuer: DealParty = {
  side: 'issuer',
  mySecret: ISS,
  theirPublic: deal.publicOf(LIC),
  commitment: H('c'),
  issuerRecord: H('d'),
};

/** The report as the page's form makes it: a new id on every tap. */
const report = (amountOwed = '25.00', periodFrom = '2026-01-01', periodTo = '2026-01-31'): deal.DealBody => ({
  type: 'statement',
  statementId: crypto.randomUUID(),
  periodFrom,
  periodTo,
  basis: 'units',
  quantity: '10',
  currency: 'USD',
  amountOwed,
  lines: [{ kind: 'royalty', quantity: '10', rate: '2.50', amount: amountOwed }],
});

let reg: ReturnType<typeof fakeRegistry>;
const local = new Map<string, string>();

beforeEach(async () => {
  local.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  reg = fakeRegistry();
  vi.stubGlobal('fetch', reg.fetch);
  __resetOutboxForTests();
  // The issuer opens the channel (it sends the terms first).
  await readAll(issuer);
});
afterEach(() => vi.unstubAllGlobals());

const reports = async (p: DealParty) => ledgerOf(await readAll(p)).reports;

describe('a report sent again after a lost answer', () => {
  it('the registry kept it and the answer was lost: trying again sends nothing new', async () => {
    reg.lose.push('answer');
    await expect(sayOnce(licensee, report())).rejects.toThrow(/Could not reach/);
    expect(reg.posts).toHaveLength(1);
    // "Try again": the form makes the report again, with a new id.
    const again = await sayOnce(licensee, report());
    expect(again.already).toBe(true);
    expect(reg.posts).toHaveLength(1);
    expect(await reports(issuer)).toHaveLength(1);
  });

  it('it never arrived: trying again sends the very message signed the first time', async () => {
    reg.lose.push('request');
    await expect(sayOnce(licensee, report())).rejects.toThrow();
    expect(reg.posts).toHaveLength(0);
    const kept = JSON.parse(local.get('veilcore.deal-outbox.v1')!) as Record<string, { ct: string; signature: string }>;
    const [first] = Object.values(kept);
    const again = await sayOnce(licensee, report());
    expect(again).toEqual({ signature: first.signature, already: false });
    expect(reg.posts).toEqual([first.ct]);
    const [r] = await reports(issuer);
    expect(r.statement.signature).toBe(first.signature);
    // Nothing kept in clear: the amount is only inside the ciphertext.
    expect(local.get('veilcore.deal-outbox.v1')).not.toContain('25.00');
  });

  it('an answer, a payment and a confirmation sent again count once too', async () => {
    await sayOnce(licensee, report());
    const [r] = await reports(issuer);
    const accept: deal.DealBody = {
      type: 'reply',
      statementId: r.statement.statementId,
      statementSig: r.statement.signature,
      decision: 'accepted',
    };
    reg.lose.push('answer');
    await expect(sayOnce(issuer, accept)).rejects.toThrow();
    expect((await sayOnce(issuer, accept)).already).toBe(true);
    const paid: deal.DealBody = {
      type: 'paid',
      statementId: r.statement.statementId,
      statementSig: r.statement.signature,
      amount: '25.00',
      currency: 'USD',
      method: 'bank',
      payTo: '',
      reference: 'HR-7Q4K',
      paidOn: '2026-02-10',
    };
    reg.lose.push('request');
    await expect(sayOnce(licensee, paid)).rejects.toThrow();
    await sayOnce(licensee, paid);
    const entries = await readAll(issuer);
    expect(entries.map((e) => e.type)).toEqual(['statement', 'reply', 'paid']);
    expect(stateOf(ledgerOf(entries).reports[0])).toBe('paid');
  });
});

describe('a double tap and two tabs', () => {
  it('two taps at once send one report', async () => {
    const [a, b] = await Promise.all([sayOnce(licensee, report()), sayOnce(licensee, report())]);
    expect([a.already, b.already].sort()).toEqual([false, true]);
    expect(a.signature).toBe(b.signature);
    expect(reg.posts).toHaveLength(1);
  });

  it('two tabs sharing the browser (Web Locks): one report', async () => {
    const tails = new Map<string, Promise<unknown>>();
    const request = <T>(name: string, _o: unknown, fn: () => Promise<T>): Promise<T> => {
      const run = (tails.get(name) ?? Promise.resolve()).then(fn, fn);
      tails.set(
        name,
        run.catch(() => undefined),
      );
      return run;
    };
    vi.stubGlobal('navigator', { locks: { request } });
    const tab = () => sayOnce(licensee, report());
    await Promise.all([tab(), tab(), tab()]);
    expect(reg.posts).toHaveLength(1);
    expect(await reports(issuer)).toHaveLength(1);
  });

  it('a tab that kept nothing (another browser profile, cleared storage) still finds the report there', async () => {
    let now = at('2026-02-02');
    await sayOnce(licensee, report(), () => now);
    // Later, with nothing kept: the report is read from the deal before a new one is signed.
    local.clear();
    __resetOutboxForTests();
    now += LANDED_MS * 2;
    const second = await sayOnce(licensee, report(), () => now);
    expect(second.already).toBe(true);
    expect(reg.posts).toHaveLength(1);
  });

  it('different reports are all sent: another period, or another amount', async () => {
    await sayOnce(licensee, report());
    await sayOnce(licensee, report('25.00', '2026-02-01', '2026-02-28'));
    await sayOnce(licensee, report('30.00'));
    expect(reg.posts).toHaveLength(3);
    expect(await reports(issuer)).toHaveLength(3);
  });
});

describe('the ledger: the same report twice is one report', () => {
  const build = async (bodies: deal.DealMessage[]): Promise<DealEntry[]> => {
    const kI = await deal.dealKeys(ISS, deal.publicOf(LIC), H('c'), H('d'));
    const out: DealEntry[] = [];
    for (const m of bodies) {
      const sig = deal.signMessage(m, m.from === 'issuer' ? ISS : LIC);
      const o = await deal.openMessage(
        await deal.sealMessage(
          m,
          m.from === 'issuer' ? ISS : LIC,
          m.from === 'issuer' ? kI : await deal.dealKeys(LIC, deal.publicOf(ISS), H('c'), H('d')),
        ),
        kI,
        'issuer',
      );
      expect(o?.signature).toBe(sig);
      out.push({
        ...m,
        seq: out.length + 1,
        fingerprint: 'f'.repeat(64),
        receivedAt: m.at,
        signature: sig,
        mine: o!.mine,
      });
    }
    return out;
  };
  const st = (id: string, day: string, owed = '25.00'): deal.DealMessage =>
    ({ ...report(owed), statementId: id, from: 'licensee', at: at(day) }) as deal.DealMessage;

  it('signed twice (another id, another time): counted once, and an answer to either counts for it', async () => {
    const a = st('S-1', '2026-02-01');
    const b = st('S-2', '2026-02-01');
    const [ea, eb] = await build([a, b]);
    const entries = await build([
      a,
      b,
      {
        type: 'reply',
        statementId: 'S-2',
        statementSig: eb.signature,
        decision: 'accepted',
        from: 'issuer',
        at: at('2026-02-03'),
      },
    ]);
    const l = ledgerOf(entries);
    expect(l.reports).toHaveLength(1);
    expect(l.reports[0].statement.signature).toBe(ea.signature);
    expect(stateOf(l.reports[0])).toBe('to-pay');
    expect(balanceOwed(l, 'USD')).toBe('25.00');
  });

  it('the first answer stands across the copies', async () => {
    const a = st('S-1', '2026-02-01');
    const b = st('S-2', '2026-02-01');
    const [ea, eb] = await build([a, b]);
    const entries = await build([
      a,
      b,
      {
        type: 'reply',
        statementId: 'S-1',
        statementSig: ea.signature,
        decision: 'disputed',
        note: 'wrong',
        from: 'issuer',
        at: at('2026-02-03'),
      },
      {
        type: 'reply',
        statementId: 'S-2',
        statementSig: eb.signature,
        decision: 'accepted',
        from: 'issuer',
        at: at('2026-02-04'),
      },
    ]);
    const l = ledgerOf(entries);
    expect(l.reports).toHaveLength(1);
    expect(stateOf(l.reports[0])).toBe('fix');
    expect(balanceOwed(l, 'USD')).toBe('0.00');
  });

  it('two reports for one period that differ stay two', async () => {
    const entries = await build([st('S-1', '2026-02-01'), st('S-2', '2026-02-01', '30.00')]);
    expect(ledgerOf(entries).reports).toHaveLength(2);
  });
});
