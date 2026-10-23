// Back to the license after the backup (backup-return.ts): only the app's own pages, once.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backupReturnTo, isReturnPath, takeBackupReturn } from './backup-return';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
});

describe('coming back after the backup', () => {
  it('a license link, token after the # included, comes back once', () => {
    backupReturnTo('/license-invite/LI-abc#t=secret');
    expect(takeBackupReturn()).toBe('/license-invite/LI-abc#t=secret');
    expect(takeBackupReturn()).toBeUndefined();
  });
  it('nothing off the site, and nothing that is not ours', () => {
    for (const p of [
      '//evil.example/x',
      'https://evil.example/',
      '/\\evil.example',
      '/records',
      '/license-invite/ x',
      'javascript:alert(1)',
    ])
      expect(isReturnPath(p), p).toBe(false);
    backupReturnTo('//evil.example/license/x');
    expect(takeBackupReturn()).toBeUndefined();
    mem.set('veilcore:backup-return', 'https://evil.example/');
    expect(takeBackupReturn()).toBeUndefined();
  });
});
