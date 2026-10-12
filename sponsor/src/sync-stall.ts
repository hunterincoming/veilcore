// Telling a stuck wallet sync from a slow one (12 Oct 2026).
//
// On preprod (10-11 Oct 2026) the dust wallet looped for 16 hours on one batch, logging only
// "Wallet.Sync: [object Object]" (wallet-sdk-dust-wallet, Sync.js). Moving the saved sync
// progress aside and syncing from the start fixed it in an hour: Midnight's own fix in
// servicedesk#216 (the indexer's event ids are per instance, midnight-indexer#1460). This
// service runs with nobody watching, so a stuck sync would quietly stop all anchoring.
//
// What counts as movement: how far each wallet still syncing has applied (appliedIndex,
// appliedId). The chain's tip is left out (it moves with every block while a stuck wallet
// applies nothing), and so is any wallet that has finished (a shielded wallet following new
// blocks must not hide a stuck dust wallet). The same rule as bboard-cli/src/sync-watch.ts.
//
// SPDX-License-Identifier: Apache-2.0

/** Nothing applied for this long, while not synced, is a stall (30 minutes). */
export const STALL_MS = 30 * 60_000;

export type SyncPart = { readonly progress: unknown; readonly complete: boolean };

const applied = (progress: unknown): string => {
  if (!progress || typeof progress !== 'object') return '';
  return Object.entries(progress as Record<string, unknown>)
    .filter(([k, v]) => k.startsWith('applied') && (typeof v === 'bigint' || typeof v === 'number'))
    .map(([k, v]) => `${k}=${String(v)}`)
    .sort()
    .join(',');
};

export const progressSignature = (parts: readonly SyncPart[]): string =>
  parts.map((p, i) => (p.complete ? `${i}:done` : `${i}:${applied(p.progress)}`)).join('|');

/** Tracks movement; `stalled()` is true once nothing has moved for `stallMs` while not synced. */
export class StallTracker {
  private signature: string | undefined;
  private lastMove: number;
  private synced = false;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly stallMs: number = STALL_MS,
  ) {
    this.lastMove = now();
  }

  see(parts: readonly SyncPart[]): void {
    this.synced = parts.every((p) => p.complete);
    const next = progressSignature(parts);
    if (next !== this.signature) {
      this.signature = next;
      this.lastMove = this.now();
    }
  }

  stalled(): boolean {
    return !this.synced && this.now() - this.lastMove >= this.stallMs;
  }

  /** Minutes since anything applied, for the log. */
  minutesStill(): number {
    return Math.floor((this.now() - this.lastMove) / 60_000);
  }
}
