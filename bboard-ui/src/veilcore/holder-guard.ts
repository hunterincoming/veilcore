// No holder key on the check and prove pages (round 6, CONTRACT.md #36).
//
// The fifth review (finding 5): the holder's browser opened a prove request, which names the
// record's on-chain key, and in the same second synced its records with its holder key, then
// posted the answer. A request log (Railway logs every request) could then join the on-chain
// key to the holder's account, which the record-keys design keeps apart. The check page
// (/verify/…) did the same for the holder's own records. So on those pages no request carries
// the holder key: the record sync doesn't start or run there (App.tsx, records.ts), the
// holder's own lab receipt is shown on their record's page instead, and, whatever code runs,
// guardHolderRequests (installed first thing in main.tsx) refuses to send a request that
// carries one. No imports: it loads with the first page.
// SPDX-License-Identifier: Apache-2.0

/** The pages that never send the holder key: a prove request, and the public check page. */
const PAUSED = /^\/(prove|verify)(\/|$)/;

/** Whether this page must not send the holder key (round 6, CONTRACT.md #36). */
export const holderRequestsPaused = (
  path: string = typeof location === 'undefined' ? '' : location.pathname,
): boolean => PAUSED.test(path);

const carriesHolderKey = (input: RequestInfo | URL, init?: RequestInit): boolean => {
  const has = (h: HeadersInit | undefined): boolean => !!h && new Headers(h).has('x-holder-key');
  return (
    has(init?.headers) ||
    (typeof Request !== 'undefined' && input instanceof Request && input.headers.has('x-holder-key'))
  );
};

/** What a request with the holder key gets on a check or prove page: refused before it leaves. */
export const HOLDER_KEY_REFUSED = 'Not sent: this page never sends your holder key.';

/**
 * Wrap this window's fetch so a request carrying the holder key is refused, before anything is
 * sent, while the page is a check or prove page. Callers see it as a request that failed, which
 * every one of them already handles (it keeps what it shows and tries again later).
 */
export const guardHolderRequests = (win: { fetch: typeof fetch } = globalThis): void => {
  const inner = win.fetch.bind(win);
  if ((inner as unknown as { holderGuard?: true }).holderGuard) return;
  const guarded = ((input: RequestInfo | URL, init?: RequestInit) =>
    holderRequestsPaused() && carriesHolderKey(input, init)
      ? Promise.reject(new TypeError(HOLDER_KEY_REFUSED))
      : inner(input, init)) as typeof fetch;
  (guarded as unknown as { holderGuard?: true }).holderGuard = true;
  win.fetch = guarded;
};
