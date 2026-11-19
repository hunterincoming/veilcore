// VeilCore opened from an iPhone or iPad Home Screen with nothing in it (easy-mode review, 19 Nov).
//
// The site offers an apple-touch-icon, so Share → Add to Home Screen works, and since iOS 26 every
// site added that way opens as its own web app. That app keeps its own storage, apart from Safari's:
// its first launch has no records, and the holder would think VeilCore had lost them. This says
// what happened and points to the restore page, before anything else is shown.
//
// Only on iOS: `navigator.standalone` is Apple's own flag for a Home Screen web app. A desktop
// "open as window" shortcut is standalone too, but it shares the browser's storage, so an empty
// one really is empty and "separate from Safari" would be wrong there.
//
// No web app manifest is added (yet): on iOS 18 and earlier a site without one opens from the
// Home Screen in Safari, with Safari's storage. A manifest would turn those into separate-storage
// web apps too, which changes where existing users' records live.
// SPDX-License-Identifier: Apache-2.0

/** Whether this page runs as an iOS Home Screen web app. Never throws. */
export const isIosHomeScreenApp = (nav: unknown = globalThis.navigator): boolean => {
  try {
    return (nav as { standalone?: unknown } | undefined)?.standalone === true;
  } catch {
    return false;
  }
};

/**
 * The pages a Home Screen icon opens on (the page it was added from) where an empty app would
 * look like lost records. Never a check, restore, backup or help page: those work as they are.
 */
export const HOME_SCREEN_START_PATHS: readonly string[] = [
  '/',
  '/records',
  '/new',
  '/documents/new',
  '/licenses',
  '/lab/results',
];

/** The key that says "start without records" was chosen in this launch (sessionStorage). */
export const HOME_SCREEN_DISMISSED = 'veilcore.homescreen.fresh';

export const showHomeScreenStart = (f: {
  standalone: boolean;
  hasRecords: boolean;
  pathname: string;
  dismissed: boolean;
}): boolean => f.standalone && !f.hasRecords && !f.dismissed && HOME_SCREEN_START_PATHS.includes(f.pathname);
