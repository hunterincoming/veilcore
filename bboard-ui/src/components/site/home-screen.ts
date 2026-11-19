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

/**
 * VeilCore's keys that hold only a display choice (a language, a role, a notice seen), never
 * anything of the person's. Every other `veilcore.` key counts as something kept here: a lab's
 * signing key, licences held, deliveries, a half-typed draft, and any key added later. Unknown
 * means kept, so a new kind of data can never be met with "Nothing has been lost" (review of
 * PR #140: a lab or a licence holder with no records saw it at every launch).
 */
export const PREFERENCE_KEYS: ReadonlySet<string> = new Set([
  'veilcore.lang',
  'veilcore.role.v1',
  'veilcore.draft-notice-closed.v1',
  'veilcore.ask.seen.v1',
  'veilcore.note.old-links.v1',
  'veilcore.lab-visibility-seen.v2',
  'veilcore.log-kind.v1',
  'veilcore.stamp-pressed.v1',
  HOME_SCREEN_DISMISSED,
]);

/** Whether this storage holds anything of the person's (see PREFERENCE_KEYS). Never throws. */
export const keepsAnything = (
  store: Pick<Storage, 'length' | 'key'> | undefined = globalThis.localStorage,
): boolean => {
  try {
    if (!store) return false;
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith('veilcore.') && !PREFERENCE_KEYS.has(k)) return true;
    }
    return false;
  } catch {
    // Storage can't be read: say nothing rather than claim it is empty.
    return true;
  }
};

export const showHomeScreenStart = (f: {
  standalone: boolean;
  /** Anything of the person's kept here (keepsAnything), not only records. */
  hasRecords: boolean;
  pathname: string;
  dismissed: boolean;
}): boolean => f.standalone && !f.hasRecords && !f.dismissed && HOME_SCREEN_START_PATHS.includes(f.pathname);
