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
  /**
   * This side's public key for the deal (deal.ts), hex: also its nonce for the read-aloud code
   * (license-invites.ts licenseCode), so the code covers it.
   */
  readonly licenseeNonce: string;
  /** The secret half of that key: signs this side's messages and opens the deal's channel. Secret. */
  readonly partySecret?: string;
  /** The agreement as the issuer sent it, checked against its fingerprint (deal messages, 'terms'). */
  readonly agreement?: AgreementCopy;
  /** When this side signed its agreement to those terms. */
  readonly agreedAt?: number;
  /** The issuer's nonce, the first one this browser saw. */
  readonly issuerNonce?: string;
  /** The issuer's words for this license (from the invite). */
  readonly label: string;
  readonly acceptedAt: number;
  readonly issueTx?: string;
  readonly activateTx?: string;
  readonly activatedAt?: number;
  /** When a checked backup was seen to hold this license's secret. */
  readonly backedUpAt?: number;
  /**
   * Taken over from its previous holder (hand-on.ts), not issued new: it goes live when the
   * licensor approves the move, with no activation from this side.
   */
  readonly handOn?: boolean;
  /** This side handed the license on: the proposal it sent (proposeTransfer), and to whom. */
  readonly handOnTx?: string;
  readonly handOnTo?: string;
  readonly handOnCommitment?: string;
  /**
   * Seen on chain that the license moved to the commitment the licensor named in its 'handon':
   * set when this device didn't send the proposal itself (another device, an older backup).
   */
  readonly handedOnSeenAt?: number;
};

/** What the licensee sees and agrees to: enough to recompute the agreement's fingerprint. */
export type AgreementCopy = {
  readonly type: string;
  readonly terms: Record<string, unknown>;
  readonly recordFingerprint: string;
  readonly agreementSalt: string;
  readonly agreementFingerprint: string;
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
    typeof h.licenseeNonce === 'string' &&
    HEX64.test(h.licenseeNonce) &&
    (h.partySecret === undefined || (typeof h.partySecret === 'string' && HEX64.test(h.partySecret))) &&
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
  if (
    next.secret !== all[i].secret ||
    next.commitment !== all[i].commitment ||
    next.identity !== all[i].identity ||
    next.licenseeNonce !== all[i].licenseeNonce ||
    next.partySecret !== all[i].partySecret ||
    (all[i].issuerNonce !== undefined && next.issuerNonce !== all[i].issuerNonce)
  )
    throw new Error('A held license keeps its secret, and the nonces its code was made with.');
  all[i] = next;
  write(all);
  return next;
};

/** Backup: what goes in the file. */
export const heldLicensesForBackup = (): HeldLicense[] => read().map(({ backedUpAt: _b, ...h }) => h);

/** Backup check: the licenses in a checked file that hold the same secret as here are marked backed up. */
export const markHeldBackedUp = (fromFile: unknown, now = Date.now()): void => {
  const inFile = new Map(
    (Array.isArray(fromFile) ? fromFile : [])
      .filter(isHeldLicense)
      .map((h) => [h.inviteId, `${h.secret}:${h.partySecret ?? ''}`]),
  );
  const both = (h: HeldLicense) => `${h.secret}:${h.partySecret ?? ''}`;
  const all = read();
  if (!all.some((h) => inFile.get(h.inviteId) === both(h))) return;
  write(all.map((h) => (inFile.get(h.inviteId) === both(h) ? { ...h, backedUpAt: now } : h)));
};

/** Backup check: the licenses here that the file doesn't hold (same secret). */
export const heldMissingFrom = (fromFile: unknown): HeldLicense[] => {
  const inFile = new Map(
    (Array.isArray(fromFile) ? fromFile : []).filter(isHeldLicense).map((h) => [h.inviteId, h.secret]),
  );
  return read().filter((h) => inFile.get(h.inviteId) !== h.secret);
};

/** Restore: add the file's licenses this browser doesn't have; never replaces one it has. */
export const mergeHeldLicenses = (fromFile: unknown, opts: { mark?: boolean } = {}): number => {
  const have = new Set(read().map((h) => h.inviteId));
  const add = (Array.isArray(fromFile) ? fromFile : []).filter(isHeldLicense).filter((h) => !have.has(h.inviteId));
  const stamp = (h: HeldLicense): HeldLicense => {
    if (opts.mark !== false) return { ...h, backedUpAt: Date.now() };
    const rest: Record<string, unknown> = { ...h };
    delete rest.backedUpAt;
    return rest as HeldLicense;
  };
  if (add.length) write([...add.map(stamp), ...read()]);
  return add.length;
};

/** Tests: forget the in-memory copy. */
export const resetHeldLicensesForTests = (): void => {
  cache = null;
};
