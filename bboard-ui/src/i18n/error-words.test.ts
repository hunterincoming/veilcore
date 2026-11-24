// What a failure says, in every language (error-words.ts):
//   - every sentence the code throws for a person to read is an app key, so it can be said in
//     each language (a new English sentence thrown without one fails here);
//   - the screens word what they catch through errorWords / errorReason, never e.message raw;
//   - in German, Spanish, French and Japanese no English sentence is shown on its own.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appEn, type AppKey } from './app/en';
import { appDe } from './app/de';
import { appEs } from './app/es';
import { appFr } from './app/fr';
import { appJa } from './app/ja';
import { enT, makeTranslator, type Translator } from './translate';
import { errorReason, errorWords, isKnownError } from './error-words';
import { chainProblem } from '../components/flow/log-flow-state';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EN = appEn as Record<string, string>;
const OTHERS: Translator[] = [
  makeTranslator('de', appDe),
  makeTranslator('es', appEs),
  makeTranslator('fr', appFr),
  makeTranslator('ja', appJa),
];

const sourceFiles = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'e2e-fixtures' || e.name === 'fixtures' || e.name === 'node_modules') continue;
      sourceFiles(p, out);
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
};

/** The message of every `new …Error(<literal>)` in a file; `${…}` becomes ¤. */
const thrownMessages = (code: string): string[] => {
  const out: string[] = [];
  for (const m of code.matchAll(/new \w*Error\(\s*(['"`])/g)) {
    const quote = m[1];
    let i = m.index + m[0].length;
    let text = '';
    while (i < code.length && code[i] !== quote) {
      if (code[i] === '\\') {
        text += code[i + 1];
        i += 2;
      } else if (quote === '`' && code.startsWith('${', i)) {
        let depth = 1;
        i += 2;
        while (i < code.length && depth > 0) {
          if (code[i] === '{') depth++;
          else if (code[i] === '}') depth--;
          i++;
        }
        text += '¤';
      } else text += code[i++];
    }
    out.push(text);
  }
  return out;
};

/**
 * Thrown for developers, not people: a broken file or a programming mistake. Shown, if ever,
 * as "Something went wrong" with these words after it, marked as English.
 */
const FOR_DEVELOPERS = new Set([
  'An Ed25519 public key is 32 bytes.',
  'Expected 32 bytes of hex.',
  'JCS: lone surrogate',
  'JCS: numbers must be finite',
  'JCS: can’t encode a ¤',
  "JCS: can't encode a ¤",
  'Not a contract address: 64 hex characters.',
  'Not an Ask model worker.',
  'Not the offline worker.',
  'Not the proving worker.',
  'The code that makes proof codes has not loaded yet (loadFingerprintCircuit).',
  'HTTP ¤',
  'Not a key location: ¤',
  'No parameters for k=¤ here.',
  'A vault key is 32 bytes, written as 43 base64url characters.',
  'Numbers go with a report kind.',
  'A numbers result’s values are typed under its form.',
  'A held license keeps its secret, and the nonces its code was made with.',
  'A lender identity keeps its secrets.',
  'A claim keeps what it was made from.',
  'Not a statement and its payout details.',
  'That document already has a proof.',
  "Private state conflict for '¤'",
  "Signing key conflict for '¤'",
  "The deal's ¤ is not 64 hex characters.",
  // Reading the contract's state from the indexer (chain/v1-decoder.ts).
  'A contract state is hex.',
  'Not a contract state from ledger 8 or ledger 9.',
  'Not VeilCore version 1’s ledger layout.',
  'VeilCore version 1’s lastBatchRoot is not 32 bytes in that state.',
  // And version 2's (chain/v2-decoder.ts); the check page words the refusal itself.
  'Not a ledger 9 contract state: VeilCore version 2 has no other.',
]);

describe('every sentence thrown for a person can be said in every language', () => {
  const files = sourceFiles(SRC);

  it('reads the thrown messages', () => {
    // A check on the reading itself: if this breaks, the test below proves nothing.
    const all = files.flatMap((f) => thrownMessages(fs.readFileSync(f, 'utf8')));
    expect(all.length).toBeGreaterThan(150);
    expect(all).toContain('That is not a transaction id.');
    expect(all).toContain('No published schema ¤.');
  });

  it('each is an app key (app/en/errors.ts), word for word', () => {
    const missing: string[] = [];
    for (const f of files)
      for (const text of thrownMessages(fs.readFileSync(f, 'utf8'))) {
        // A code ("too-large", "IndexedDB"), lowercase words for a log, or a message built
        // around another one: not a sentence of its own.
        if (!/^[A-Z]/.test(text) || !text.includes(' ') || FOR_DEVELOPERS.has(text)) continue;
        if (!isKnownError(text.replace(/¤/g, 'x1'))) missing.push(`${path.relative(SRC, f)}: ${text}`);
      }
    expect(missing, 'add these to i18n/app/en/errors.ts (and its translations), word for word').toEqual([]);
  });
});

describe('the screens word what they catch', () => {
  // These keep the raw message in state and word it where it is shown, with errorWords.
  const WORDED_AT_RENDER = new Set([
    'components/flow/KeepSafe.tsx',
    'components/flow/BackupStep.tsx',
    'components/flow/RecoverySheet.tsx',
    'components/flow/SettingsPage.tsx',
    'components/flow/RestorePage.tsx',
    'components/document/ClaimCheck.tsx',
  ]);

  it('never shows e.message as it came', () => {
    const raw: string[] = [];
    for (const dir of ['components', 'pages', 'ask', 'scan'].map((d) => path.join(SRC, d)).filter(fs.existsSync))
      for (const f of sourceFiles(dir)) {
        const rel = path.relative(SRC, f).split(path.sep).join('/');
        const code = fs.readFileSync(f, 'utf8');
        const lines = code.split('\n');
        lines.forEach((l, i) => {
          if (/instanceof Error \? \w+\.message\b/.test(l) && !WORDED_AT_RENDER.has(rel)) raw.push(`${rel}:${i + 1}`);
        });
        if (WORDED_AT_RENDER.has(rel)) expect(/error(Words|Reason)\(/.test(code), rel).toBe(true);
      }
    expect(raw, 'word these with errorWords(e, tr) (i18n/error-words.ts)').toEqual([]);
  });
});

describe('errorWords and errorReason', () => {
  const errKeys = (Object.keys(EN) as AppKey[]).filter((k) => k.startsWith('app.err.') && !/\{\w+\}/.test(EN[k]));

  it('leave English as it was', () => {
    expect(errorWords(new Error('That is not a transaction id.'), enT)).toBe('That is not a transaction id.');
    expect(errorWords(new TypeError('Failed to fetch'), enT)).toBe('Failed to fetch');
    expect(errorReason('Failed to fetch', enT)).toBe('Failed to fetch');
    expect(errorWords('', enT)).toBe(EN['app.err.unknown']);
  });

  for (const tr of OTHERS)
    describe(tr.lang, () => {
      it('say every one of the app’s error sentences in the language', () => {
        for (const k of errKeys) {
          const said = errorWords(new Error(EN[k]), tr);
          expect(said, k).toBe(tr.t(k));
          expect(said, k).not.toBe(EN[k]);
        }
      });

      it('fill in a sentence with its values, and say a reason inside it in the language too', () => {
        const en = enT.t('app.err.lab.cantCheck', { reason: enT.t('app.err.lab.notDocument') });
        expect(errorWords(new Error(en), tr)).toBe(
          tr.t('app.err.lab.cantCheck', { reason: tr.t('app.err.lab.notDocument') }),
        );
        expect(errorWords(new Error('No published schema 3f2a.'), tr)).toBe(
          tr.t('app.err.claims.noSchema', { schema: '3f2a' }),
        );
        expect(
          errorWords(new Error('VEIL-1: its proof code does not match its fields. Nothing was imported.'), tr),
        ).toBe(tr.t('app.err.rec.codeMismatch', { id: 'VEIL-1' }));
      });

      it('say the backup’s reasons in the language (backup-words.ts)', () => {
        const en = 'This browser is already using a different set of records. Nothing was changed.';
        expect(errorWords(new Error(en), tr)).toBe(tr.t('app.backup.err.differentSet'));
      });

      it('leave a message the screen already translated as it is', () => {
        const own = tr.t('app.lic.real.notAccepted');
        expect(errorWords(new Error(own), tr)).toBe(own);
        const withValue = tr.t('app.err.claims.noSchema', { schema: 'abc' });
        expect(errorWords(withValue, tr)).toBe(withValue);
      });

      it('put a translated sentence before anything else, marking the rest as English', () => {
        const said = errorWords(new TypeError('Failed to fetch dynamically imported module'), tr);
        expect(said).toBe(tr.t('app.err.technical', { detail: 'Failed to fetch dynamically imported module' }));
        expect(said.startsWith('Failed')).toBe(false);
        expect(errorReason('QuotaExceededError', tr)).toBe(
          tr.t('app.err.technicalReason', { detail: 'QuotaExceededError' }),
        );
        expect(errorWords(undefined, tr)).toBe(tr.t('app.err.unknown'));
      });

      it('never show a long key or secret in the details', () => {
        const said = errorWords(new Error(`bad key ${'ab'.repeat(32)}`), tr);
        expect(said).not.toMatch(/[0-9a-f]{17,}/);
      });

      it('say a failed network call’s reason in the language (chainProblem)', () => {
        const known = chainProblem(
          'The contract on the network is not the one this site was built for. Nothing was sent.',
          tr,
        );
        expect(known.text).not.toMatch(/the one this site was built for/);
        expect(known.text).toContain(tr.t('app.err.chain.otherContract').slice(1, 12));
        const unknown = chainProblem('Error: The ledger rejected the transaction: Custom error 7', tr);
        expect(unknown.text).toContain(
          tr.t('app.err.technicalReason', { detail: 'The ledger rejected the transaction: Custom error 7' }),
        );
      });
    });

  it('chainProblem in English reads as before', () => {
    expect(chainProblem('The demo contract was not found on the network.').text).toBe(
      "That didn't go through: the demo contract was not found on the network.",
    );
  });
});
