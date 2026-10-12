// A stuck wallet sync (preprod, 10-11 Oct 2026: 16 hours of "Wallet.Sync: [object Object]")
// is told apart from a slow one, and the sponsor heals it once by setting its saved
// progress aside and restarting.
// SPDX-License-Identifier: Apache-2.0
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STALL_MS, StallTracker, progressSignature, type SyncPart } from './sync-stall.js';

const prog = (applied: bigint, tip: bigint) => ({
  appliedIndex: applied,
  highestRelevantWalletIndex: tip,
  highestIndex: tip,
  highestRelevantIndex: tip,
  isConnected: true,
});
const part = (applied: bigint, tip: bigint, complete = false): SyncPart => ({ progress: prog(applied, tip), complete });

describe('StallTracker', () => {
  it('a fixed applied index with a moving tip is a stall after 30 minutes', () => {
    let t = 0;
    const s = new StallTracker(() => t);
    for (let m = 0; m <= 31; m++) {
      t = m * 60_000;
      s.see([part(10n, 10n, true), part(500n, 900n + BigInt(m)), part(3n, 3n, true)]);
    }
    expect(s.stalled()).toBe(true);
    expect(s.minutesStill()).toBe(31);
  });

  it('a slow sync that keeps applying is never a stall', () => {
    let t = 0;
    const s = new StallTracker(() => t);
    for (let m = 0; m <= 8 * 60; m += 10) {
      t = m * 60_000;
      s.see([part(BigInt(m), 1_000_000n)]);
      expect(s.stalled()).toBe(false);
    }
  });

  it('a synced wallet with nothing new is never a stall', () => {
    let t = 0;
    const s = new StallTracker(() => t);
    s.see([part(9n, 9n, true), part(4n, 4n, true)]);
    t = 10 * STALL_MS;
    expect(s.stalled()).toBe(false);
  });

  it('finished wallets do not count as movement', () => {
    expect(progressSignature([part(1n, 1n, true), part(5n, 9n)])).toBe('0:done|1:appliedIndex=5');
    expect(progressSignature([part(2n, 2n, true), part(5n, 9n)])).toBe('0:done|1:appliedIndex=5');
  });
});

describe('the sponsor wallet heals a stalled sync once', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.doUnmock('./log.js');
  });

  const setup = async (restored: boolean) => {
    vi.useFakeTimers();
    const logged: { level: string; msg: string; fields?: Record<string, unknown> }[] = [];
    vi.doMock('./log.js', () => ({
      log: (level: string, msg: string, fields?: Record<string, unknown>) => void logged.push({ level, msg, fields }),
    }));
    const { FacadeWallet } = await import('./wallet.js');
    const states = new Subject<unknown>();
    const facade = {
      start: () => Promise.resolve(),
      state: () => states,
      shielded: { serializeState: () => Promise.resolve('s') },
      unshielded: { serializeState: () => Promise.resolve('u') },
      dust: { serializeState: () => Promise.resolve('d') },
      stop: () => Promise.resolve(),
    };
    const dir = mkdtempSync(join(tmpdir(), 'sponsor-stall-'));
    const w = FacadeWallet.forTests(facade, { restored, stateDir: dir });
    await w.start();
    const facadeState = (applied: bigint, tip: bigint) => ({
      shielded: { state: { progress: { ...prog(1n, 1n), isStrictlyComplete: () => true } } },
      unshielded: { progress: { appliedId: 1n, highestTransactionId: 1n, isConnected: true, isStrictlyComplete: () => true } },
      dust: { state: { progress: { ...prog(applied, tip), isStrictlyComplete: () => applied === tip } } },
    });
    return { w, states, facadeState, logged, dir };
  };

  it('resumed from saved progress: its own check sets the file aside (kept) and exits for a restart', async () => {
    const { w, states, facadeState, logged, dir } = await setup(true);
    await w.saveProgress(); // the saved progress this run resumed from
    const [file] = readdirSync(dir);
    expect(file).toMatch(/^wallet-test-[0-9a-f]{16}\.bin$/);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    try {
      for (let m = 0; m <= 31; m++) {
        states.next(facadeState(500n, 900n + BigInt(m)));
        vi.advanceTimersByTime(60_000);
      }
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
      const left = readdirSync(dir);
      expect(left.some((f) => f.startsWith(`${file}.stalled-`))).toBe(true);
      expect(left).not.toContain(file);
      expect(logged.some((l) => l.level === 'error' && l.msg.includes('set it aside'))).toBe(true);
      // Its timers are stopped: the stuck state is never written back over the moved file.
      vi.advanceTimersByTime(10 * 60_000);
      expect(readdirSync(dir)).not.toContain(file);
      expect(exit).toHaveBeenCalledTimes(1);
    } finally {
      exit.mockRestore();
    }
    await w.stop();
  });

  it('started from the start: reports once, never exits (a restart would only loop)', async () => {
    const { w, states, facadeState, logged } = await setup(false);
    const exit = vi.fn();
    for (let m = 0; m <= 40; m++) {
      states.next(facadeState(500n, 900n + BigInt(m)));
      vi.advanceTimersByTime(60_000);
      w.checkStall(exit);
    }
    expect(exit).not.toHaveBeenCalled();
    expect(logged.filter((l) => l.msg.includes('stalled from the start'))).toHaveLength(1);
    await w.stop();
  });

  it('a sync that keeps applying is left alone', async () => {
    const { w, states, facadeState } = await setup(true);
    const exit = vi.fn();
    for (let m = 0; m <= 90; m++) {
      states.next(facadeState(BigInt(m), 10_000n));
      vi.advanceTimersByTime(60_000);
      w.checkStall(exit);
    }
    expect(exit).not.toHaveBeenCalled();
    expect(w.syncStalled()).toBe(false);
    await w.stop();
  });
});
