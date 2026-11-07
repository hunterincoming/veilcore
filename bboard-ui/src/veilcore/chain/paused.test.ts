// Dating paused (VITE_DATING_PAUSED): every call refuses before it builds anything, the
// background stamp waits, and the dating, stamp and proof buttons are disabled with the notice.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DATING_PAUSED, DATING_PAUSED_TEXT, DatingPausedError, assertNotPaused } from './paused';
import { en } from '../../i18n/en';

const src = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');

describe('dating paused', () => {
  it('is off by default; when on, a call is refused with the notice, nothing built', () => {
    expect(DATING_PAUSED).toBe(false);
    expect(() => assertNotPaused()).not.toThrow();
    expect(() => assertNotPaused(true)).toThrow(DatingPausedError);
    expect(DATING_PAUSED_TEXT).toBe(en['notice.datingPaused']);
  });

  it('every browser call and the background stamp check it first', () => {
    expect(src('./actions.ts')).toMatch(/if \(!opts\.deps\) assertNotPaused\(\);/);
    expect(src('./claims-call.ts')).toMatch(/if \(!opts\.deps\) assertNotPaused\(\);/);
    expect(src('./stamp-background.ts')).toMatch(/\|\| DATING_PAUSED\) return;/);
    expect(src('../../components/chain/useChainCall.ts')).toMatch(
      /if \(paused\) \{\s*setError\(t\('notice\.datingPaused'\)\);/,
    );
    expect(src('../../components/chain/useKeyStamp.ts')).toMatch(/if \(running\.current \|\| DATING_PAUSED\) return;/);
  });

  it.each([
    ['../../components/chain/AnchorOnChainPanel.tsx', 'stamp.paused'],
    ['../../components/chain/ProveOwnershipPanel.tsx', 'call.paused'],
    ['../../components/chain/PairDnaOnChainPanel.tsx', 'call.paused'],
    ['../../components/flow/ProvePage.tsx', 'call.paused'],
    ['../../components/document/ProveNumber.tsx', 'DATING_PAUSED'],
    ['../../components/flow/LogFlow.tsx', 'stamp.paused'],
  ])('%s disables its button and shows the notice', (file, flag) => {
    const s = src(file);
    expect(s).toContain(`<DatingPausedNotice on={${flag}} />`);
    if (!file.endsWith('LogFlow.tsx'))
      expect(s).toMatch(new RegExp(`disabled=\\{[^}]*\\|\\| ${flag.replace('.', '\\.')}\\}`));
  });
});
