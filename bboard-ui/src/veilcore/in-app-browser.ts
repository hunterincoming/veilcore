// Is this page open inside another app's built-in browser (Facebook, Instagram, Messenger, Line,
// WeChat, TikTok, X)? There, storage belongs to that app's web view, not to Chrome or Safari: it
// can be cleared with the app's cache, and the app can watch the page. The site only says so
// (InAppBrowserNotice.tsx); it never blocks anything.
//
// The app names its web view in the user agent, and these are the tokens the widely used
// detectors look for (inapp-spy 5.0.10, src/regexAppName.ts; the same tokens Meta, LINE and
// WeChat document for their own web views):
//   Facebook   FBAN/, FBAV/, FB_IAB/, FBIOS…  (any "FB…/" token), or "Facebook"
//   Messenger  FBAN/MessengerForiOS, FB_IAB/MESSENGER  (the Facebook tokens again)
//   Instagram  "Instagram 300.0…"
//   Line       "Line/13.1.0"
//   WeChat     "MicroMessenger/8.0"
//   TikTok     "musical_ly_…", "BytedanceWebview", "trill_…" (TikTok's own app ids)
//   X          "Twitter" ("TwitterAndroid"). X on an iPhone opens links in Safari's own view,
//              which says nothing: it isn't caught, and it doesn't need to be.
// A user agent can say anything, so this is a hint for a notice and never a security check.
// SPDX-License-Identifier: Apache-2.0

export type InAppBrowser = 'facebook' | 'messenger' | 'instagram' | 'line' | 'wechat' | 'tiktok' | 'x';

/** In order: Messenger and Instagram before Facebook, whose tokens they carry too. */
const APPS: readonly (readonly [InAppBrowser, RegExp])[] = [
  // Messenger's Android app is "Orca" in its own tokens.
  ['messenger', /\bFB(?:AN|_IAB)\/(?:MessengerForiOS|MessengerLite|Orca-Android|MESSENGER)/],
  ['instagram', /\bInstagram\b/i],
  // Case-sensitive: Meta's tokens are upper case, and "fb" alone is too common to read anything into.
  ['facebook', /\bFB(?:AN|AV|_IAB|IOS)\/|\bFB4A\b|\bFacebook\b/],
  ['line', /\bLine\/\d/i],
  ['wechat', /\bMicroMessenger\//i],
  ['tiktok', /\bmusical_ly|\bBytedance|\btrill_\d|\bTikTok\b/i],
  ['x', /\bTwitter(?:Android)?\b/i],
];

/** Which app's built-in browser this user agent says it is, or null for anything else. */
export const inAppBrowserOf = (ua: string | undefined | null): InAppBrowser | null => {
  if (!ua) return null;
  for (const [app, re] of APPS) if (re.test(ua)) return app;
  return null;
};
