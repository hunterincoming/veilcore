// The licenses this browser holds as a LICENSEE: the secret behind each one, and how far it
// has got. The secret is what countersigns the license and, later, proves it is live; it is
// made here (crypto.getRandomValues), never sent anywhere, and kept in this browser and in
// the backup file (backup.ts, `heldLicenses`). Without it a license can't be activated or
// shown, so the page asks for a checked backup holding it before it activates
// (backedUpAt, set by backup.ts checkBackup).
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react';

const KEY = 'veilcore.held-licenses.v1';
const HEX64 = /^[0-9a-f]{64}$/;

export type HeldLicense = {
  readonly inviteId: string;
  /** 32 bytes, hex. Secret. */
  readonly secret: string;
  /** licenseCommit(secret, issuerRecord), hex: what the issuer issues. */
  readonly commitment: string;
  /** The issuer record's on-chain identity (origin), hex. */
  readonly identity: string;
  /** The issuer head the commitment was built against, hex: countersigning and proving name it. */
  readonly issuerRecord: string;
  /** The issuer's words for this license (from the invite). */
  readonly label: string;
  readonly acceptedAt: number;
  readonly issueTx?: string;
  readonly activateTx?: string;
  readonly activatedAt?: number;
  /** When a checked backup was seen to hold this license's secret. */
  readonly backedUpAt?: number;
};

export const isHeldLicense = (v: unknown): v is HeldLicense => {
  if (typeof v !== 'object' || v === null) return false;
  const h = v as Record<string, unknown>;
  return (
    typeof h.inviteId === 'string' &&
    typeof h.secret === 'string' &&
    HEX64.test(h.secret) &&
    typeof h.commitment === 'string' &&
    HEX64.test(h.commitment) &&
    typeof h.identity === 'string' &&
    HEX64.test(h.identity) &&
    typeof h.issuerRecord === 'string' &&
    HEX64.test(h.issuerRecord) &&
    typeof h.label === 'string' &&
    typeof h.acceptedAt === 'number'
  );
};

let cache: HeldLicense[] | null = null;
const listeners = new Set<() => void>();

const read = (): HeldLicense[] => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const all: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(all) ? all.filter(isHeldLicense) : [];
  } catch {
    cache = [];
  }
  return cache;
};

const write = (all: HeldLicense[]): void => {
  cache = all;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* a private window: this tab keeps it in memory, and the page asks for the backup */
  }
  for (const l of listeners) l();
};

export const heldLicenses = (): readonly HeldLicense[] => read();
export const heldLicense = (inviteId: string): HeldLicense | undefined => read().find((h) => h.inviteId === inviteId);

export const useHeldLicenses = (): readonly HeldLicense[] =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    read,
  );

/** A fresh license secret: 32 random bytes, hex. */
export const newLicenseSecret = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');

/** Keep a license this browser accepted. Saved before the commitment is sent, so it is never lost. */
export const keepHeldLicense = (h: HeldLicense): HeldLicense => {
  const existing = heldLicense(h.inviteId);
  if (existing) return existing; // the first secret for an invite is the one: never replaced
  write([h, ...read()]);
  return h;
};

export const updateHeldLicense = (
  inviteId: string,
  change: (h: HeldLicense) => HeldLicense,
): HeldLicense | undefined => {
  const all = [...read()];
  const i = all.findIndex((h) => h.inviteId === inviteId);
  if (i < 0) return undefined;
  const next = change(all[i]);
  // The secret, commitment and issuer never change after the accept.
  if (next.secret !== all[i].secret || next.commitment !== all[i].commitment || next.identity !== all[i].identity)
    throw new Error('A held license keeps its secret.');
  all[i] = next;
  write(all);
  return next;
};

/** Backup: what goes in the file. */
export const heldLicensesForBackup = (): HeldLicense[] => read().map(({ backedUpAt: _b, ...h }) => h);

/** Backup check: the licenses in a checked file that hold the same secret as here are marked backed up. */
export const markHeldBackedUp = (fromFile: unknown, now = Date.now()): void => {
  const inFile = new Map(
    (Array.isArray(fromFile) ? fromFile : []).filter(isHeldLicense).map((h) => [h.inviteId, h.secret]),
  );
  const all = read();
  if (!all.some((h) => inFile.get(h.inviteId) === h.secret)) return;
  write(all.map((h) => (inFile.get(h.inviteId) === h.secret ? { ...h, backedUpAt: now } : h)));
};

/** Backup check: the licenses here that the file doesn't hold (same secret). */
export const heldMissingFrom = (fromFile: unknown): HeldLicense[] => {
  const inFile = new Map(
    (Array.isArray(fromFile) ? fromFile : []).filter(isHeldLicense).map((h) => [h.inviteId, h.secret]),
  );
  return read().filter((h) => inFile.get(h.inviteId) !== h.secret);
};

/** Restore: add the file's licenses this browser doesn't have; never replaces one it has. */
export const mergeHeldLicenses = (fromFile: unknown): number => {
  const have = new Set(read().map((h) => h.inviteId));
  const add = (Array.isArray(fromFile) ? fromFile : []).filter(isHeldLicense).filter((h) => !have.has(h.inviteId));
  if (add.length) write([...add.map((h) => ({ ...h, backedUpAt: Date.now() })), ...read()]);
  return add.length;
};

/** Tests: forget the in-memory copy. */
export const resetHeldLicensesForTests = (): void => {
  cache = null;
};
