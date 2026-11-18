// Whether this browser is Safari, or any browser on an iPhone or iPad (all of them are WebKit
// there): the ones that can clear a site's data after 7 days without a visit (WebKit's
// Intelligent Tracking Prevention). The backup screen says so only to them (live walk, 18 Nov:
// the warning showed in Chrome on a computer, where it isn't true).
// SPDX-License-Identifier: Apache-2.0

/** True for Safari on a Mac, and for every browser on iOS or iPadOS. */
export const clearsAfterSevenDays = (ua: string, maxTouchPoints = 0): boolean => {
  // iPadOS asks for the desktop site and says "Macintosh"; it is the one with a touch screen.
  const ios = /\b(iPhone|iPad|iPod)\b/.test(ua) || (/\bMacintosh\b/.test(ua) && maxTouchPoints > 1);
  if (ios) return true;
  // Safari on a Mac: says Safari and Version/, and none of the other engines' names.
  return (
    /\bSafari\//.test(ua) &&
    /\bVersion\//.test(ua) &&
    !/\b(Chrome|Chromium|CriOS|FxiOS|Edg|EdgiOS|OPR|Firefox|Android)\b/.test(ua)
  );
};

/** This browser's answer. */
export const thisBrowserClearsAfterSevenDays = (): boolean => {
  try {
    return typeof navigator !== 'undefined' && clearsAfterSevenDays(navigator.userAgent, navigator.maxTouchPoints ?? 0);
  } catch {
    return false;
  }
};
