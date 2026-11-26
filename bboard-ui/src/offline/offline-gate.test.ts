// When the offline download starts by itself, and when it waits to be asked (summit fix 5b.3,
// offline/register.ts). The same in a real browser: e2e/offline.spec.ts.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- stand-ins for the browser's fetch */

import { describe, expect, it } from 'vitest';
import { megabytes, offlineDownloadBytes, offlineHeldBack } from './register';

const fresh = { existing: false, installed: false, connection: undefined };

describe('the offline download starts by itself only where nobody pays for it unasked', () => {
  it('waits on the pages people are sent links to: check, verify and prove', () => {
    for (const path of [
      '/verify',
      '/verify/',
      '/verify/VEIL-ABC',
      '/verify/example',
      '/prove/VEIL-ABC',
      '/prove-license/L-1',
      '/check-document',
      '/check-claim',
      '/check-lab-result',
      '/check-this-site',
    ])
      expect(offlineHeldBack({ ...fresh, path }), path).toBe('link-page');
  });

  it('starts by itself on the app’s own pages with an ordinary connection', () => {
    for (const path of ['/', '/records', '/new', '/record/VEIL-ABC', '/settings', '/verifyx', '/provenance'])
      expect(offlineHeldBack({ ...fresh, path }), path).toBeNull();
    expect(
      offlineHeldBack({ ...fresh, path: '/records', connection: { saveData: false, effectiveType: '4g' } }),
    ).toBeNull();
    expect(offlineHeldBack({ ...fresh, path: '/records', connection: { effectiveType: '3g' } })).toBeNull();
  });

  it('waits when the browser asks to save data, on any page', () => {
    expect(offlineHeldBack({ ...fresh, path: '/records', connection: { saveData: true, effectiveType: '4g' } })).toBe(
      'save-data',
    );
  });

  it('waits on 2G and slow 2G', () => {
    expect(offlineHeldBack({ ...fresh, path: '/records', connection: { effectiveType: '2g' } })).toBe('slow-network');
    expect(offlineHeldBack({ ...fresh, path: '/', connection: { effectiveType: 'slow-2g' } })).toBe('slow-network');
  });

  it('never holds back a browser that already has it: its copy and its updates go on, everywhere', () => {
    for (const connection of [undefined, { saveData: true }, { effectiveType: 'slow-2g' }])
      for (const path of ['/verify/VEIL-ABC', '/prove/VEIL-ABC', '/records'])
        expect(offlineHeldBack({ existing: true, installed: false, connection, path })).toBeNull();
  });

  it('never holds back VeilCore opened from the Home Screen: installing is asking for it', () => {
    expect(
      offlineHeldBack({ existing: false, installed: true, connection: { saveData: true }, path: '/verify/VEIL-ABC' }),
    ).toBeNull();
  });
});

describe('the size it says before anyone starts it', () => {
  const answer = (body: unknown, ok = true) =>
    (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

  it('is the build’s own total from /offline-shell.json, in whole megabytes', async () => {
    expect(
      await offlineDownloadBytes(answer({ format: 'veilcore-offline-shell/v1', files: [], bytes: 11_234_567 })),
    ).toBe(11_234_567);
    expect(megabytes(11_234_567)).toBe('11 MB');
    expect(megabytes(10_600_000)).toBe('11 MB');
    expect(megabytes(12_000)).toBe('1 MB');
  });

  it('is left unsaid when the list has no size, can’t be read, or the request fails', async () => {
    expect(await offlineDownloadBytes(answer({ format: 'veilcore-offline-shell/v1', files: [] }))).toBeNull();
    expect(await offlineDownloadBytes(answer({ bytes: 'eleven' }))).toBeNull();
    expect(await offlineDownloadBytes(answer({ bytes: 5 }, false))).toBeNull();
    expect(
      await offlineDownloadBytes(async () => {
        throw new TypeError('no signal');
      }),
    ).toBeNull();
  });
});
