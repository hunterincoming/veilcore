// Midnight's Ledger 9 fork as the sponsor sees it: the fork check (fork.ts), its alert, and
// saved wallet progress across the crossing (wallet.ts).
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Subject } from 'rxjs';
import { readFork } from './fork.js';
import { alertsOf } from './alerts.js';
import { FacadeWallet, resumable } from './wallet.js';

const V9 = 2_000_000n;

describe('the fork check', () => {
  it('agrees before the fork (1.x, Ledger 8 state) and after it (2.x, Ledger 9 state)', () => {
    expect(readFork(1_000_000, V9, 'v8')).toMatchObject({ walletEra: 'v8', frameworkEra: 'v8', agree: true });
    expect(readFork(2_001_000, V9, 'v9')).toMatchObject({ walletEra: 'v9', frameworkEra: 'v9', agree: true });
    expect(readFork(2_001_000, V9, undefined).agree).toBe(true); // state not read: the versions decide
  });

  it('disagrees when the chain is on Ledger 9 but the wallet would build for Ledger 8', () => {
    // A fork schedule placed above what the chain reports, on a chain whose state is Ledger 9's.
    expect(readFork(2_001_000, 3_000_000n, 'v9')).toMatchObject({ walletEra: 'v8', frameworkEra: 'v9', agree: false });
    // The version says Ledger 8 but the indexer serves Ledger 9 state.
    expect(readFork(1_000_000, V9, 'v9').agree).toBe(false);
    // A protocol version midnight-js does not know.
    expect(readFork(3_000_000, V9, 'v9')).toMatchObject({ frameworkEra: 'unknown', agree: false });
  });

  it('a disagreement is the alert fork-mismatch, first in the list', () => {
    const base = {
      anchoringFailing: false,
      syncStalled: false,
      synced: true,
      startedAt: 0,
      now: 1,
      syncGraceMs: 10,
      dustSpecks: 10n,
      dustLowSpecks: 1n,
    };
    expect(alertsOf({ ...base, forkMismatch: true })).toEqual(['fork-mismatch']);
    expect(alertsOf({ ...base, forkMismatch: false })).toEqual([]);
    expect(alertsOf(base)).toEqual([]);
  });
});

describe('saved wallet progress across the fork', () => {
  it('progress saved on Ledger 8, or without its ledger recorded, is not resumed on Ledger 9', () => {
    expect(resumable('v8', 'v9')).toBe(false);
    expect(resumable(undefined, 'v9')).toBe(false);
    expect(resumable('v9', 'v9')).toBe(true);
    // A network not yet forked, or not known: resumed as before.
    expect(resumable(undefined, 'v8')).toBe(true);
    expect(resumable('v8', undefined)).toBe(true);
  });

  it('pre-fork progress is set aside (kept, renamed), and the next start syncs from the start', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sponsor-fork-'));
    FacadeWallet.writeProgressForTests(dir, undefined); // as every sponsor before this build saved it
    expect(FacadeWallet.openProgressForTests(dir, 'v8')).toBeDefined(); // preprod, not forked: resumed
    expect(FacadeWallet.openProgressForTests(dir, 'v9')).toBeUndefined();
    const files = readdirSync(dir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.bin\.stalled-\d+$/);
    FacadeWallet.writeProgressForTests(dir, 'v9');
    expect(FacadeWallet.openProgressForTests(dir, 'v9')).toMatchObject({ era: 'v9' });
  });

  it('progress is saved with the ledger the network is on', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sponsor-fork-'));
    const facade = {
      start: () => Promise.resolve(),
      state: () => new Subject(),
      shielded: { serializeState: () => Promise.resolve('s') },
      unshielded: { serializeState: () => Promise.resolve('u') },
      dust: { serializeState: () => Promise.resolve('d') },
      stop: () => Promise.resolve(),
    };
    const w = FacadeWallet.forTests(facade, { stateDir: dir, chainEra: 'v8' });
    await w.saveProgress();
    expect(FacadeWallet.openProgressForTests(dir, undefined)).toMatchObject({ era: 'v8' });
    w.setChainEra('v9');
    await w.saveProgress();
    expect(FacadeWallet.openProgressForTests(dir, 'v9')).toMatchObject({ era: 'v9' });
  });
});
