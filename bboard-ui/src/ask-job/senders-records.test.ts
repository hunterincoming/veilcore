// "Do it for me": the records step (senders.ts sendRecords) after a send with no answer: the
// server is asked first, and a record it holds is never sent again (verification V1/6). When the
// server can't be asked, nothing is sent; it tries again later.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
let pending = true;
let onRegistry: Map<string, string> | 'unknown' = new Map();
vi.mock('../veilcore/api-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../veilcore/api-store')>()),
  registryRecordCodes: () => {
    calls.push('ask');
    return Promise.resolve(onRegistry);
  },
}));
vi.mock('../veilcore/bulk-import', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../veilcore/bulk-import')>()),
  anyPending: () => pending,
  markLanded: () => {
    calls.push('mark');
    return Promise.resolve(1);
  },
  sealRows: () => {
    calls.push('send');
    return Promise.resolve({ outcomes: {} });
  },
}));

import { CANT_CHECK, sendRecords } from './senders';
import type { Job } from './store';

const job = { refs: { rowHashes: ['h1', 'h2'] } } as unknown as Job;

beforeEach(() => {
  calls.length = 0;
  pending = true;
  onRegistry = new Map();
});

describe('sending a job’s records again', () => {
  it('rows sent before: the server is asked first, then only what it lacks goes', async () => {
    expect((await sendRecords(job)).kind).toBe('done');
    expect(calls).toEqual(['ask', 'mark', 'send']);
  });

  it('the server can’t be asked: nothing is sent, and it tries again later', async () => {
    onRegistry = 'unknown';
    const out = await sendRecords(job);
    expect(out).toMatchObject({ kind: 'retry', why: CANT_CHECK });
    expect(calls).toEqual(['ask']);
  });

  it('never sent before: nothing to ask', async () => {
    pending = false;
    await sendRecords(job);
    expect(calls).toEqual(['send']);
  });
});
