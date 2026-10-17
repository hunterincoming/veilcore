// Round 5 in a real browser (CONTRACT.md #28, #29, #31):
//   - a check link with the holder's name after the #, and one without: the page shows the
//     name from the link, or says the holder didn't include it, and never sends it anywhere;
//   - a DNA report checked from the holder's link (its salt after the #) and the file: the
//     right file matches, another doesn't, and a link without the salt says what is missing;
//   - npm run check:site against this build, served locally with its release manifest, and
//     the site's own /check-this-site page doing the same check.
// All records and files are practice data.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, normalize } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { REAL_REGISTRY, expectNoErrors, isolate, json, watch } from './helpers';
import { writeRelease } from '../../scripts/release-manifest.mjs';
import { checkSite } from '../../scripts/check-site.mjs';

const RECORD = `VEIL-${'5E'.repeat(16)}`;
const FP = '3f'.repeat(32);
const SALT = '9c'.repeat(16) + '41'.repeat(16);
const NAME = 'Ébène Kush №5 (practice) 🌱';
const DNA_FILE = Buffer.from('Practice DNA report (test data, not a real genotype)\n');
const OTHER_FILE = Buffer.from('Another practice DNA report (test data)\n');

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');
/** H(tag, ...) of SPEC 3.6.1: SHA-256 over the zero-padded tag and 32-byte pieces. */
const H = (tag: string, ...hex: string[]) => {
  const t = Buffer.alloc(32);
  t.write(tag, 'utf8');
  return createHash('sha256')
    .update(Buffer.concat([t, ...hex.map((h) => Buffer.from(h, 'hex'))]))
    .digest('hex');
};
const BINDING = H('veilcore:v1:dnapair', sha256(DNA_FILE), FP, SALT);
const nameParam = (name: string) => Buffer.from(name, 'utf8').toString('base64url');

/** The stand-in registry's answer for the record, and every request the page made. */
const standIn = async (page: Page, answer: Record<string, unknown>) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(`${r.url()} ${r.postData() ?? ''}`));
  await isolate(page, {
    'GET /verify/:record': (route) => json(route, 200, { found: true, id: RECORD, recordFingerprint: FP, ...answer }),
  });
  return requests;
};

test.describe('the check page, round 5', () => {
  test.skip(REAL_REGISTRY, 'this uses the stand-in registry');

  test('a check link with the name after the #: shown from the link, never sent', async ({ page }) => {
    const errors = watch(page);
    const requests = await standIn(page, { disclosed: ['own'] });
    await page.goto(`/verify/${RECORD}?fp=${FP}#n=${nameParam(NAME)}`);
    const shown = page.locator('[data-holder-name]');
    // Labelled as the link's word, not checked (no salt and no name code here: a link or record
    // from before round 6), and cleaned of symbols like any typed name (display-name.ts).
    await expect(shown).toHaveText('Name given in this link (not checked): Ébène Kush №5 (practice)');
    await expect(shown).toHaveAttribute('data-name-from', 'link');
    await expect(shown).toHaveAttribute('data-name-check', 'unchecked');
    await expect(page.locator('[data-no-name]')).toHaveCount(0);
    // The fragment never leaves the browser: no request carries the name, in any form.
    for (const r of requests) {
      expect(r).not.toContain(nameParam(NAME));
      expect(decodeURIComponent(r)).not.toContain('Ébène');
    }
    expectNoErrors(errors);
  });

  test('the same link without the name: the page says the link doesn’t carry it (round 6)', async ({ page }) => {
    const errors = watch(page);
    await standIn(page, { disclosed: ['own'] });
    await page.goto(`/verify/${RECORD}?fp=${FP}`);
    await expect(page.locator('[data-no-name]')).toHaveText("This link doesn't carry the name.");
    await expect(page.locator('[data-holder-name]')).toHaveCount(0);
    await expect(page.getByText(NAME)).toHaveCount(0);
    expectNoErrors(errors);
  });

  test('a name the holder chose to show: from the registry when the link has none', async ({ page }) => {
    const errors = watch(page);
    await standIn(page, { disclosed: ['own', 'name'], cultivar: 'Shown on purpose (practice)' });
    await page.goto(`/verify/${RECORD}?fp=${FP}`);
    await expect(page.locator('[data-holder-name]')).toContainText('Shown on purpose (practice)');
    await expect(page.locator('[data-holder-name]')).toHaveAttribute('data-name-from', 'registry');
    expectNoErrors(errors);
  });

  test('a DNA report checked from the holder’s link and the file: matches, differs, no salt', async ({ page }) => {
    const errors = watch(page);
    const requests = await standIn(page, { disclosed: ['dna'], dnaPairedByHolder: true, dnaPairBinding: BINDING });
    await page.goto(`/verify/${RECORD}?fp=${FP}#n=${nameParam(NAME)}&ds=${SALT}`);
    const box = page.locator('[data-dna-check]');
    await expect(box).toHaveAttribute('data-dna-check', 'ready');
    // The file the holder saved: it matches.
    await page
      .locator('[data-dna-file]')
      .setInputFiles({ name: 'report.txt', mimeType: 'text/plain', buffer: DNA_FILE });
    await expect(page.locator('[data-dna-file-result]')).toHaveAttribute('data-dna-file-result', 'matches');
    await expect(page.locator('[data-dna-file-result]')).toContainText(
      'report.txt is the DNA report the holder saved with this record.',
    );
    // Another file: it doesn't.
    await page
      .locator('[data-dna-file]')
      .setInputFiles({ name: 'other.txt', mimeType: 'text/plain', buffer: OTHER_FILE });
    await expect(page.locator('[data-dna-file-result]')).toHaveAttribute('data-dna-file-result', 'differs');
    await expect(page.locator('[data-dna-file-result]')).toContainText(
      'other.txt is not the DNA report saved with this record.',
    );
    // Neither the salt nor the file's SHA-256 went anywhere.
    for (const r of requests) {
      expect(r).not.toContain(SALT);
      expect(r).not.toContain(sha256(DNA_FILE));
    }

    // The same record from a link without the salt: nothing to check the file against.
    await page.goto(`/verify/${RECORD}?fp=${FP}`);
    await expect(page.locator('[data-dna-check]')).toHaveAttribute('data-dna-check', 'no-salt');
    await expect(page.locator('[data-dna-file]')).toHaveCount(0);
    expectNoErrors(errors);
  });
});

/** A folder served as Vercel serves the site: a file if there is one, else the app's page. */
const serve = (dir: string): Promise<{ server: Server; url: string }> =>
  new Promise((ok) => {
    const server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
      const file = normalize(join(dir, path === '/' ? 'index.html' : path));
      const isFile = file.startsWith(dir) && existsSync(file) && !file.endsWith('/') && !path.endsWith('/');
      const type = /\.js$/.test(file)
        ? 'text/javascript'
        : /\.css$/.test(file)
          ? 'text/css'
          : /\.json$/.test(file)
            ? 'application/json'
            : /\.wasm$/.test(file)
              ? 'application/wasm'
              : /\.svg$/.test(file)
                ? 'image/svg+xml'
                : 'text/html';
      try {
        res
          .writeHead(200, { 'content-type': isFile ? type : 'text/html' })
          .end(readFileSync(isFile ? file : join(dir, 'index.html')));
      } catch {
        res.writeHead(200, { 'content-type': 'text/html' }).end(readFileSync(join(dir, 'index.html')));
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const a = server.address();
      ok({ server, url: `http://127.0.0.1:${typeof a === 'object' && a ? a.port : 0}` });
    });
  });

test.describe('check this site (CONTRACT.md #31)', () => {
  const COMMIT = 'e2e0'.repeat(10);
  let dir = '';
  let repo = '';
  let site: { server: Server; url: string } | undefined;

  test.beforeAll(async () => {
    // This build, copied, with a release manifest written as a deploy writes one.
    const built = join(process.cwd(), process.env.E2E_OUT_DIR ?? 'e2e-dist');
    dir = mkdtempSync(join(tmpdir(), 'vc-e2e-site-'));
    repo = mkdtempSync(join(tmpdir(), 'vc-e2e-repo-'));
    cpSync(built, dir, { recursive: true });
    writeRelease({ network: 'preprod', staticDir: dir, repoRoot: repo, commit: COMMIT, uncommittedChanges: false });
    site = await serve(dir);
  });
  test.afterAll(() => {
    site?.server.close();
    rmSync(dir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  });

  test('npm run check:site against the locally served build: every file matches, then a changed one is found', async () => {
    let r = await checkSite(site!.url, { repoRoot: repo });
    expect(r.code, r.lines.join('\n')).toBe(0);
    expect(r.lines.join('\n')).toMatch(/^All \d+ files match the release’s published list\.$/m);
    const index = join(dir, 'index.html');
    const before = readFileSync(index);
    writeFileSync(index, Buffer.concat([before, Buffer.from('<!-- not the released page -->')]));
    try {
      r = await checkSite(site!.url, { repoRoot: repo });
      expect(r.code).toBe(1);
      expect(r.lines.join('\n')).toMatch(/differs: \/index\.html/);
    } finally {
      writeFileSync(index, before);
    }
  });

  test('/check-this-site on that build checks every file against the list it serves', async ({ page }) => {
    const errors = watch(page);
    const origin = site!.url;
    // Only the served copy: nothing else is reached.
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    await page.goto(`${origin}/check-this-site`);
    await expect(page.locator(`[data-release="${COMMIT}"]`)).toBeVisible();
    await expect(page.getByText(/npm run check:site -- /)).toBeVisible();
    await page.locator('[data-check-from="site"]').click();
    await expect(page.locator('[data-result]')).toHaveAttribute('data-result', 'all-match', { timeout: 60_000 });
    expectNoErrors(errors);
  });
});
