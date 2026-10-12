// The stall watch (sync-watch.ts): preprod, 10-11 Oct 2026, the dust wallet looped for 16
// hours with nothing but "Wallet.Sync: [object Object]" in the log.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STALL_MS, progressSignature, stallAdvice, watchSync, type SyncPart } from './sync-watch';

const dust = (appliedIndex: bigint, highestIndex: bigint, complete = false): SyncPart => ({
  progress: {
    appliedIndex,
    highestRelevantWalletIndex: highestIndex,
    highestIndex,
    highestRelevantIndex: highestIndex,
    isConnected: true,
  },
  complete,
});
const shielded = (appliedIndex: bigint, complete: boolean): SyncPart => ({
  progress: {
    appliedIndex,
    highestRelevantWalletIndex: appliedIndex,
    highestIndex: appliedIndex,
    highestRelevantIndex: appliedIndex,
    isConnected: true,
  },
  complete,
});
const unshielded = (appliedId: bigint, complete: boolean): SyncPart => ({
  progress: { appliedId, highestTransactionId: appliedId, isConnected: true },
  complete,
});

describe('sync stall watch', () => {
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    vi.useFakeTimers();
    const warn = vi.fn();
    const watch = watchSync({ warn } as never, 'preprod');
    return { warn, watch };
  };

  it('warns once when a wallet still syncing applies nothing for 20 minutes', () => {
    const { warn, watch } = setup();
    watch.see([shielded(10n, true), dust(500n, 900n), unshielded(3n, true)]);
    vi.advanceTimersByTime(DEFAULT_STALL_MS - 60_000);
    expect(warn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * 60_000);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe(stallAdvice('preprod'));
    vi.advanceTimersByTime(60 * 60_000);
    expect(warn).toHaveBeenCalledTimes(1);
    watch.stop();
  });

  it('a moving chain tip does not count as progress: the stuck loop of 10-11 Oct', () => {
    const { warn, watch } = setup();
    for (let minute = 0; minute <= 25; minute++) {
      // The same batch retried: appliedIndex fixed, the tip moving with every block.
      watch.see([shielded(10n, true), dust(500n, 900n + BigInt(minute)), unshielded(3n, true)]);
      vi.advanceTimersByTime(60_000);
    }
    expect(warn).toHaveBeenCalledTimes(1);
    watch.stop();
  });

  it('a finished wallet following new blocks cannot hide a stuck dust wallet', () => {
    const { warn, watch } = setup();
    for (let minute = 0; minute <= 25; minute++) {
      watch.see([shielded(10n + BigInt(minute), true), dust(500n, 900n), unshielded(3n + BigInt(minute), true)]);
      vi.advanceTimersByTime(60_000);
    }
    expect(warn).toHaveBeenCalledTimes(1);
    watch.stop();
  });

  it('a slow sync that keeps applying never warns', () => {
    const { warn, watch } = setup();
    for (let minute = 0; minute <= 7 * 60; minute += 5) {
      watch.see([shielded(10n, true), dust(BigInt(minute) * 100n, 1_000_000n), unshielded(3n, true)]);
      vi.advanceTimersByTime(5 * 60_000);
    }
    expect(warn).not.toHaveBeenCalled();
    watch.stop();
  });

  it('never warns once synced, even with no further progress (waiting for the faucet)', () => {
    const { warn, watch } = setup();
    watch.see([shielded(10n, true), dust(900n, 900n, true), unshielded(3n, true)]);
    vi.advanceTimersByTime(3 * DEFAULT_STALL_MS);
    expect(warn).not.toHaveBeenCalled();
    watch.stop();
  });

  it('warns again only after progress has moved and stopped again', () => {
    const { warn, watch } = setup();
    watch.see([dust(1n, 9n)]);
    vi.advanceTimersByTime(DEFAULT_STALL_MS + 60_000);
    expect(warn).toHaveBeenCalledTimes(1);
    watch.see([dust(2n, 9n)]);
    vi.advanceTimersByTime(DEFAULT_STALL_MS - 60_000);
    expect(warn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2 * 60_000);
    expect(warn).toHaveBeenCalledTimes(2);
    watch.stop();
  });

  it('stop ends the watch', () => {
    const { warn, watch } = setup();
    watch.see([dust(1n, 9n)]);
    watch.stop();
    vi.advanceTimersByTime(3 * DEFAULT_STALL_MS);
    expect(warn).not.toHaveBeenCalled();
  });

  it('the advice names this network only, so mainnet progress is never moved by a preprod warning', () => {
    expect(stallAdvice('preprod')).toContain('wallet-state/preprod-*');
    expect(stallAdvice('preprod')).not.toContain('mainnet');
    expect(progressSignature([dust(5n, 9n), shielded(1n, true)])).toBe('0:appliedIndex=5|1:done');
  });
});
