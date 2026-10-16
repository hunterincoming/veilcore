// What a phone downloads first. The landing page and the check page must not bring the
// record app or Midnight's WebAssembly with them (App.tsx, commitment.ts): read from the
// source here, and from the built site in dist/ when there is one (`npx vite build`).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { en } from './i18n/en';
import { ja } from './i18n/ja';
import { es } from './i18n/es';
import { de } from './i18n/de';
import { fr } from './i18n/fr';
import { appEn } from './i18n/app/en';
import { appJa } from './i18n/app/ja';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.join(HERE, rel), 'utf8');
const staticImports = (src: string) =>
  [...src.matchAll(/^import\s+(?:type\s+)?[^'"]*?from\s+'([^']+)';/gms)]
    .filter((m) => !/^import\s+type\b/.test(m[0]))
    .map((m) => m[1]);

describe('the first download, in the source', () => {
  it('App.tsx imports only the public pages directly; every other page is fetched when opened', () => {
    const own = staticImports(read('App.tsx')).filter((s) => s.startsWith('.'));
    expect(own.sort()).toEqual(
      [
        './components/flow/FlowFrame',
        './components/site/Founders',
        './components/site/Home',
        './components/site/NotFound',
        './components/site/Privacy',
        './config/network',
        './config/theme',
        // The language picker's choice, and the site's own words (the app's load with its pages).
        './i18n',
      ].sort(),
    );
    // The record sync starts from the app's frame, by a dynamic import.
    expect(read('App.tsx')).toMatch(/import\('\.\/veilcore\/records'\)\.then\(\(m\) => m\.startRecordSync\(\)\)/);
  });

  it('commitment.ts loads the compiled contract (and its WebAssembly) only when asked', () => {
    const src = read('veilcore/commitment.ts');
    expect(staticImports(src).some((s) => s.includes('managed/veilcore/contract'))).toBe(false);
    expect(src).toMatch(/export const loadFingerprintCircuit/);
  });

  it('the public pages take the language picker through its lazy wrapper', () => {
    expect(read('components/site/SiteShell.tsx')).toMatch(/from '\.\.\/\.\.\/i18n\/lazy-picker'/);
    expect(staticImports(read('i18n/lazy-picker.tsx'))).not.toContain('./LanguagePicker');
  });

  it('lab-results.ts loads the age library when a report is locked or opened, not on import', () => {
    expect(staticImports(read('veilcore/lab-results.ts'))).not.toContain('age-encryption');
  });
});

/** Every source file `rel` loads before it runs: its static imports (not types), followed through. */
const sourceClosure = (rel: string): Set<string> => {
  const seen = new Set<string>();
  const todo = [rel];
  while (todo.length) {
    const f = todo.pop() as string;
    if (seen.has(f)) continue;
    seen.add(f);
    const src = read(f);
    const specs = [...src.matchAll(/^(?:import|export)\s+(?!type\b)[^;]*?from\s+'(\.[^']+)';/gms)].map((m) => m[1]);
    for (const m of src.matchAll(/^import\s+'(\.[^']+)';/gm)) specs.push(m[1]);
    for (const spec of specs) {
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(f), spec));
      const hit = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find(
        (c) => fs.existsSync(path.join(HERE, c)) && fs.statSync(path.join(HERE, c)).isFile(),
      );
      if (hit) todo.push(hit);
    }
  }
  return seen;
};

describe('which pages wait for the fingerprint circuit (App.tsx `circuit`)', () => {
  // Files that call the `commit` circuit synchronously (commitment.ts
  // pairingFingerprintOfSha, chain/identity.ts): a page that loads one of them may compute
  // a fingerprint as it draws, so it must wait for the circuit.
  const SYNC = ['veilcore/saved-report.ts', 'veilcore/evidence/bundle.ts', 'veilcore/chain/identity.ts'];
  // Checked by hand: the check page waits for the circuit itself when a record has a saved
  // lab report (VerifyPage.tsx); the example record uses only savedReportSentence.
  const HANDLED = ['VerifyPage', 'VerifyExample'];
  const app = read('App.tsx');
  const pages = [
    ...app.matchAll(/const (\w+) = page\(\(\) => import\('\.\/([^']+)'\), '\w+'(?:, '(wait|after)')?\);/g),
  ].map(([, name, file, circuit]) => ({ name, file, circuit }));

  it('finds every lazy page, and sees the users where they are', () => {
    expect(pages.length).toBeGreaterThanOrEqual(14);
    expect(sourceClosure('components/flow/AppHome.tsx').has('veilcore/saved-report.ts')).toBe(true);
    expect(sourceClosure('components/RecordDetail.tsx').has('veilcore/chain/identity.ts')).toBe(true);
  });

  it('the collection import is one of them, with its own title ahead of "Your plants"', () => {
    expect(pages.map((p) => p.name)).toContain('BulkImportPage');
    const at = (t: string) => app.indexOf(t);
    expect(at("[/^\\/records\\/import/, 'Date your collection']")).toBeGreaterThan(-1);
    expect(at("[/^\\/records\\/import/, 'Date your collection']")).toBeLessThan(at("[/^\\/records/, 'Your plants']"));
  });

  it('a page that does not wait loads none of the synchronous users', () => {
    for (const p of pages) {
      if (p.circuit === 'wait' || HANDLED.includes(p.name)) continue;
      const files = sourceClosure(fs.existsSync(path.join(HERE, `${p.file}.tsx`)) ? `${p.file}.tsx` : `${p.file}.ts`);
      for (const f of SYNC) expect(files.has(f), `${p.name} loads ${f}: give it circuit 'wait'`).toBe(false);
    }
  });
});

describe('fingerprints, with the circuit loaded on demand', () => {
  it('fingerprintText and the pairing fingerprint agree, as before', async () => {
    const c = await import('./veilcore/commitment');
    await c.loadFingerprintCircuit();
    const sha = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('a lab report'))),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');
    const viaText = await c.fingerprintText('a lab report');
    expect(viaText).toMatch(/^[0-9a-f]{64}$/);
    expect(c.pairingFingerprintOfSha(sha)).toBe(viaText);
  });

  it('a bad record secret still throws at once from resultRecipientFor (not later)', async () => {
    const lab = await import('./veilcore/lab-results');
    expect(() => lab.resultRecipientFor('not hex')).toThrow('not a record secret');
    await expect(lab.resultRecipientFor('3f'.repeat(32))).resolves.toMatch(/^age1/);
  });
});

// ── The built site ─────────────────────────────────────────────────────────────────────
const DIST = path.resolve(HERE, '../dist');
const built = fs.existsSync(path.join(DIST, 'index.html'));

/** Every file a chunk loads before it runs (static imports), followed through. */
const closure = (start: string[]): string[] => {
  const seen = new Set<string>();
  const todo = [...start];
  while (todo.length) {
    const f = todo.pop() as string;
    if (seen.has(f) || !fs.existsSync(path.join(DIST, f))) continue;
    seen.add(f);
    const src = fs.readFileSync(path.join(DIST, f), 'utf8');
    for (const m of src.matchAll(/\bimport\s*(?:[^"'()`;]*?\bfrom\s*)?["'](\.\/[^"']+\.js)["']/g)) {
      todo.push(path.posix.join(path.posix.dirname(f), m[1]));
    }
  }
  return [...seen];
};

describe.skipIf(!built)('the first download, in the built site (dist/)', () => {
  const html = built ? fs.readFileSync(path.join(DIST, 'index.html'), 'utf8') : '';
  const entry = [...html.matchAll(/<script type="module"[^>]*src="\/([^"]+)"/g)].map((m) => m[1]);
  const preloaded = [...html.matchAll(/rel="modulepreload"[^>]*href="\/([^"]+)"/g)].map((m) => m[1]);
  const first = closure([...entry, ...preloaded]);
  const text = (files: string[]) => files.map((f) => fs.readFileSync(path.join(DIST, f), 'utf8'));

  it('the landing page loads no WebAssembly and no Midnight code', () => {
    expect(entry).toHaveLength(1);
    for (const [i, src] of text(first).entries()) {
      expect(src, first[i]).not.toMatch(/\.wasm\b/);
      expect(src, first[i]).not.toMatch(/midnight_onchain_runtime|midnight_ledger|midnight_zkir/);
    }
  });

  it('the landing page’s scripts stay small (gzip, as served)', () => {
    const gz = text(first).reduce((n, s) => n + gzipSync(s).length, 0);
    // 213 KB on 15 October 2026 (was 586 KB plus 403 KB of WebAssembly).
    expect(gz).toBeLessThan(260 * 1024);
  });

  it('the landing page downloads English only: other languages come when chosen', () => {
    // A line each language's public pages have, and one from the record app's.
    const drafts = [ja['draft.banner'], es['draft.banner'], de['draft.banner'], fr['draft.banner']];
    const app = [appJa['app.common.pageInEnglish'], appEn['app.common.pageInEnglish']];
    for (const [i, src] of text(first).entries()) {
      for (const d of [...drafts, ...app]) expect(src.includes(String(d)), `${first[i]}: ${d}`).toBe(false);
    }
    expect(text(first).some((src) => src.includes(en['draft.banner']))).toBe(true);
  });

  it('the check page’s own file brings no WebAssembly with it', () => {
    const verify = fs.readdirSync(path.join(DIST, 'assets')).filter((f) => /^VerifyPage-.*\.js$/.test(f));
    expect(verify).toHaveLength(1);
    for (const src of text(closure([`assets/${verify[0]}`]))) expect(src).not.toMatch(/\.wasm\b/);
  });

  it('the body text and landing headings fonts are preloaded, Latin only', () => {
    const fonts = [...html.matchAll(/rel="preload" href="\/([^"]+)" as="font"/g)].map((m) => m[1]);
    expect(fonts).toHaveLength(2);
    expect(fonts[0]).toMatch(/inter-latin-400-normal-.*\.woff2$/);
    expect(fonts[1]).toMatch(/space-grotesk-latin-700-normal-.*\.woff2$/);
  });
});
