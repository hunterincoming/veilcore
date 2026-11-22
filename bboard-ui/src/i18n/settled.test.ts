// React's `use` is called on every render, never behind `??`, `||`, `&&` or `? :` (settled.ts:
// a conditional `use` broke a replay after suspending, React error #520 from #467), and the
// promises it reads say when they have settled, so a language already here never suspends.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fulfilled, tracked } from './settled';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });

describe('React use()', () => {
  it('is never called conditionally in the site’s code', () => {
    const hits = files(SRC).flatMap((f) =>
      fs
        .readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => /(\?\?|\|\||&&|\?)\s*use\(/.test(line))
        .map(({ line, i }) => `${path.relative(SRC, f)}:${String(i + 1)}: ${line.trim()}`),
    );
    expect(hits).toEqual([]);
  });

  it('reads a settled value at once, and marks a tracked promise when it settles', async () => {
    const now = fulfilled({ a: 1 }) as Promise<{ a: number }> & { status?: string; value?: unknown };
    expect(now.status).toBe('fulfilled');
    expect(now.value).toEqual({ a: 1 });
    const later = tracked(Promise.resolve('x')) as Promise<string> & { status?: string; value?: unknown };
    expect(later.status).toBe('pending');
    await later;
    await Promise.resolve();
    expect(later.status).toBe('fulfilled');
    expect(later.value).toBe('x');
    const failed = tracked(Promise.reject(new Error('no'))) as Promise<never> & { status?: string };
    await failed.catch(() => undefined);
    await Promise.resolve();
    expect(failed.status).toBe('rejected');
  });
});
