// What every browser test needs: a page that fails on any script error, no real network,
// and (when no real registry is given) a small stand-in registry in the test itself.
// SPDX-License-Identifier: Apache-2.0
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
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
