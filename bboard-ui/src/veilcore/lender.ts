// A lender's side of a claim (claims.ts), from the browser: no partner kit, no code.
//
// The lender gets one identity of its own on VeilCore's contract: a secret made here, anchored
// once (the same anchor a record's key gets), with a recovery secret beside it. From it, the
// lender proposes a claim on a holder's record (proposeObligation), sends the holder the claim
// link, and later withdraws it (not yet accepted) or releases it (repaid: discharge). Only this
// identity can do either, so its secrets go in the backup file (backup.ts, `lender`), and the
// page asks for a checked backup before anything is sent.
//
// A claim on chain is a hash of the lender's own words for the loan with a salt kept here
// (SHA-256(salt || UTF-8 words), as the partner kit's commit.obligation), never the words.
// The salt and words stay with the lender, so it can later show what a claim was for.
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react';

const KEY = 'veilcore.lender.v1';
const HEX64 = /^[0-9a-f]{64}$/;

export type LenderClaim = {
  /** The holder's record, its on-chain identity (hex). */
  readonly record: string;
  /** The record's VeilCore id, when the claim began from its check page (shown, not trusted). */
  readonly recordId?: string;
  /** The claim's commitment on chain (hex). */
  readonly claim: string;
  /** The lender's own words for the loan. Never sent. */
  readonly words: string;
  /** 32 bytes, hex. Kept to show later what the claim was for. */
  readonly salt: string;
  readonly createdAt: number;
  readonly proposeTx?: string;
  /** Taken back before the holder accepted, or released after (the transaction). */
  readonly withdrawTx?: string;
  readonly releaseTx?: string;
};

export type Lender = {
  /** The lender's name as holders will see it, in its own words (not checked). */
  readonly name: string;
  /** 32 bytes, hex. Secret: proposes and releases every claim. */
  readonly secret: string;
  /** 32 bytes, hex. Secret: takes the identity back if the first is lost or stolen. */
  readonly recoverySecret: string;
  /** commit(secret), hex: the lender's identity on chain. */
  readonly identity: string;
  readonly createdAt: number;
  readonly anchorTx?: string;
  readonly anchoredAt?: number;
  /** When a checked backup was seen to hold these secrets and every claim's salt. */
  readonly backedUpAt?: number;
  readonly claims: readonly LenderClaim[];
};

const isClaim = (v: unknown): v is LenderClaim => {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.record === 'string' &&
    HEX64.test(c.record) &&
    typeof c.claim === 'string' &&
    HEX64.test(c.claim) &&
    typeof c.words === 'string' &&
    typeof c.salt === 'string' &&
    HEX64.test(c.salt) &&
    typeof c.createdAt === 'number'
  );
};

export const isLender = (v: unknown): v is Lender => {
  if (typeof v !== 'object' || v === null) return false;
  const l = v as Record<string, unknown>;
  return (
    typeof l.name === 'string' &&
    typeof l.secret === 'string' &&
    HEX64.test(l.secret) &&
    typeof l.recoverySecret === 'string' &&
    HEX64.test(l.recoverySecret) &&
    typeof l.identity === 'string' &&
    HEX64.test(l.identity) &&
    typeof l.createdAt === 'number' &&
    Array.isArray(l.claims) &&
    l.claims.every(isClaim)
  );
};

let cache: Lender | null | undefined;
const listeners = new Set<() => void>();

const read = (): Lender | null => {
  if (cache !== undefined) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const v: unknown = raw ? JSON.parse(raw) : null;
    cache = isLender(v) ? v : null;
  } catch {
    cache = null;
  }
  return cache;
};

const write = (l: Lender | null): void => {
  cache = l;
  try {
    if (l) localStorage.setItem(KEY, JSON.stringify(l));
    else localStorage.removeItem(KEY);
  } catch {
    /* a private window: kept for this tab, and the page asks for the backup */
  }
  for (const f of listeners) f();
};

export const lender = (): Lender | null => read();

export const useLender = (): Lender | null =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    read,
  );

const randomHex = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');

const bytes = (h: string): Uint8Array<ArrayBuffer> => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

/** The claim's commitment: SHA-256(salt || UTF-8 words), the partner kit's commit.obligation. */
export const claimCommitment = async (words: string, saltHex: string): Promise<string> => {
  if (words.trim() === '') throw new Error('A claim needs words for the loan.');
  const w = new TextEncoder().encode(words);
  const s = bytes(saltHex);
  const all = new Uint8Array(s.length + w.length);
  all.set(s);
  all.set(w, s.length);
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', all));
  return Array.from(d, (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Make the lender's identity here. Its secrets exist only in this browser until a backup holds
 * them: nothing goes on chain until then. Never replaces one already made.
 */
export const makeLender = (name: string, identityOf: (secret: Uint8Array) => string, now = Date.now()): Lender => {
  const have = read();
  if (have) return have;
  const n = name.trim().slice(0, 80);
  if (!n) throw new Error('Give the name holders will see.');
  const secret = randomHex();
  const l: Lender = {
    name: n,
    secret,
    recoverySecret: randomHex(),
    identity: identityOf(bytes(secret)),
    createdAt: now,
    claims: [],
  };
  write(l);
  return l;
};

/** Change anything but the secrets and the identity they make. */
export const updateLender = (change: (l: Lender) => Lender): Lender => {
  const l = read();
  if (!l) throw new Error('No lender identity in this browser.');
  const next = change(l);
  if (next.secret !== l.secret || next.recoverySecret !== l.recoverySecret || next.identity !== l.identity)
    throw new Error('A lender identity keeps its secrets.');
  write(next);
  return next;
};

/** A new claim, kept here (with its salt) before anything is sent, so it is never lost. */
export const startClaim = async (
  record: string,
  words: string,
  recordId?: string,
  now = Date.now(),
): Promise<LenderClaim> => {
  const r = record.trim().toLowerCase();
  if (!HEX64.test(r)) throw new Error('That is not a record’s on-chain key.');
  const l = read();
  if (!l) throw new Error('No lender identity in this browser.');
  if (r === l.identity) throw new Error('A claim can’t be on your own identity.');
  const salt = randomHex();
  const c: LenderClaim = {
    record: r,
    ...(recordId ? { recordId } : {}),
    claim: await claimCommitment(words.trim(), salt),
    words: words.trim().slice(0, 200),
    salt,
    createdAt: now,
  };
  // The words the commitment was made from are the ones kept: trimmed and capped above match.
  if (c.words !== words.trim()) throw new Error('Keep the words for the loan under 200 characters.');
  updateLender((x) => ({ ...x, claims: [c, ...x.claims], backedUpAt: undefined }));
  return c;
};

export const updateClaim = (claim: string, change: (c: LenderClaim) => LenderClaim): void =>
  void updateLender((l) => ({
    ...l,
    claims: l.claims.map((c) => {
      if (c.claim !== claim) return c;
      const next = change(c);
      if (next.claim !== c.claim || next.salt !== c.salt || next.words !== c.words || next.record !== c.record)
        throw new Error('A claim keeps what it was made from.');
      return next;
    }),
  }));

/** Up to this many of one proposer's proposals can wait at once (the contract's cap). */
export const MAX_WAITING = 8;

// ---- the backup file ---------------------------------------------------------------------

export const lenderForBackup = (): Omit<Lender, 'backedUpAt'> | undefined => {
  const l = read();
  if (!l) return undefined;
  const { backedUpAt: _b, ...rest } = l;
  return rest;
};

/** True when the file holds this lender's secrets and the salt of every claim made here. */
export const lenderHeldBy = (fromFile: unknown): boolean => {
  const l = read();
  if (!l) return true;
  if (!isLender(fromFile)) return false;
  if (fromFile.secret !== l.secret || fromFile.recoverySecret !== l.recoverySecret) return false;
  const salts = new Map(fromFile.claims.map((c) => [c.claim, c.salt]));
  return l.claims.every((c) => salts.get(c.claim) === c.salt);
};

export const markLenderBackedUp = (fromFile: unknown, now = Date.now()): void => {
  if (read() && lenderHeldBy(fromFile)) updateLender((l) => ({ ...l, backedUpAt: now }));
};

/**
 * Restore: the file's lender, if this browser has none; with the same secrets, the file's
 * claims this browser doesn't have are added. A different lender here is never replaced.
 */
export const mergeLender = (fromFile: unknown, opts: { mark?: boolean } = {}): void => {
  if (!isLender(fromFile)) return;
  const here = read();
  const stamp = opts.mark !== false ? { backedUpAt: Date.now() } : {};
  if (!here) {
    const { backedUpAt: _b, ...rest } = fromFile;
    write({ ...rest, ...stamp });
    return;
  }
  if (here.secret !== fromFile.secret) return;
  const have = new Set(here.claims.map((c) => c.claim));
  const add = fromFile.claims.filter((c) => !have.has(c.claim));
  if (add.length) write({ ...here, claims: [...here.claims, ...add] });
};

/** Tests only. */
export const _resetLenderCache = (): void => {
  cache = undefined;
};
