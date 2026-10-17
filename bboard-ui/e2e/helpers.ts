// What every browser test needs: a page that fails on any script error, no real network,
// and (when no real registry is given) a small stand-in registry in the test itself.
// SPDX-License-Identifier: Apache-2.0
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { expect, type Page, type Route } from '@playwright/test';

/** The registry the build was made for (e2e:build): a real one, or the stand-in address. */
export const API = (process.env.E2E_API_BASE ?? 'http://registry.e2e.invalid').replace(/\/$/, '');
export const REAL_REGISTRY = !!process.env.E2E_API_BASE;
const SITE = `http://127.0.0.1:${process.env.E2E_PORT ?? 4317}`;

/** Collect script errors; the test fails on any at the end (`expectNoErrors`). */
export const watch = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    // A refused request (the network is blocked on purpose) is logged by the browser
    // itself; the page's own handling of it is what the tests check.
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_|ERR_FAILED/.test(m.text())) {
      errors.push(`console: ${m.text()}`);
    }
  });
  return errors;
};
export const expectNoErrors = (errors: string[]) => expect(errors, errors.join('\n')).toEqual([]);

export type Handler = (route: Route, url: URL, body: unknown) => Promise<void> | void;
export const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * Nothing leaves the machine except to the site and (if given) the real registry. The
 * Midnight network, the sponsor and fonts are refused, so a test can never spend, send or
 * depend on anything outside. Registry calls go to `handlers` (path → handler) when no real
 * registry is given; anything unhandled answers 404.
 */
export const isolate = async (page: Page, handlers: Record<string, Handler> = {}) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === SITE) return route.continue();
    if (url.origin === new URL(API).origin) {
      if (REAL_REGISTRY) return route.continue();
      const raw = route.request().postData();
      let body: unknown = undefined;
      try {
        body = raw ? JSON.parse(raw) : undefined;
      } catch {
        body = raw;
      }
      const key = `${route.request().method()} ${url.pathname.replace(/\/PR-[0-9A-F]{32}/, '/:id').replace(/\/VEIL-[0-9A-F]+/, '/:record')}`;
      const h = handlers[key];
      if (h) return h(route, url, body);
      return json(route, 404, { error: 'not in the test registry' });
    }
    return route.abort();
  });
};

// ---- a checked backup before anything is sealed and sent (sealed records round 3, L1) ----
//
// Nothing is sealed and saved on the registry under a vault key until that key is in a backup
// file the app has checked: a record made before then waits in this browser ("Not saved
// yet"), and a lab can't receive a delivery. So every test that saves does what a person
// does: save the backup file, then open it again so the app checks it.

/** On a page showing the backup step: save the file, open it again, and see the check pass. Returns the file. */
export const saveAndCheckBackup = async (page: Page): Promise<string> => {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Save backup file/ }).click();
  const file = await (await download).path();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Open my saved copy/ }).click();
  await (await chooser).setFiles(file);
  await expect(page.getByText('It works.')).toBeVisible();
  return file;
};

/** The holder key this page's browser keeps. */
export const holderKeyOf = (page: Page): Promise<string> =>
  page.evaluate(() => localStorage.getItem('veilcore.holder.v1') ?? '');

/** Wait until the real registry holds this record, sealed, for this page's holder. */
export const untilSaved = async (page: Page, recordId: string): Promise<void> => {
  const key = await holderKeyOf(page);
  await expect
    .poll(
      async () => {
        const res = await fetch(`${API}/api/records`, { headers: { 'x-holder-key': key } });
        if (!res.ok) return false;
        const rows = (await res.json()) as { id: string; sealed?: unknown }[];
        return rows.some((r) => r.id === recordId && !!r.sealed);
      },
      { timeout: 30_000 },
    )
    .toBe(true);
};

/**
 * Right after "Do the date stamp later" in the log flow: skip the DNA report, save the backup
 * and check it, and wait until the plant is saved on the registry.
 */
export const backupAfterLogging = async (page: Page, recordId: string): Promise<string> => {
  await page.getByRole('button', { name: /No report yet: skip/ }).click();
  const file = await saveAndCheckBackup(page);
  await untilSaved(page, recordId);
  return file;
};

/**
 * A lab's first code, from the home page's code box: the app makes the lab's vault key and
 * asks for a checked backup before anything is received ("Nothing was received yet"). The
 * lab saves and checks it, then uses the code again. Leaves the page at "Receive it" pressed.
 */
export const receiveWithBackupFirst = async (page: Page, code: string): Promise<string> => {
  const useCode = async () => {
    await page.getByLabel(/Someone sent you a code or link/).fill(code);
    await page.getByRole('button', { name: /^Go$/ }).click();
    await page.getByRole('button', { name: /Receive it/ }).click();
  };
  await useCode();
  await expect(page.getByText(/Save a backup and check it first, then use the code/)).toBeVisible();
  await page.goto('/backup');
  const file = await saveAndCheckBackup(page);
  await page.goto('/records');
  await useCode();
  return file;
};

// ---- sealed records, for tests that write to a real registry themselves ----------------
//
// The registry refuses a record or licence in plain text (sealed records, CONTRACT.md #4-#6).
// A test that seeds one seals it as the browser does (api-store.ts publicPart / privatePart,
// vault.ts sealRow), with node:crypto: AES-256-GCM, a 12-byte IV, the tag after the
// ciphertext, base64url, and the AAD naming the collection, the row and the key id.

/** A vault key: 32 random bytes, base64url, as vault.ts makes one. */
export const newVaultKey = (): string => randomBytes(32).toString('base64url');

/** localStorage's `veilcore.vault.v1` for a browser that holds `key`, already backed up. */
export const vaultStorageValue = (key: string): string => {
  const now = Date.now();
  return JSON.stringify({ key, createdAt: now, sealedAt: now, backedUpAt: now });
};

/** kid = first 16 hex of SHA-256("veilcore:vault-id:v1:" || key bytes). */
export const vaultKid = (key: string): string =>
  createHash('sha256')
    .update(Buffer.concat([Buffer.from('veilcore:vault-id:v1:'), Buffer.from(key, 'base64url')]))
    .digest('hex')
    .slice(0, 16);

const PUBLIC_FIELDS = [
  'id',
  'strainName',
  'profile',
  'recordFingerprint',
  'keyBinding',
  'supersededBy',
  'receivedFrom',
  'receivedFromCommitment',
  'receivedAt',
  'transferId',
  'attestation',
];

const seal = (kind: 'records' | 'licenses', id: string, value: Record<string, unknown>, key: string) => {
  const kid = vaultKid(key);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', Buffer.from(key, 'base64url'), iv);
  c.setAAD(Buffer.from(`veilcore:sealed:v1\0${kind}\0${id}\0${kid}`));
  const ct = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final(), c.getAuthTag()]);
  return { v: 1, alg: 'A256GCM', kid, iv: iv.toString('base64url'), ct: ct.toString('base64url') };
};

/** A record as PUT /api/records takes it: the public fields beside `sealed`, which holds the rest. */
export const sealedRecordRow = (r: Record<string, unknown> & { id: string }, key: string): Record<string, unknown> => {
  const open: Record<string, unknown> = {};
  const hidden: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    if (v === undefined) continue;
    if (PUBLIC_FIELDS.includes(k)) open[k] = v;
    else hidden[k] = v;
  }
  open.strainName = typeof r.strainName === 'string' ? r.strainName : '';
  const s = r.supersedes as Record<string, unknown> | undefined;
  if (s && typeof s === 'object') {
    open.supersedes = {
      recordId: s.recordId,
      ...(s.changedFields !== undefined ? { changedFields: s.changedFields } : {}),
      ...(s.effectiveAt !== undefined ? { effectiveAt: s.effectiveAt } : {}),
    };
  }
  return { ...open, sealed: seal('records', r.id, hidden, key) };
};

// ---- the stand-in registry and sealed rows ------------------------------------------------
//
// The stand-in keeps what the browser sends, as the real registry does: sealed rows it can't
// read. A test that checks what was saved opens them with the vault key it gave the browser,
// as the holder's own browser would (api-store.ts openRow and merged).

/**
 * A browser that already holds `key` in a checked backup (vault.ts), set before the site's
 * scripts run, only if this browser has no vault key yet. The backup step is taken as done,
 * so the browser seals and saves at once (round 3, L1).
 */
export const holdVaultKey = (page: Page, key: string) =>
  page.addInitScript((vault) => {
    if (!localStorage.getItem('veilcore.vault.v1')) localStorage.setItem('veilcore.vault.v1', vault);
  }, vaultStorageValue(key));

/**
 * Why the real registry would refuse this PUT /api/records body (CONTRACT.md #6: never a
 * record in plain text), or null. A stand-in answers 400 with it, as the registry does.
 */
export const plainRowRefusal = (rows: unknown): string | null => {
  if (!Array.isArray(rows)) return 'expected an array of records';
  for (const r of rows as Record<string, unknown>[]) {
    const s = r?.sealed as Record<string, unknown> | undefined;
    if (!s || s.v !== 1 || s.alg !== 'A256GCM') return `${String(r?.id)}: a record must be sealed`;
    const extra = Object.keys(r).filter(
      (k) => !PUBLIC_FIELDS.includes(k) && !['sealed', 'rev', 'supersedes'].includes(k),
    );
    if (extra.length) return `${String(r.id)}: ${extra.join(', ')} must be sealed, not sent in the clear`;
  }
  return null;
};

/**
 * A record row as the holder's browser opens it: the sealed part opened with `key` (its AAD
 * naming the row), the public fields over it. Throws for a row that isn't sealed under `key`.
 */
export const openRecordRow = <T extends { id: string }>(row: T, key: string): T & Record<string, unknown> => {
  const open: Record<string, unknown> & { id: string } = { ...(row as unknown as { id: string }) };
  const sealed = open.sealed;
  delete open.sealed;
  delete open.rev;
  const box = sealed as { v: number; alg: string; kid: string; iv: string; ct: string } | undefined;
  if (!box || box.v !== 1 || box.alg !== 'A256GCM') throw new Error(`${open.id} reached the registry unsealed`);
  const kid = vaultKid(key);
  if (box.kid !== kid) throw new Error(`${open.id} is sealed under another vault key`);
  const bytes = Buffer.from(box.ct, 'base64url');
  const d = createDecipheriv('aes-256-gcm', Buffer.from(key, 'base64url'), Buffer.from(box.iv, 'base64url'));
  d.setAAD(Buffer.from(`veilcore:sealed:v1\0records\0${open.id}\0${kid}`));
  d.setAuthTag(bytes.subarray(bytes.length - 16));
  const plain = Buffer.concat([d.update(bytes.subarray(0, bytes.length - 16)), d.final()]).toString('utf8');
  const inner = JSON.parse(plain) as Record<string, unknown>;
  delete inner.rev;
  // The full correction (reason, severity) is sealed; the row has only the pointer.
  const supersedes = inner.supersedes ?? open.supersedes;
  return { ...inner, ...open, ...(supersedes !== undefined ? { supersedes } : {}) } as T & Record<string, unknown>;
};

/** Every row opened (openRecordRow). */
export const openRecordRows = <T extends { id: string }>(rows: T[], key: string) =>
  rows.map((r) => openRecordRow(r, key));
