import { describe, expect, it } from 'vitest';
import { hasRecordsHere, HOLDER_STORAGE, OUTBOX_STORAGE } from './returning';

const store = (items: Record<string, string>) => ({ getItem: (k: string) => items[k] ?? null });

describe('hasRecordsHere', () => {
  it('is false for a first visit', () => expect(hasRecordsHere(store({}))).toBe(false));
  it('is true with a holder key', () => expect(hasRecordsHere(store({ [HOLDER_STORAGE]: 'a'.repeat(64) }))).toBe(true));
  it('ignores a malformed key', () => expect(hasRecordsHere(store({ [HOLDER_STORAGE]: 'nope' }))).toBe(false));
  it('is true with records waiting in the outbox', () =>
    expect(hasRecordsHere(store({ [OUTBOX_STORAGE]: '[{"id":"x"}]' }))).toBe(true));
  it('is false for an empty outbox', () => expect(hasRecordsHere(store({ [OUTBOX_STORAGE]: '[]' }))).toBe(false));
  it('never throws when storage does', () =>
    expect(
      hasRecordsHere({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe(false));
});
