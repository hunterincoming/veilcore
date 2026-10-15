// A restored holder key is kept in lower case, as the registry reads it (round 3).
import { describe, expect, it } from 'vitest';
import { holderKeyIfAny, setHolderKey } from './holder';

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Partial<Storage> }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
};

describe('restoring a holder key', () => {
  it('keeps it in lower case, and still refuses anything that is not 64 hex characters', () => {
    setHolderKey(` ${'AB'.repeat(32)}\n`);
    expect(holderKeyIfAny()).toBe('ab'.repeat(32));
    expect(() => setHolderKey('xyz')).toThrow(/64 hexadecimal/);
  });
});
