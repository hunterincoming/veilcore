// A wallet sync that has stopped moving looks exactly like a slow one: the dust wallet
// retries a failed batch for ever and logs only "Wallet.Sync: [object Object]"
// (wallet-sdk-dust-wallet, Sync.js). On preprod (10-11 Oct 2026) that ran for 16 hours
// before anyone could tell it was stuck. Moving the saved progress aside and syncing from
// the start fixed it in an hour: the fix Midnight gives in servicedesk#216, the indexer's
// event ids being per instance (midnight-indexer#1460).
//
// This watches how far each wallet still syncing has applied (appliedIndex for shielded and
// dust, appliedId for unshielded). The chain's tip is left out on purpose: it moves with
// every block even while a stuck wallet applies nothing. A wallet that has finished is
// left out too, so a shielded wallet following new blocks cannot hide a stuck dust wallet.
// If nothing being watched has moved for `stallMs`, it says so once, with what to do, and
// again only after progress has moved and stopped again. It never stops or changes the
// sync itself: a slow catch-up still finishes.
//
// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino';

/** No progress for this long, while not synced, is reported (20 minutes). */
export const DEFAULT_STALL_MS = 20 * 60_000;

/** One wallet's sync progress and whether it has finished. */
export type SyncPart = { readonly progress: unknown; readonly complete: boolean };

/** How far one progress object has applied (appliedIndex, appliedId), as text. */
const applied = (progress: unknown): string => {
  if (!progress || typeof progress !== 'object') return '';
  return Object.entries(progress as Record<string, unknown>)
    .filter(([k, v]) => k.startsWith('applied') && (typeof v === 'bigint' || typeof v === 'number'))
    .map(([k, v]) => `${k}=${String(v)}`)
    .sort()
    .join(',');
};

/** Changes whenever a wallet that is still syncing applies something. */
export const progressSignature = (parts: readonly SyncPart[]): string =>
  parts.map((p, i) => (p.complete ? `${i}:done` : `${i}:${applied(p.progress)}`)).join('|');

export const stallAdvice = (network: string): string =>
  `The wallet sync has not moved for a long time. If the log keeps repeating "Wallet.Sync: [object Object]", ` +
  `it is stuck, not slow, and waiting will not help. Press Ctrl+C, move this network's saved progress aside ` +
  `(mkdir -p ~/.veilcore/wallet-state-aside && mv ~/.veilcore/wallet-state/${network}-* ~/.veilcore/wallet-state-aside/), ` +
  `and run again: it syncs from the start. Nothing is lost; the coins are on chain, not in that file.`;

export type SyncWatch = {
  /** Call with each wallet state seen: each wallet's progress and whether it has finished. */
  readonly see: (parts: readonly SyncPart[]) => void;
  /** Stop watching (sync finished, or the run is ending). */
  readonly stop: () => void;
};

export const watchSync = (
  logger: Pick<Logger, 'warn'>,
  network: string,
  options: { stallMs?: number; checkEveryMs?: number; now?: () => number } = {},
): SyncWatch => {
  const stallMs = options.stallMs ?? DEFAULT_STALL_MS;
  const now = options.now ?? Date.now;
  let signature: string | undefined;
  let lastMove = now();
  let synced = false;
  let warned = false;

  const check = (): void => {
    if (synced || warned || now() - lastMove < stallMs) return;
    warned = true;
    logger.warn(stallAdvice(network));
  };
  const timer = setInterval(check, options.checkEveryMs ?? 60_000);
  timer.unref?.();

  return {
    see(parts) {
      synced = parts.every((p) => p.complete);
      const next = progressSignature(parts);
      if (next !== signature) {
        signature = next;
        lastMove = now();
        warned = false;
      }
    },
    stop() {
      clearInterval(timer);
    },
  };
};
