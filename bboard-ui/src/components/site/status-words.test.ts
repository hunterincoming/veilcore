// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { lastRun, statusLine } from './status-words';

describe('what /status says for a reading', () => {
  it('running when in step with Midnight and no alert', () => {
    expect(statusLine({ synced: true, anchorer: { enabled: true, alert: false } })).toBe('running');
  });
  it('catching up when not in step', () => {
    expect(statusLine({ synced: false, anchorer: { enabled: true, alert: false } })).toBe('behind');
    expect(statusLine({})).toBe('behind');
  });
  it('failing batches outrank being in step', () => {
    expect(statusLine({ synced: true, anchorer: { alert: true } })).toBe('failing');
  });
  it('reads the last run only from a real date', () => {
    expect(lastRun({ anchorer: { lastRunAt: '2026-11-15T10:00:00.000Z' } })?.toISOString()).toBe(
      '2026-11-15T10:00:00.000Z',
    );
    expect(lastRun({ anchorer: { lastRunAt: 'soon' } })).toBeUndefined();
    expect(lastRun({ anchorer: { lastRunAt: 5 } })).toBeUndefined();
    expect(lastRun({})).toBeUndefined();
  });
});
