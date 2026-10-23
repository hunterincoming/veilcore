// Where the backup page goes when it's done: back to the page that sent the person there
// (a license they're in the middle of), not Home. Kept in this tab's sessionStorage rather
// than the address, because the page to go back to can carry a token after its # (a license
// link's), and an address can end up in a server's log; a fragment and sessionStorage don't.
// Only the app's own pages are accepted, so nothing here can send anyone off the site.
// SPDX-License-Identifier: Apache-2.0

const KEY = 'veilcore:backup-return';
const OURS = /^\/(?:license-invite|license|record|intake)\/[^\s\\]*$/;

/** Whether `path` is one of the app's own pages to come back to. */
export const isReturnPath = (path: unknown): path is string =>
  typeof path === 'string' && path.length <= 2000 && !path.startsWith('//') && OURS.test(path);

/** Remember the page to come back to after the backup (this tab only). */
export const backupReturnTo = (path: string): void => {
  if (!isReturnPath(path)) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    /* without storage the backup goes Home, as before */
  }
};

/** The page to come back to, once: read and forgotten. */
export const takeBackupReturn = (): string | undefined => {
  try {
    const v = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return isReturnPath(v) ? v : undefined;
  } catch {
    return undefined;
  }
};
