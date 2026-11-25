// in-app-browser.ts: the built-in browsers of the apps people share links in, read from real
// user agents, and the ordinary browsers that must never get the notice.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { inAppBrowserOf } from './in-app-browser';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const ANDROID_WV =
  'Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.163 Mobile Safari/537.36';

describe('inAppBrowserOf', () => {
  it.each([
    [
      'facebook',
      `${IOS} Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.1;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]`,
    ],
    ['facebook', `${ANDROID_WV} [FB_IAB/FB4A;FBAV/442.0.0.33.113;]`],
    ['messenger', `${IOS} Mobile/15E148 [FBAN/MessengerForiOS;FBAV/438.0.0.31.106;FBBV/553395442;FBDV/iPhone13,2]`],
    ['messenger', `${ANDROID_WV} [FB_IAB/Orca-Android;FBAV/437.0.0.13.106;]`],
    [
      'instagram',
      `${IOS} Mobile/15E148 Instagram 307.0.3.18.108 (iPhone14,5; iOS 17_1_1; en_US; en; scale=3.00; 1170x2532; 532277137)`,
    ],
    ['instagram', `${ANDROID_WV} Instagram 307.0.0.34.111 Android (33/13; 420dpi; 1080x2340; samsung; SM-S918B)`],
    ['line', `${IOS} Mobile/15E148 Safari Line/13.20.0`],
    ['line', `${ANDROID_WV} Line/13.19.1/IAB`],
    ['wechat', `${IOS} Mobile/15E148 MicroMessenger/8.0.43(0x18002b2c) NetType/WIFI Language/zh_CN`],
    ['wechat', `${ANDROID_WV} XWEB/1160027 MMWEBSDK/20231002 MicroMessenger/8.0.43.2480(0x28002B37) WeChat/arm64`],
    ['tiktok', `${IOS} Mobile/15E148 musical_ly_32.3.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en`],
    ['tiktok', `${ANDROID_WV} trill_2023203030 JsSdk/1.0 NetType/WIFI AppName/trill BytedanceWebview/d8a21c6`],
    ['x', `${ANDROID_WV} TwitterAndroid`],
  ])('reads %s', (app, ua) => {
    expect(inAppBrowserOf(ua)).toBe(app);
  });

  it.each([
    // Safari on an iPhone (the budget test's iPhone 14), Chrome and Firefox on an iPhone.
    `${IOS} Version/17.1 Mobile/15E148 Safari/604.1`,
    `${IOS} CriOS/119.0.6045.169 Mobile/15E148 Safari/604.1`,
    `${IOS} FxiOS/120.0 Mobile/15E148 Safari/605.1.15`,
    // Chrome, Samsung Internet and Edge on Android; desktop browsers.
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 EdgA/119.0.2151.78',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    // The link-preview fetchers of the same apps: they don't run the page, and aren't the apps.
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
    '',
  ])('leaves an ordinary browser alone: %s', (ua) => {
    expect(inAppBrowserOf(ua)).toBeNull();
  });

  it('reads nothing from a missing user agent', () => {
    expect(inAppBrowserOf(undefined)).toBeNull();
    expect(inAppBrowserOf(null)).toBeNull();
  });
});
