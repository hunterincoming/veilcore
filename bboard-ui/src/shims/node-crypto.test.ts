// The browser stand-in must hash exactly as Node does, or the checker would refuse real answers.
import { createHash as nodeHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createHash } from './node-crypto';

describe('browser createHash', () => {
  it('matches Node for bytes, text, chained updates, hex and raw output', () => {
    const bytes = Uint8Array.from({ length: 300 }, (_, i) => (i * 7) % 256);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(nodeHash('sha256').update(bytes).digest('hex'));
    expect(createHash('sha256').update('veilcore:v1', 'utf8').update(bytes).digest('hex')).toBe(
      nodeHash('sha256').update('veilcore:v1', 'utf8').update(bytes).digest('hex'),
    );
    expect(new Uint8Array(createHash('sha256').update(bytes).digest() as Uint8Array)).toEqual(
      new Uint8Array(nodeHash('sha256').update(bytes).digest()),
    );
  });
  it('refuses anything it cannot do rather than guessing', () => {
    expect(() => createHash('md5')).toThrow(/only sha256/);
  });
});
