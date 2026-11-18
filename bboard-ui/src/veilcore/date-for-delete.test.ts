// What the delete panel says about a record's date (proofs.ts dateForDelete): a failed or refused
// lookup is "couldn't check", never "not in a batch", and nothing is read from a cache.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';
import { dateForDelete } from './proofs';

const FP = 'ab'.repeat(32);

afterEach(() => vi.unstubAllGlobals());

describe('where a record’s date stands, for deleting it', () => {
  it('not batched yet only when the registry says so', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{"error":"not yet batched"}', { status: 404 })));
    expect(await dateForDelete(FP)).toBe('none');
  });

  it('a refused, failed or unreadable lookup is unknown', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{}', { status: 503 })));
    expect(await dateForDelete(FP)).toBe('unknown');
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{}', { status: 429 })));
    expect(await dateForDelete(FP)).toBe('unknown');
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    expect(await dateForDelete(FP)).toBe('unknown');
    // A proof that doesn't check out here is not evidence of anything.
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{"commitment":"nope"}', { status: 200 })));
    expect(await dateForDelete(FP)).toBe('unknown');
    expect(await dateForDelete(undefined)).toBe('unknown');
  });

  it('asks the registry each time, past any cache', async () => {
    const seen: RequestInit[] = [];
    vi.stubGlobal('fetch', (_u: string, init: RequestInit) => {
      seen.push(init);
      return Promise.resolve(new Response('{}', { status: 404 }));
    });
    await dateForDelete(FP);
    await dateForDelete(FP);
    expect(seen).toHaveLength(2);
    expect(seen.every((i) => i.cache === 'no-store')).toBe(true);
  });
});
