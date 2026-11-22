// The check made when the app opens (record-watch.ts): what it compares, against a real contract
// ledger (the contract's own circuits, run in the simulator: anchor, rotate, recover, replace the
// recovery commitment), and how often it asks. Nothing here reaches a network.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { C, VeilcoreSimulator, as, hex, secret } from '../../../contract/src/test/veilcore-simulator';
import type { RecordKeys } from './record-keys';

const local = new Map<string, string>();
const session = new Map<string, string>();
const store = (m: Map<string, string>) => ({
  getItem: (k: string) => m.get(k) ?? null,
  setItem: (k: string, v: string) => void m.set(k, v),
  removeItem: (k: string) => void m.delete(k),
});

beforeEach(() => {
  vi.unstubAllGlobals();
  local.clear();
  session.clear();
  vi.resetModules();
  vi.stubGlobal('localStorage', store(local));
  vi.stubGlobal('sessionStorage', store(session));
  vi.stubGlobal('fetch', () => {
    throw new Error('nothing here reaches the network');
  });
});

const CONTRACT = 'c0'.repeat(32);
const REC = secret('watch-record');
const RCV = secret('watch-recovery');
const ID = hex(C.commit(REC));
const EXPECTED_RCV = hex(C.recoveryCommit(RCV));

const keysFor = (recordId: string, recordSecret: Uint8Array, recoverySecret: string): RecordKeys => ({
  recordId,
  recordSecret: hex(recordSecret),
  recoverySecret,
  createdAt: 1,
  anchor: {
    identity: hex(C.commit(recordSecret)),
    network: 'preprod',
    contractAddress: CONTRACT,
    txId: 'tx',
    txHash: '22'.repeat(32),
    blockHeight: 1,
  },
});

const anchored = () => {
  const sim = new VeilcoreSimulator();
  sim.call(as(REC), 'anchor', C.recoveryCommit(RCV));
  return sim;
};

describe('compareRecord: what the chain says against what this browser expects', () => {
  it('nothing changed: nothing to say', async () => {
    const { compareRecord, viewOf } = await import('./record-watch');
    const v = viewOf(anchored().state, ID);
    expect(v).toEqual({ anchored: true, recovery: EXPECTED_RCV, rotations: 0, recoveries: 0 });
    expect(compareRecord({ identity: ID, recovery: EXPECTED_RCV }, v)).toEqual([]);
  });

  it('a quiet swap of the recovery commitment (no counter moves) is caught', async () => {
    const { compareRecord, viewOf } = await import('./record-watch');
    const sim = anchored();
    sim.call(
      as(secret('anyone'), { recovery: RCV }),
      'replaceRecoveryCommitment',
      C.commit(REC),
      C.recoveryCommit(secret('thief-rcv')),
    );
    const v = viewOf(sim.state, ID);
    expect(v.rotations).toBe(0);
    expect(v.recoveries).toBe(0);
    expect(v.head).toBeUndefined();
    expect(compareRecord({ identity: ID, recovery: EXPECTED_RCV }, v)).toEqual(['recovery-replaced']);
  });

  it('a rotation by someone holding the record secret is caught', async () => {
    const { compareRecord, viewOf } = await import('./record-watch');
    const sim = anchored();
    sim.call(as(REC, { incoming: secret('thief') }), 'rotateRecordSecret', C.commit(secret('thief')));
    const v = viewOf(sim.state, ID);
    expect(v.rotations).toBe(1);
    expect(v.head).toBe(hex(C.commit(secret('thief'))));
    expect(compareRecord({ identity: ID, recovery: EXPECTED_RCV }, v)).toEqual(['moved']);
  });

  it('a recovery is said once, as a recovery, though it also installs a new recovery commitment', async () => {
    const { compareRecord, viewOf } = await import('./record-watch');
    const sim = anchored();
    const NEW = secret('taken');
    sim.call(
      as(secret('x'), { recovery: RCV, incoming: NEW }),
      'recoverRecordSecret',
      C.commit(REC),
      C.commit(NEW),
      C.recoveryCommit(secret('taken-rcv')),
    );
    const v = viewOf(sim.state, ID);
    expect(v.recoveries).toBe(1);
    expect(v.recovery).not.toBe(EXPECTED_RCV);
    expect(compareRecord({ identity: ID, recovery: EXPECTED_RCV }, v)).toEqual(['recovered']);
  });

  it('a rotation and a swap together are both said', async () => {
    const { compareRecord, viewOf } = await import('./record-watch');
    const sim = anchored();
    sim.call(as(REC, { incoming: secret('t2') }), 'rotateRecordSecret', C.commit(secret('t2')));
    sim.call(
      as(secret('y'), { recovery: RCV }),
      'replaceRecoveryCommitment',
      C.commit(REC),
      C.recoveryCommit(secret('t2-rcv')),
    );
    expect(compareRecord({ identity: ID, recovery: EXPECTED_RCV }, viewOf(sim.state, ID))).toEqual([
      'moved',
      'recovery-replaced',
    ]);
  });

  it('no recovery secret kept here: the recovery commitment is not compared, the rest is', async () => {
    const { compareRecord, viewOf } = await import('./record-watch');
    const sim = anchored();
    sim.call(
      as(secret('z'), { recovery: RCV }),
      'replaceRecoveryCommitment',
      C.commit(REC),
      C.recoveryCommit(secret('z-rcv')),
    );
    expect(compareRecord({ identity: ID }, viewOf(sim.state, ID))).toEqual([]);
    sim.call(as(REC, { incoming: secret('z2') }), 'rotateRecordSecret', C.commit(secret('z2')));
    expect(compareRecord({ identity: ID }, viewOf(sim.state, ID))).toEqual(['moved']);
  });

  it('a record the chain doesn’t have is not a change anyone made: unknown, nothing shown', async () => {
    const { compareRecord, viewOf } = await import('./record-watch');
    const v = viewOf(new VeilcoreSimulator().state, ID);
    expect(v.anchored).toBe(false);
    expect(compareRecord({ identity: ID, recovery: EXPECTED_RCV }, v)).toBe('unknown');
  });
});

describe('checkRecordsNow: the records stamped here, one read, findings kept for the session', () => {
  it('reads the state once for every record, and finds only the one that changed', async () => {
    const w = await import('./record-watch');
    const sim = anchored();
    const OTHER = secret('watch-other');
    const OTHER_RCV = secret('watch-other-rcv');
    sim.call(as(OTHER), 'anchor', C.recoveryCommit(OTHER_RCV));
    sim.call(as(REC, { incoming: secret('t3') }), 'rotateRecordSecret', C.commit(secret('t3')));
    const read = vi.fn(() => Promise.resolve(sim.state as never));
    const keys = [
      keysFor('VEIL-A', REC, hex(RCV)),
      keysFor('VEIL-B', OTHER, hex(OTHER_RCV)),
      // Not stamped, another network, another contract: never looked at.
      { ...keysFor('VEIL-C', secret('c'), hex(secret('c-r'))), anchor: undefined },
      {
        ...keysFor('VEIL-D', secret('d'), hex(secret('d-r'))),
        anchor: { ...keysFor('x', secret('d'), '').anchor!, network: 'mainnet' },
      },
      {
        ...keysFor('VEIL-E', secret('e'), hex(secret('e-r'))),
        anchor: { ...keysFor('x', secret('e'), '').anchor!, contractAddress: 'ab'.repeat(32) },
      },
    ];
    const found = await w.checkRecordsNow({
      keys: () => keys,
      network: 'preprod',
      contract: CONTRACT,
      read,
      recoveryOf: (s) => hex(C.recoveryCommit(Buffer.from(s, 'hex'))),
      now: () => 1_000,
    });
    expect(read).toHaveBeenCalledTimes(1);
    expect(Object.keys(found ?? {})).toEqual(['VEIL-A']);
    expect(found?.['VEIL-A'].changes).toEqual(['moved']);
    // Kept for the tab's session, so the next page doesn't ask again.
    expect(
      (JSON.parse(session.get('veilcore.record-watch.v1') ?? '{}') as { found: Record<string, { changes: string[] }> })
        .found['VEIL-A'].changes,
    ).toEqual(['moved']);
  });

  it('a chain that doesn’t answer changes nothing and shows nothing', async () => {
    const w = await import('./record-watch');
    const found = await w.checkRecordsNow({
      keys: () => [keysFor('VEIL-A', REC, hex(RCV))],
      network: 'preprod',
      contract: CONTRACT,
      read: () => Promise.reject(new Error('Failed to fetch')),
      now: () => 1_000,
    });
    expect(found).toBeUndefined();
  });

  it('"I did this myself" hides it until something more changes', async () => {
    const w = await import('./record-watch');
    const sim = anchored();
    sim.call(as(REC, { incoming: secret('mine') }), 'rotateRecordSecret', C.commit(secret('mine')));
    const run = () =>
      w.checkRecordsNow({
        keys: () => [keysFor('VEIL-A', REC, hex(RCV))],
        network: 'preprod',
        contract: CONTRACT,
        read: () => Promise.resolve(sim.state as never),
        recoveryOf: (s) => hex(C.recoveryCommit(Buffer.from(s, 'hex'))),
      });
    await run();
    let shown: readonly { recordId: string }[] = [];
    const { renderToString } = await import('react-dom/server');
    const React = await import('react');
    const Probe = () => {
      shown = w.useRecordChanges();
      return null;
    };
    renderToString(React.createElement(Probe));
    expect(shown.map((f) => f.recordId)).toEqual(['VEIL-A']);
    w.markSeen('VEIL-A');
    renderToString(React.createElement(Probe));
    expect(shown).toEqual([]);
    // Something more changes on chain: it shows again.
    sim.call(
      as(secret('q'), { recovery: RCV }),
      'replaceRecoveryCommitment',
      C.commit(REC),
      C.recoveryCommit(secret('q-r')),
    );
    await run();
    renderToString(React.createElement(Probe));
    expect(shown.map((f) => f.recordId)).toEqual(['VEIL-A']);
  });
});

describe('dueNow: at most one read per ten minutes, asked again after an hour or for a new record', () => {
  it('keeps to its limits', async () => {
    const { dueNow, MIN_GAP_MS, FRESH_MS } = await import('./record-watch');
    const ctx = { network: 'preprod', contract: CONTRACT, now: 10 * FRESH_MS };
    const s = { at: ctx.now, checkedAt: ctx.now, network: 'preprod', contract: CONTRACT, checked: [ID], found: {} };
    expect(dueNow(undefined, [ID], ctx)).toBe(true);
    expect(dueNow(s, [ID], ctx)).toBe(false);
    // A new record stamped since: not before the gap, then yes.
    expect(dueNow(s, [ID, 'ee'.repeat(32)], { ...ctx, now: ctx.now + MIN_GAP_MS - 1 })).toBe(false);
    expect(dueNow(s, [ID, 'ee'.repeat(32)], { ...ctx, now: ctx.now + MIN_GAP_MS })).toBe(true);
    // Nothing new: only once the answer is an hour old.
    expect(dueNow(s, [ID], { ...ctx, now: ctx.now + FRESH_MS - 1 })).toBe(false);
    expect(dueNow(s, [ID], { ...ctx, now: ctx.now + FRESH_MS })).toBe(true);
    // A read that got no answer waits the gap too, so a down relay isn't hammered.
    const failed = { ...s, checkedAt: undefined };
    expect(dueNow(failed, [ID], { ...ctx, now: ctx.now + 1 })).toBe(false);
    expect(dueNow(failed, [ID], { ...ctx, now: ctx.now + MIN_GAP_MS })).toBe(true);
    // Another network or contract: its own answer.
    expect(dueNow(s, [ID], { ...ctx, network: 'mainnet' })).toBe(true);
  });

  it('startRecordWatch never reads in a build that doesn’t read this network', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://test.invalid', pathname: '/records' } });
    const w = await import('./record-watch');
    w.startRecordWatch();
    await new Promise((r) => setTimeout(r, 50));
    // The unit-test build has no indexer configured (vitest.config.ts): nothing was asked.
    expect(session.get('veilcore.record-watch.v1')).toBeUndefined();
  });
});
