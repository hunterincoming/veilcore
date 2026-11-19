// The iPhone Home Screen start screen (home-screen.ts).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { HOME_SCREEN_DISMISSED, isIosHomeScreenApp, keepsAnything, showHomeScreenStart } from './home-screen';

const store = (keys: string[]) => ({ length: keys.length, key: (i: number) => keys[i] ?? null });

describe('the iPhone Home Screen start screen', () => {
  it('only for an iOS Home Screen app with nothing stored, on the pages it opens on', () => {
    expect(isIosHomeScreenApp({ standalone: true })).toBe(true);
    expect(isIosHomeScreenApp({})).toBe(false);
    expect(isIosHomeScreenApp(undefined)).toBe(false);
    const f = { standalone: true, hasRecords: false, pathname: '/records', dismissed: false };
    expect(showHomeScreenStart(f)).toBe(true);
    expect(showHomeScreenStart({ ...f, hasRecords: true })).toBe(false);
    expect(showHomeScreenStart({ ...f, standalone: false })).toBe(false);
    expect(showHomeScreenStart({ ...f, dismissed: true })).toBe(false);
    // Never over the restore page it points to, or a check page.
    expect(showHomeScreenStart({ ...f, pathname: '/restore' })).toBe(false);
    expect(showHomeScreenStart({ ...f, pathname: '/verify/VEIL-1' })).toBe(false);
  });

  it('anything of the person’s kept here counts, not only records; display choices don’t', () => {
    expect(keepsAnything(store([]))).toBe(false);
    expect(keepsAnything(store(['veilcore.lang', 'veilcore.role.v1', HOME_SCREEN_DISMISSED, 'other.app']))).toBe(false);
    // A lab's signing key, licences held, and a kind of data added later.
    expect(keepsAnything(store(['veilcore.attester.v1']))).toBe(true);
    expect(keepsAnything(store(['veilcore.held-licenses.v1']))).toBe(true);
    expect(keepsAnything(store(['veilcore.something-new.v9']))).toBe(true);
    // Storage that can't be read is never called empty.
    expect(
      keepsAnything({
        length: 1,
        key: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe(true);
  });
});
