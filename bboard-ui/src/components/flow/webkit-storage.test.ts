// The 7-day warning on the backup screen is for Safari and iOS only (live walk, 18 Nov).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { clearsAfterSevenDays } from './webkit-storage';

const UA = {
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  edgeWin:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  firefoxMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
};

describe('the backup screen’s 7-day warning', () => {
  it('shows on Safari and on every iPhone or iPad browser', () => {
    expect(clearsAfterSevenDays(UA.safariMac)).toBe(true);
    expect(clearsAfterSevenDays(UA.iphoneSafari)).toBe(true);
    expect(clearsAfterSevenDays(UA.iphoneChrome)).toBe(true);
    // iPadOS reports a Mac; its touch screen gives it away.
    expect(clearsAfterSevenDays(UA.safariMac, 5)).toBe(true);
  });
  it('does not show in Chrome, Edge, Firefox or on Android', () => {
    for (const ua of [UA.chromeMac, UA.chromeAndroid, UA.edgeWin, UA.firefoxMac])
      expect(clearsAfterSevenDays(ua)).toBe(false);
  });
});
