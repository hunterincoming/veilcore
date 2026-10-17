// The key date stamp, tried again by itself (key-stamp.ts, stamp-background.ts), and the
// proving worker's Trusted Types policy (prover.ts): the cause of every "The date stamp didn't
// go through" on the test site until 17 Oct 2026.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKGROUND_RETRY_MS,
  QUICK_RETRY_MS,
  clearStampRetry,
  noteStampFailure,
  retryStampNow,
  stampRetries,
  stampVerdict,
} from './key-stamp';
import { dueStamps, holdStamp } from './stamp-background';
import { PROVER_POLICY, proverScriptUrl } from './prover';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

describe('what happens after a failed key date stamp', () => {
  it('one that may have gone out is never sent again by itself', () => {
    expect(stampVerdict('Lost contact with the network. The transaction WAS sent (abc); check it…', 1).kind).toBe(
      'sent',
    );
    expect(
      stampVerdict('The transaction may or may not have been sent. Check the network before trying again.', 1).kind,
    ).toBe('sent');
  });

  it('one this site can never make is not tried again by itself', () => {
    for (const e of [
      'The contract on the network is not the one this site was built for. Nothing was sent.',
      'This site’s proving files are not the ones the contract on the network uses. Nothing was sent.',
      'This plant’s key isn’t in this browser. Get it back from your backup file: a new key wouldn’t match the sealed record.',
    ])
      expect(stampVerdict(e, 1).kind, e).toBe('cannot');
  });

  it('anything else is tried again, sooner then later, and never before the fee service said', () => {
    const net = 'Could not reach the Midnight network or the sponsor. Nothing was sent. Try again in a few minutes.';
    expect(stampVerdict(net, 1)).toEqual({ kind: 'retry', afterMs: QUICK_RETRY_MS[0] });
    expect(stampVerdict(net, 3)).toEqual({ kind: 'retry', afterMs: QUICK_RETRY_MS[2] });
    // The prover refused by the browser (the 17 Oct cause): a fixed site makes it work again.
    expect(stampVerdict("The prover could not start in this browser: Failed to construct 'Worker'", 1).kind).toBe(
      'retry',
    );
    // The fee service's own waits.
    expect(stampVerdict('busy (try again in about 2 min)', 1)).toEqual({ kind: 'retry', afterMs: 120_000 });
    expect(
      stampVerdict('x', 1, 600).kind === 'retry' && (stampVerdict('x', 1, 600) as { afterMs: number }).afterMs,
    ).toBe(600_000);
    expect(
      (stampVerdict('Your network has used this hour’s free transactions. Try later.', 1) as { afterMs: number })
        .afterMs,
    ).toBe(3_600_000);
    expect(
      (stampVerdict('This browser has used today’s free anchor calls. Try tomorrow.', 1) as { afterMs: number })
        .afterMs,
    ).toBe(6 * 3_600_000);
  });

  it('remembers each failure: quick tries on the screen, then the background’s longer schedule, then waits for the person', () => {
    const t0 = 1_000_000;
    const e = 'Failed to fetch';
    let entry = noteStampFailure('VEIL-A', e, { now: t0 });
    expect(entry).toMatchObject({ tries: 1, nextAt: t0 + QUICK_RETRY_MS[0], lastError: e });
    for (let i = 2; i <= QUICK_RETRY_MS.length; i++) entry = noteStampFailure('VEIL-A', e, { now: t0 });
    expect(entry.nextAt).toBe(t0 + QUICK_RETRY_MS[QUICK_RETRY_MS.length - 1]);
    entry = noteStampFailure('VEIL-A', e, { now: t0 });
    expect(entry.nextAt).toBe(t0 + BACKGROUND_RETRY_MS[0]);
    // A background try goes on the background schedule straight away.
    expect(noteStampFailure('VEIL-B', e, { now: t0, background: true }).nextAt).toBe(t0 + BACKGROUND_RETRY_MS[0]);
    for (let i = 0; i < 20; i++) entry = noteStampFailure('VEIL-A', e, { now: t0 });
    expect(entry.nextAt).toBeUndefined();
    // "Try now" makes it due at once and lifts a stop; a stamp that lands clears it.
    retryStampNow('VEIL-A', t0 + 5);
    expect(stampRetries()['VEIL-A'].nextAt).toBe(t0 + 5);
    clearStampRetry('VEIL-A');
    expect(stampRetries()['VEIL-A']).toBeUndefined();
    expect(noteStampFailure('VEIL-C', 'The transaction WAS sent (x)', { now: t0 })).toMatchObject({ stopped: 'sent' });
  });

  it('the background tries only due, unstopped stamps of records whose keys are here, and never one a screen holds', () => {
    const now = 5_000_000;
    const all = {
      due: { tries: 4, nextAt: now - 1, lastError: 'x', lastAt: 0 },
      later: { tries: 4, nextAt: now + 60_000, lastError: 'x', lastAt: 0 },
      sent: { tries: 1, lastError: 'x', lastAt: 0, stopped: 'sent' as const },
      stamped: { tries: 1, nextAt: now - 1, lastError: 'x', lastAt: 0 },
      held: { tries: 1, nextAt: now - 2, lastError: 'x', lastAt: 0 },
    };
    const keys = (id: string) => (id === 'stamped' ? 'stamped' : 'waiting');
    const release = holdStamp('held');
    expect(dueStamps(all, now, keys)).toEqual(['due']);
    release();
    expect(dueStamps(all, now, keys)).toEqual(['held', 'due']);
  });
});

describe('the proving worker under the site’s Trusted Types rule', () => {
  it('goes through the one policy the CSP names, which lets through only the bundled worker on this site', () => {
    const made: { name: string; rules: { createScriptURL: (u: string) => string } }[] = [];
    const tt = {
      createPolicy: (name: string, rules: { createScriptURL: (u: string) => string }) => {
        made.push({ name, rules });
        return { createScriptURL: (u: string) => ({ trusted: rules.createScriptURL(u) }) };
      },
    };
    const base = 'https://test.veilcore.org/new';
    const url = proverScriptUrl(base, tt) as { trusted: string };
    expect(made).toHaveLength(1);
    expect(made[0].name).toBe(PROVER_POLICY);
    expect(url.trusted.startsWith('https://test.veilcore.org/')).toBe(true);
    expect(url.trusted).toMatch(/prover\.worker/);
    // Anything else is refused by the policy.
    expect(() => made[0].rules.createScriptURL('https://evil.example/prover.worker.js')).toThrow(
      /Not the proving worker/,
    );
    expect(() => made[0].rules.createScriptURL('https://test.veilcore.org/assets/other.js')).toThrow();
    // Made once: a second call reuses it (a second createPolicy with one name throws in a browser).
    proverScriptUrl(base, tt);
    expect(made).toHaveLength(1);
  });

  it('is a plain address where the browser has no Trusted Types', () => {
    expect(proverScriptUrl('https://test.veilcore.org/', undefined)).toMatch(
      /^https:\/\/test\.veilcore\.org\/.*prover\.worker/,
    );
  });
});
