// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { alertsOf, SYNC_GRACE_MS, type AlertInput } from './alerts.js';

const DUST = 1_000_000_000_000_000n;
const ok: AlertInput = {
  anchoringFailing: false,
  syncStalled: false,
  synced: true,
  startedAt: 0,
  now: 60_000,
  syncGraceMs: SYNC_GRACE_MS,
  dustSpecks: 500n * DUST,
  dustLowSpecks: 50n * DUST,
};

describe('alertsOf', () => {
  it('is empty when all is well', () => {
    expect(alertsOf(ok)).toEqual([]);
  });

  it('31 Oct: the stamping job failing on an empty wallet raises both alarms', () => {
    expect(alertsOf({ ...ok, anchoringFailing: true, dustSpecks: 0n })).toEqual(['anchoring-failing', 'fuel-low']);
  });

  it('no anchoring job is not a problem in itself', () => {
    expect(alertsOf({ ...ok, anchoringFailing: undefined })).toEqual([]);
  });

  it('a stalled sync', () => {
    expect(alertsOf({ ...ok, syncStalled: true })).toEqual(['sync-stalled']);
  });

  it('a first sync is allowed its grace, then is a problem; the balance is not judged before', () => {
    const syncing = { ...ok, synced: false, dustSpecks: 0n };
    expect(alertsOf({ ...syncing, now: SYNC_GRACE_MS })).toEqual([]);
    expect(alertsOf({ ...syncing, now: SYNC_GRACE_MS + 1 })).toEqual(['not-synced']);
  });

  it('fuel low below the line, not at it; an unreadable balance is not judged', () => {
    expect(alertsOf({ ...ok, dustSpecks: 50n * DUST })).toEqual([]);
    expect(alertsOf({ ...ok, dustSpecks: 50n * DUST - 1n })).toEqual(['fuel-low']);
    expect(alertsOf({ ...ok, dustSpecks: undefined })).toEqual([]);
  });
});
