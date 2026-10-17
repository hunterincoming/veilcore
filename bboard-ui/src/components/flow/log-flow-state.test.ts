// The logging flow's kept draft, and what a failed date stamp says.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DRAFT_KEY,
  chainProblem,
  clearDraft,
  draftHeading,
  emptyDraft,
  loadDraft,
  parseDraft,
  saveDraft,
  stampProblem,
  errorDetail,
} from './log-flow-state';

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Partial<Storage> }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
};

describe('the draft', () => {
  beforeEach(() => mem.clear());

  it('is kept as it is typed and comes back on the next visit', () => {
    const d = {
      ...emptyDraft(),
      strainName: 'Harbour Mist',
      bredBy: 'Hunter',
      parents: [{ name: 'A' }, { name: 'B', recordId: 'VEIL-1234' }],
      photos: [{ name: 'leaf.jpg', fingerprint: 'ab'.repeat(32) }],
    };
    saveDraft(d);
    expect(mem.has(DRAFT_KEY)).toBe(true);
    expect(loadDraft()).toEqual(d);
  });

  it('an empty form keeps nothing, and sealing clears it', () => {
    saveDraft(emptyDraft());
    expect(mem.has(DRAFT_KEY)).toBe(false);
    saveDraft({ ...emptyDraft(), notes: 'x' });
    clearDraft();
    expect(loadDraft()).toBeUndefined();
  });

  it('keeps only well-formed fields from storage', () => {
    expect(parseDraft('not json')).toBeUndefined();
    expect(parseDraft('null')).toBeUndefined();
    const d = parseDraft(
      JSON.stringify({
        strainName: 'X',
        dateCreated: 'yesterday',
        parents: [{ name: 'P' }, { nope: 1 }, 'Q'],
        photos: [
          { name: 'a', fingerprint: 'zz' },
          { name: 'b', fingerprint: 'cd'.repeat(32) },
        ],
        breedingMethod: 5,
      }),
    );
    expect(d?.strainName).toBe('X');
    expect(d?.dateCreated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(d?.parents).toEqual([{ name: 'P' }]);
    expect(d?.photos).toEqual([{ name: 'b', fingerprint: 'cd'.repeat(32) }]);
    expect(d?.breedingMethod).toBe('');
  });

  it('a browser that refuses storage still works', () => {
    const real = globalThis.localStorage;
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    try {
      expect(() => saveDraft({ ...emptyDraft(), strainName: 'x' })).not.toThrow();
      expect(loadDraft()).toBeUndefined();
      expect(() => clearDraft()).not.toThrow();
    } finally {
      (globalThis as unknown as { localStorage: unknown }).localStorage = real;
    }
  });
});

describe('Home, with a draft in this browser', () => {
  beforeEach(() => mem.clear());
  it('offers to continue it by name instead of logging a first plant', () => {
    expect(draftHeading(loadDraft())).toBe('Let’s log your first plant or animal');
    saveDraft({ ...emptyDraft(), strainName: '  Blue Dream ' });
    expect(draftHeading(loadDraft())).toBe('Continue your draft: Blue Dream');
    saveDraft({ ...emptyDraft(), notes: 'started, no name yet' });
    expect(draftHeading(loadDraft())).toBe('Continue your draft');
  });
});

describe('a failed date stamp', () => {
  const unreachable =
    "Couldn't reach the network. Your plant is saved. Try again in a few minutes, or do the date stamp later.";

  it('says it plainly when the network or the fee service is out of reach', () => {
    for (const e of [
      'Could not reach the Midnight network or the sponsor. Nothing was sent. Try again in a few minutes.',
      'The sponsor is not answering. Try again in a few minutes.',
      'No sponsor service is configured.',
      'Failed to fetch',
    ]) {
      expect(stampProblem(e)).toEqual({ text: unreachable, retry: true });
    }
  });

  it('never has a double full stop, and never names the plumbing', () => {
    for (const e of [
      'Could not reach the sponsor.',
      'Something odd.',
      'too many requests (try again in about 3 min)',
    ]) {
      const { text } = stampProblem(e);
      expect(text).not.toMatch(/\.\./);
      expect(text).not.toMatch(/sponsor/i);
      expect(text).toMatch(/Your plant is saved\./);
    }
  });

  it('passes on how long to wait when it was told', () => {
    expect(stampProblem('Slow down. (try again in about 3 min)').text).toBe(
      "The date stamp didn't go through. Your plant is saved. Try again in about 3 minutes, or do the date stamp later.",
    );
  });

  it('a transaction that was sent is never hidden, and is not offered again', () => {
    const p = stampProblem(
      'Lost contact with the network. The transaction WAS sent (abc123); check it on the network before trying again.',
    );
    expect(p.retry).toBe(false);
    expect(p.text).toContain('abc123');
    expect(p.text).toMatch(/Your plant is saved\./);
  });
});

describe('a failed date stamp: Details, so it can be reported', () => {
  it("keeps the friendly sentence and adds the error's first sentence under Details", () => {
    const p = stampProblem('The contract on the network is not the one this site was built for. Nothing was sent.');
    expect(p.text).toBe(
      "The date stamp didn't go through. Your plant is saved. Try again in a few minutes, or do the date stamp later.",
    );
    expect(p.detail).toBe('The contract on the network is not the one this site was built for.');
  });

  it('never shows a key, a secret or an address: hex over 16 characters is taken out', () => {
    const secret = 'ab'.repeat(32);
    const p = stampProblem(`Error: Bad private state for key ${secret} at 0x${'c3'.repeat(20)} (deadbeef). More text.`);
    expect(p.detail).toBe('Bad private state for key … at … (deadbeef).');
    expect(p.detail).not.toMatch(/[0-9a-f]{17,}/i);
    expect(p.text).not.toContain(secret);
  });

  it('no Details when the network was out of reach or a transaction was sent', () => {
    expect(stampProblem('Failed to fetch').detail).toBeUndefined();
    expect(stampProblem('Lost contact. The transaction WAS sent (abc123); check it.').detail).toBeUndefined();
  });

  it('cuts a long first sentence short', () => {
    expect(errorDetail('x'.repeat(500)).length).toBeLessThanOrEqual(200);
  });
});

describe('any other failed network call (chainProblem)', () => {
  it('network trouble says so, and keeps "Nothing was sent" when it was said', () => {
    expect(
      chainProblem(
        'Could not reach the Midnight network or the sponsor. Nothing was sent. Try again in a few minutes.',
      ),
    ).toEqual({
      text: "Couldn't reach the network. Nothing was sent. Try again in a few minutes.",
      retry: true,
    });
    expect(chainProblem('Failed to fetch').text).toBe("Couldn't reach the network. Try again in a few minutes.");
  });

  it('never names the fee service, even in its own reasons', () => {
    for (const e of [
      'The sponsor is not answering. Try again in a few minutes.',
      'No sponsor service is configured.',
      'The sponsor answered 500.',
      'ticket already used (try again in about 2 min)',
      'Nothing was sent to the sponsor.',
    ]) {
      const { text } = chainProblem(e);
      expect(text).not.toMatch(/sponsor|ticket/i);
      expect(text).not.toMatch(/\.\./);
    }
    expect(chainProblem('ticket already used (try again in about 2 min)').text).toBe(
      "That didn't go through. Try again in about 2 minutes.",
    );
  });

  it('otherwise gives the first sentence of the reason, short', () => {
    expect(
      chainProblem('The contract on the network is not the one this site was built for. Nothing was sent.').text,
    ).toBe(
      "That didn't go through: the contract on the network is not the one this site was built for. Nothing was sent.",
    );
    expect(chainProblem('Error: This browser does not hold the record’s keys.').text).toBe(
      "That didn't go through: this browser does not hold the record’s keys.",
    );
    const long = chainProblem(`x${'y'.repeat(400)}`).text;
    expect(long.length).toBeLessThan(200);
    expect(long).toMatch(/…\.$/);
  });

  it('a transaction that was sent is never hidden, and is not offered again', () => {
    const p = chainProblem(
      'Lost contact with the network. The transaction WAS sent (abc123); check it on the network before trying again.',
    );
    expect(p.retry).toBe(false);
    expect(p.text).toContain('abc123');
    expect(p.text).not.toMatch(/sponsor/i);
  });
});
