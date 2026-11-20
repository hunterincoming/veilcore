// Records that came to this device from a backup or another device (arrived.ts): listed once on
// Home, never also under "Still in progress" (the live test of step 2, 19 Nov 2026).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { arrivedIds, noteArrived } from './arrived';

describe('records that arrived from elsewhere', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  it('are remembered by id, once each, newest kept', () => {
    expect(arrivedIds().size).toBe(0);
    noteArrived(['A', 'B']);
    noteArrived(['B', 'C']);
    expect([...arrivedIds()].sort()).toEqual(['A', 'B', 'C']);
    noteArrived([]);
    expect(arrivedIds().size).toBe(3);
  });
});
