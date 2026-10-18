// macOS and Windows file systems ignore letter case, so `./PickUp` and `./pickup` are the
// same import there and the founder's build broke (17 Oct 2026) while Linux CI passed.
// This fails if two tracked files in one folder share a name apart from case, counting
// names without their extension (an import names a module, not a file).
// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('no two files in one folder differ only in letter case', () => {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const seen = new Map();
  const clashes = [];
  for (const f of files) {
    const slash = f.lastIndexOf('/');
    const dir = f.slice(0, slash + 1);
    const base = f.slice(slash + 1).replace(/\.(test\.)?(d\.)?[cm]?[jt]sx?$/, '');
    const key = (dir + base).toLowerCase();
    const prev = seen.get(key);
    if (prev && prev.toLowerCase() !== f.toLowerCase() && prev.replace(/\.[^/.]+$/, '') !== f.replace(/\.[^/.]+$/, '')) {
      const a = prev.slice(slash + 1).replace(/\..*$/, '');
      const b = f.slice(slash + 1).replace(/\..*$/, '');
      if (a !== b) clashes.push(`${prev} <> ${f}`);
    }
    seen.set(key, f);
  }
  assert.deepEqual(clashes, []);
});
