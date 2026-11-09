// The resend lookup (api-store.ts registryRecordCodes): no holder key in this browser means it
// can't tell what the server holds, never "nothing" (verification W7). Nothing is asked.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import { registryRecordCodes } from './api-store';

describe('what the server holds, asked before a resend', () => {
  it('no holder key here: no-key (never "none"), and no request', async () => {
    const fetched: string[] = [];
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
    vi.stubGlobal('fetch', (url: string) => {
      fetched.push(url);
      return Promise.reject(new TypeError('offline'));
    });
    expect(await registryRecordCodes()).toBe('no-key');
    expect(fetched).toEqual([]);
  });
});
