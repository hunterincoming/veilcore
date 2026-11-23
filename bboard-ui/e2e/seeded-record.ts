// One plant record a holder already has, for tests that look at a record's own pages (/record/:id,
// /prove/:id) without making one first: sealed under a vault key this browser holds, served by the
// stand-in registry, its proof code the real fingerprint of what it says.
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from 'node:crypto';
import type { Page } from '@playwright/test';
import { canonicalise } from 'veilcore-records';
import { holdVaultKey, json, newVaultKey, sealedRecordRow, type Handler } from './helpers';

export type SeededRecord = {
  id: string;
  /** The stand-in registry's answers for a holder with this one record. */
  handlers: Record<string, Handler>;
  /** Before the page loads: this browser holds the record's vault key, and is a breeder's. */
  hold: (page: Page) => Promise<void>;
};

export const seededRecord = (): SeededRecord => {
  const vault = newVaultKey();
  const holder = randomBytes(32).toString('hex');
  const id = `VEIL-${randomBytes(16).toString('hex').toUpperCase()}`;
  const committed = {
    breedingMethod: '',
    bredBy: 'Test Breeder (test data)',
    dateCreated: '2026-10-01',
    loggedAt: Date.UTC(2026, 9, 2, 10),
    nonce: randomBytes(16).toString('hex'),
    notes: 'Practice record (test data)',
    parents: [],
    photoFingerprints: [],
    refId: '',
    strainName: 'Blue Window',
  };
  const recordFingerprint = createHash('sha256').update(canonicalise(committed)).digest('hex');
  const rows = [sealedRecordRow({ id, ...committed, recordFingerprint }, vault)];
  return {
    id,
    handlers: {
      'GET /api/records': (route) => json(route, 200, rows),
      'PUT /api/records': (route) => json(route, 200, { ok: true }),
      'GET /api/licenses': (route) => json(route, 200, []),
      'GET /api/disclosures': (route) => json(route, 200, []),
      'GET /transfers/sent': (route) => json(route, 200, { transfers: [] }),
    },
    hold: async (page) => {
      await page.addInitScript((h) => {
        localStorage.setItem('veilcore.holder.v1', h);
        localStorage.setItem('veilcore.role.v1', 'breeder');
      }, holder);
      await holdVaultKey(page, vault);
    },
  };
};
