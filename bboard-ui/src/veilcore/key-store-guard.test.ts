// A record's keys can never be lost or replaced by another write (recheck 6: "Date this lab
// report" from two tabs left one record with no key), and one tab at a time does work that
// must happen once. Test data only.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetRecordKeysForTests,
  ensureKeys,
  forgetKeys,
  keysFor,
  markBackedUp,
  mergeForWrite,
  setAnchor,
  type RecordKeys,
} from './record-keys';
import { withLease, withTabLock } from './tab-lock';

const KEY = 'veilcore.record-keys.v1';
const local = new Map<string, string>();
/** A stale read: what another tab's cached copy would return once, before it caught up. */
let staleOnce: string | null | undefined;

beforeEach(() => {
  local.clear();
  staleOnce = undefined;
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => {
      if (k === KEY && staleOnce !== undefined) {
        const v = staleOnce;
        staleOnce = undefined;
        return v;
      }
      return local.get(k) ?? null;
    },
    setItem: (k: string, v: string) => void local.set(k, String(v)),
    removeItem: (k: string) => void local.delete(k),
  });
  __resetRecordKeysForTests();
});
afterEach(() => vi.unstubAllGlobals());

const k = (id: string, secret: string): RecordKeys => ({
  recordId: id,
  recordSecret: secret.repeat(32),
  recoverySecret: 'ee'.repeat(32),
  createdAt: 1,
});
const stored = () => JSON.parse(local.get(KEY) ?? '{}') as Record<string, RecordKeys>;

describe('the key store never drops or replaces another record’s keys', () => {
  it('a write from a stale copy keeps the key another tab saved in between', () => {
    const a = ensureKeys('VEIL-TAB-A');
    // Tab B read the set before tab A saved its key, and now saves its own on top of that.
    staleOnce = JSON.stringify({});
    const b = ensureKeys('VEIL-TAB-B');
    expect(Object.keys(stored()).sort()).toEqual(['VEIL-TAB-A', 'VEIL-TAB-B']);
    expect(stored()['VEIL-TAB-A'].recordSecret).toBe(a.recordSecret);
    expect(keysFor('VEIL-TAB-B')?.recordSecret).toBe(b.recordSecret);
  });

  it('a write can never give a record other secrets, or file keys under another record’s id', () => {
    const now = { A: k('A', 'aa') };
    expect(mergeForWrite(now, { A: k('A', 'bb') }).A.recordSecret).toBe('aa'.repeat(32));
    expect(mergeForWrite(now, { A: { ...k('A', 'aa'), recoverySecret: 'ff'.repeat(32) } }).A.recoverySecret).toBe(
      'ee'.repeat(32),
    );
    expect(mergeForWrite({}, { B: k('A', 'aa') })).toEqual({});
    expect(mergeForWrite(now, { B: k('A', 'cc') })).toEqual(now);
    // Same secrets: the write's version wins (an anchor, a backup mark).
    expect(mergeForWrite(now, { A: { ...k('A', 'aa'), backedUpAt: 5 } }).A.backedUpAt).toBe(5);
  });

  it('ensureKeys never replaces keys and hands back what is stored', () => {
    local.set(KEY, JSON.stringify({ 'VEIL-X': k('VEIL-X', 'aa') }));
    expect(ensureKeys('VEIL-X').recordSecret).toBe('aa'.repeat(32));
    expect(stored()['VEIL-X'].recordSecret).toBe('aa'.repeat(32));
  });

  it('forgetting one record’s keys forgets only that one, even from a stale copy', () => {
    ensureKeys('VEIL-KEEP');
    ensureKeys('VEIL-DROP');
    staleOnce = JSON.stringify({ 'VEIL-DROP': stored()['VEIL-DROP'] });
    forgetKeys('VEIL-DROP');
    expect(Object.keys(stored())).toEqual(['VEIL-KEEP']);
  });

  it('updates (anchor, backup mark) keep keys saved by another tab', () => {
    ensureKeys('VEIL-ONE');
    ensureKeys('VEIL-TWO');
    staleOnce = JSON.stringify({ 'VEIL-ONE': stored()['VEIL-ONE'] });
    setAnchor('VEIL-ONE', {
      identity: '01'.repeat(32),
      network: 'preprod',
      contractAddress: 'c0'.repeat(32),
      txId: 'aa'.repeat(32),
      txHash: 'bb'.repeat(32),
      blockHeight: 1,
    });
    staleOnce = JSON.stringify({});
    markBackedUp(['VEIL-ONE']);
    expect(Object.keys(stored()).sort()).toEqual(['VEIL-ONE', 'VEIL-TWO']);
    expect(stored()['VEIL-ONE'].anchor?.blockHeight).toBe(1);
  });
});

describe('one tab at a time', () => {
  it('the localStorage lease runs one piece of work after the other', async () => {
    const order: string[] = [];
    const job = (name: string) => async () => {
      order.push(`${name} start`);
      await new Promise((r) => setTimeout(r, 20));
      order.push(`${name} end`);
      return name;
    };
    const fast = { sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, Math.min(ms, 5))) };
    const results = await Promise.all([withLease('t', job('a'), fast), withLease('t', job('b'), fast)]);
    expect(results.sort()).toEqual(['a', 'b']);
    expect(order[1]).toMatch(/end$/);
    expect(order[2]).toMatch(/start$/);
    expect(local.has('veilcore.lock.t')).toBe(false);
  });

  it('a lease left by a tab that closed runs out', async () => {
    local.set('veilcore.lock.t', JSON.stringify({ owner: 'gone', until: 10 }));
    expect(await withLease('t', () => Promise.resolve('ran'), { now: () => 11, sleep: () => Promise.resolve() })).toBe(
      'ran',
    );
  });

  it('uses the browser’s own locks when it has them', async () => {
    const request = vi.fn((_n: string, _o: unknown, fn: () => Promise<string>) => fn());
    vi.stubGlobal('navigator', { locks: { request } });
    expect(await withTabLock('x', () => Promise.resolve('ok'))).toBe('ok');
    expect(request).toHaveBeenCalledWith('x', { mode: 'exclusive' }, expect.any(Function));
  });

  it('storage that can’t be written: the work still runs', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
    });
    expect(await withLease('t', () => Promise.resolve('ran'))).toBe('ran');
  });
});
