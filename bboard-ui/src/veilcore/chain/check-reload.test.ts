// A checker's tab reloaded or closed in the middle of checking a valid answer (first mainnet
// run, 26 Nov 2026): the challenge was marked used as soon as the answer checked out, before
// the result was saved, so the next look refused the same answer as "already answered once",
// for good. A challenge is now marked used only after the result is saved, and by that answer.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ledger, type Ledger } from '../../../../contract/src/managed/veilcore/contract/index.js';
import { identityOf, recoveryCommitmentOf } from './actions';
import { contractStateAfter } from './test-chain';

const local = new Map<string, string>();
const session = new Map<string, string>();
const storage = (m: Map<string, string>) => ({
  getItem: (k: string) => m.get(k) ?? null,
  setItem: (k: string, v: string) => void m.set(k, v),
  removeItem: (k: string) => void m.delete(k),
});
const RECORD = new Uint8Array(32).fill(1);
const RCV = recoveryCommitmentOf(new Uint8Array(32).fill(3));
const HASH = '44ddd2f262d019b146cc3e6ff98c0d3d8e1ca46be6e707dfaea82ca88f3d3f5e';
const ID = `PR-${'AB'.repeat(16)}`;
const hexToBytes = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));

const afterProof = (challenge: string): Ledger =>
  ledger(
    contractStateAfter([
      { secret: RECORD, circuit: 'anchor', args: [RCV] },
      { secret: RECORD, circuit: 'proveOwnership', args: [hexToBytes(challenge)] },
    ]).data,
  );

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  local.clear();
  session.clear();
  vi.stubGlobal('localStorage', storage(local));
  vi.stubGlobal('sessionStorage', storage(session));
  vi.stubGlobal('fetch', () =>
    Promise.resolve(new Response(JSON.stringify({ id: ID }), { headers: { 'content-type': 'application/json' } })),
  );
});

/** A fresh page load: the modules (and their memory) start again; storage stays. */
const load = async () => ({
  relay: await import('../prove-relay'),
  check: await import('./ownership-check'),
});

describe('a reload in the middle of checking a valid answer', () => {
  it('the same answer is accepted on the next load, not refused as used', async () => {
    const first = await load();
    const r = await first.relay.askToProve({ identity: identityOf(RECORD), anchorTx: 'bb'.repeat(32) });
    if ('error' in r) throw new Error(r.error);
    const after = afterProof(r.ask.challenge);
    const deps = { stateAfter: () => Promise.resolve(after), latest: () => Promise.resolve(after) };
    const answers = [{ txId: HASH, answeredAt: Date.now() }];

    // Load 1: the answer checks out, then the tab goes away while the anchor is still being read.
    await expect(
      first.relay.checkAnswers(r.ask, answers, {
        checkOwnership: (input) => first.check.checkOwnership(input, deps),
        checkAnchor: () => Promise.reject(new Error('the tab was closed')),
        markUsed: first.check.markUsed,
      }),
    ).rejects.toThrow('the tab was closed');
    expect(first.relay.myAsk(ID)?.confirmed).toBeUndefined();

    // Load 2: the same answer, the same saved request.
    vi.resetModules();
    const second = await load();
    const saved = second.relay.myAsk(ID)!;
    const next = await second.relay.checkAnswers(saved, answers, {
      checkOwnership: (input) => second.check.checkOwnership(input, deps),
      checkAnchor: () => Promise.resolve(true),
      markUsed: second.check.markUsed,
    });
    expect(next.refused).toBeUndefined();
    expect(next.confirmed).toMatchObject({ txId: HASH, anchor: true });
    expect(second.relay.myAsk(ID)?.confirmed?.txId).toBe(HASH);

    // Saved, and only now used: by this answer. Another answer to the same challenge is refused.
    const other = await second.check.checkOwnership(
      { txId: 'cd'.repeat(32), identity: identityOf(RECORD), challenge: saved.challenge },
      deps,
    );
    expect(other.reason).toMatch(/already answered/);
    const same = await second.check.checkOwnership(
      { txId: HASH, identity: identityOf(RECORD), challenge: saved.challenge },
      deps,
    );
    expect(same.accepted).toBe(true);
  });

  it('marks the challenge used only after the confirmation is saved', async () => {
    const { relay, check } = await load();
    const r = await relay.askToProve({ identity: identityOf(RECORD) });
    if ('error' in r) throw new Error(r.error);
    const order: string[] = [];
    const setItem = localStorage.setItem.bind(localStorage);
    vi.stubGlobal('localStorage', {
      ...storage(local),
      setItem: (k: string, v: string) => {
        if (k === 'veilcore.prove-asks.v1' && v.includes('"confirmed"')) order.push('saved');
        setItem(k, v);
      },
    });
    await relay.checkAnswers(r.ask, [{ txId: HASH, answeredAt: Date.now() }], {
      checkOwnership: () => Promise.resolve({ accepted: true, reason: '' }),
      checkAnchor: () => Promise.resolve(true),
      markUsed: (c, tx) => {
        order.push('used');
        check.markUsed(c, tx);
      },
    });
    expect(order).toEqual(['saved', 'used']);
  });
});
