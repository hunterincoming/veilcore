// A read-only look at the network when the app opens: has anything happened to a record that
// this browser didn't do? (Recovery plan v2, step 1.)
//
// For each record this browser holds and has date stamped, on this build's network and contract,
// it reads from the contract's current state (one read of the whole state, through the same
// relay the site reads Midnight with) and compares with what this browser expects:
//   recoveryOf  the recovery commitment: the one this browser's recovery secret makes, when it
//               keeps one (record-keys.ts NO_RECOVERY_SECRET: none to compare);
//   headOf      no entry: this site never moves a record to a new key;
//   rotationsOf and recoveriesOf  both 0, for the same reason.
// Anything else is shown on the record and on Home in plain words, with what to do. Nothing is
// sent: no transaction, no holder key, and no record is named to anyone (the whole state is read,
// never one record). At most one read per MIN_GAP_MS, kept for the tab's session.
//
// What it can't see: someone who also changed this browser's storage to match. Typing the
// recovery sheet (a later step) checks against the sheet itself.
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react';
import { NETWORK } from '../config/network';
import { allKeys, hasRecoverySecret, hexBytes, type RecordKeys } from './record-keys';
import { holderRequestsPaused } from './holder-guard';

const HEX64 = /^[0-9a-f]{64}$/;
const norm = (h: unknown): string => (typeof h === 'string' ? h.trim().toLowerCase().replace(/^0x/, '') : '');
const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

// ---- what the chain says, and what this browser expects --------------------------------------

/** One record's entries in the contract's state now. */
export type ChainView = {
  /** recoveryOf has the record: it was date stamped. */
  readonly anchored: boolean;
  /** recoveryOf's value, hex. */
  readonly recovery?: string;
  /** headOf's value, hex, when the record was moved to a new key. */
  readonly head?: string;
  readonly rotations: number;
  readonly recoveries: number;
};

/** What this browser expects of a record it date stamped. */
export type Expected = {
  /** The record's on-chain identity, as saved when its stamp landed. */
  readonly identity: string;
  /** The recovery commitment its recovery secret makes; undefined when none is kept here. */
  readonly recovery?: string;
};

/**
 * What changed, most serious first:
 *   recovered          its recovery secret was used to move it to a new key;
 *   moved              it was moved to a new key (rotated);
 *   recovery-replaced  its recovery commitment is not the one this browser's secret makes.
 */
export type Change = 'recovered' | 'moved' | 'recovery-replaced';

/**
 * Compare a record's view on chain with what this browser expects. [] when they agree;
 * 'unknown' when the chain doesn't have the record (a wrong network or an indexer behind: not a
 * change anyone made, since nothing can take a record off the chain).
 */
export const compareRecord = (e: Expected, v: ChainView): readonly Change[] | 'unknown' => {
  if (!v.anchored) return 'unknown';
  const out: Change[] = [];
  const identity = norm(e.identity);
  if (v.recoveries > 0) out.push('recovered');
  else if (v.rotations > 0 || (v.head !== undefined && norm(v.head) !== identity)) out.push('moved');
  // A recovery installs a new recovery commitment by design: said once, as "recovered".
  if (!out.includes('recovered') && e.recovery !== undefined && norm(v.recovery) !== norm(e.recovery))
    out.push('recovery-replaced');
  return out;
};

type MapLike<V> = { member(k: Uint8Array): boolean; lookup(k: Uint8Array): V };
type CounterLike = { read(): bigint };
/** The parts of VeilCore's ledger this reads (contract/src/managed/veilcore ledger). */
export type LedgerLike = {
  readonly recoveryOf: MapLike<Uint8Array>;
  readonly headOf: MapLike<Uint8Array>;
  readonly rotationsOf: MapLike<CounterLike>;
  readonly recoveriesOf: MapLike<CounterLike>;
};

/** One record's view in a ledger. */
export const viewOf = (l: LedgerLike, identity: string): ChainView => {
  const k = hexBytes(norm(identity));
  const count = (m: MapLike<CounterLike>): number => (m.member(k) ? Number(m.lookup(k).read()) : 0);
  const anchored = l.recoveryOf.member(k);
  return {
    anchored,
    ...(anchored ? { recovery: toHex(l.recoveryOf.lookup(k)) } : {}),
    ...(l.headOf.member(k) ? { head: toHex(l.headOf.lookup(k)) } : {}),
    rotations: count(l.rotationsOf),
    recoveries: count(l.recoveriesOf),
  };
};

/** The same view, the same text: a seen warning stays seen only while nothing more changes. */
export const viewPrint = (v: ChainView): string =>
  JSON.stringify([v.recovery ?? '', v.head ?? '', v.rotations, v.recoveries]);

// ---- which records ----------------------------------------------------------------------------

/** The records this browser date stamped on this network and contract. */
export const stampedHere = (keys: readonly RecordKeys[], network: string, contract: string | undefined): RecordKeys[] =>
  keys.filter(
    (k) =>
      !!k.anchor &&
      k.anchor.network === network &&
      !!contract &&
      norm(k.anchor.contractAddress) === norm(contract) &&
      HEX64.test(norm(k.anchor.identity)),
  );

// ---- the findings, kept for the tab's session ---------------------------------------------------

export type Finding = { readonly recordId: string; readonly changes: readonly Change[]; readonly print: string };

type Session = {
  /** When the chain was last asked (answered or not). */
  readonly at: number;
  /** When it last answered; undefined if it never has this session. */
  readonly checkedAt?: number;
  readonly network: string;
  readonly contract: string;
  /** Identities the last answer covered. */
  readonly checked: readonly string[];
  readonly found: Readonly<Record<string, Finding>>;
};

const SESSION_KEY = 'veilcore.record-watch.v1';
const SEEN_KEY = 'veilcore.record-watch.seen.v1';

/** At most one read of the chain in this long, per tab. */
export const MIN_GAP_MS = 10 * 60_000;
/** A session's answer is asked again after this long, even with nothing new to check. */
export const FRESH_MS = 60 * 60_000;

const CHANGES: readonly Change[] = ['recovered', 'moved', 'recovery-replaced'];
const isFinding = (v: unknown): v is Finding => {
  if (typeof v !== 'object' || v === null) return false;
  const f = v as Record<string, unknown>;
  return (
    typeof f.recordId === 'string' &&
    typeof f.print === 'string' &&
    Array.isArray(f.changes) &&
    f.changes.length > 0 &&
    f.changes.every((c) => CHANGES.includes(c as Change))
  );
};

const readSession = (): Session | undefined => {
  try {
    const v = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Session | null;
    if (!v || typeof v.at !== 'number' || typeof v.found !== 'object' || v.found === null) return undefined;
    const found: Record<string, Finding> = {};
    for (const [id, f] of Object.entries(v.found)) if (isFinding(f) && f.recordId === id) found[id] = f;
    return { ...v, checked: Array.isArray(v.checked) ? v.checked : [], found };
  } catch {
    return undefined;
  }
};

const writeSession = (s: Session): void => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* kept in memory for this page */
  }
};

const readSeen = (): Record<string, string> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}');
    return typeof v === 'object' && v !== null && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'))
      : {};
  } catch {
    return {};
  }
};

let session: Session | undefined;
let seen: Record<string, string> = {};
let shown: readonly Finding[] = [];
const listeners = new Set<() => void>();

const recompute = (): void => {
  const found = session ? Object.values(session.found) : [];
  const next = found.filter((f) => seen[f.recordId] !== f.print);
  const same = next.length === shown.length && next.every((f, i) => f === shown[i]);
  if (!same) shown = next;
  listeners.forEach((l) => l());
};

const load = (): void => {
  session = readSession();
  seen = readSeen();
  recompute();
};
if (typeof window !== 'undefined') load();

/**
 * "I did this myself": this warning goes for this record until something more changes on chain
 * (a different view). Kept in this browser only.
 */
export const markSeen = (recordId: string): void => {
  const f = session?.found[recordId];
  if (!f) return;
  seen = { ...readSeen(), [recordId]: f.print };
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* seen for this page only */
  }
  recompute();
};

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** React: the records with something on chain this browser didn't do, not yet marked seen. */
export const useRecordChanges = (): readonly Finding[] =>
  useSyncExternalStore(
    subscribe,
    () => shown,
    () => shown,
  );

// ---- reading the chain ---------------------------------------------------------------------------

export type WatchDeps = {
  readonly keys?: () => readonly RecordKeys[];
  readonly network?: string;
  readonly contract?: string;
  /** The contract's whole state now. */
  readonly read?: () => Promise<LedgerLike>;
  /** In place of `read`: one record's view (the end-to-end build's stand-in, e2e-chain.ts). */
  readonly viewFor?: (identity: string, expectedRecovery?: string) => ChainView | null;
  /** The recovery commitment a recovery secret makes (chain/identity.ts). */
  readonly recoveryOf?: (recoverySecret: string) => string | Promise<string>;
  readonly now?: () => number;
};

const defaultRecoveryOf = async (secret: string): Promise<string> => {
  const { recoveryCommitmentOf, toHex: hex } = await import('./chain/identity');
  return hex(recoveryCommitmentOf(hexBytes(secret)));
};

/**
 * Compare every record stamped here with the chain now. The findings replace the session's.
 * Returns them, or undefined when the chain didn't answer (nothing shown, nothing changed).
 */
export const checkRecordsNow = async (deps: WatchDeps): Promise<Record<string, Finding> | undefined> => {
  const now = (deps.now ?? Date.now)();
  const network = deps.network ?? NETWORK;
  const contract = norm(deps.contract);
  const mine = stampedHere((deps.keys ?? allKeys)(), network, contract);
  const prior = session;
  const asked: Session = {
    at: now,
    ...(prior?.checkedAt !== undefined ? { checkedAt: prior.checkedAt } : {}),
    network,
    contract,
    checked: prior?.checked ?? [],
    found: prior?.found ?? {},
  };
  session = asked;
  writeSession(asked);
  if (mine.length === 0) {
    session = { ...asked, checkedAt: now, checked: [], found: {} };
    writeSession(session);
    recompute();
    return {};
  }
  let view: (identity: string, expected?: string) => ChainView | null;
  try {
    if (deps.viewFor) view = deps.viewFor;
    else if (deps.read) {
      const l = await deps.read();
      view = (id) => viewOf(l, id);
    } else return undefined;
  } catch {
    return undefined;
  }
  const found: Record<string, Finding> = {};
  for (const k of mine) {
    const identity = norm(k.anchor?.identity);
    let recovery: string | undefined;
    try {
      recovery = hasRecoverySecret(k.recoverySecret)
        ? norm(await (deps.recoveryOf ?? defaultRecoveryOf)(k.recoverySecret))
        : undefined;
    } catch {
      recovery = undefined;
    }
    let v: ChainView | null;
    try {
      v = view(identity, recovery);
    } catch {
      v = null;
    }
    if (!v) continue;
    const c = compareRecord({ identity, ...(recovery ? { recovery } : {}) }, v);
    if (c !== 'unknown' && c.length > 0) found[k.recordId] = { recordId: k.recordId, changes: c, print: viewPrint(v) };
  }
  session = { ...asked, checkedAt: now, checked: mine.map((k) => norm(k.anchor?.identity)), found };
  writeSession(session);
  recompute();
  return found;
};

/** Whether it's time to ask the chain again, given the session so far. */
export const dueNow = (
  s: Session | undefined,
  identities: readonly string[],
  ctx: { network: string; contract: string; now: number },
): boolean => {
  if (!s || s.network !== ctx.network || s.contract !== ctx.contract) return true;
  if (ctx.now - s.at < MIN_GAP_MS) return false;
  if (s.checkedAt === undefined || ctx.now - s.checkedAt >= FRESH_MS) return true;
  const had = new Set(s.checked);
  return identities.some((i) => !had.has(i));
};

let running: Promise<unknown> | undefined;

/**
 * On every app page (App.tsx): ask the chain if it's due. Never on a check or prove page, never
 * offline or in a hidden tab, and only in a build that reads this network. Never throws.
 */
export const startRecordWatch = (): void => {
  if (typeof window === 'undefined' || running) return;
  if (holderRequestsPaused()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  running = (async () => {
    const { REAL_CHAIN, CHAIN_CONTRACT, INDEXER_HTTP, INDEXER_WS } = await import('./chain/config');
    const { e2eChain } = await import('./chain/e2e-chain');
    const stub = e2eChain()?.watch;
    // The end-to-end build never reads a real network: only its stand-in, when a test sets one.
    if (import.meta.env.VITE_E2E_FIXTURES === '1' && !stub) return;
    if (!stub && (!REAL_CHAIN || !CHAIN_CONTRACT || !INDEXER_HTTP || !INDEXER_WS)) return;
    const contract = norm(CHAIN_CONTRACT);
    const ids = stampedHere(allKeys(), NETWORK, contract).map((k) => norm(k.anchor?.identity));
    if (!dueNow(readSession() ?? session, ids, { network: NETWORK, contract, now: Date.now() })) return;
    await checkRecordsNow({
      contract,
      ...(stub
        ? { viewFor: stub }
        : {
            read: async () => {
              const { latestLedger } = await import('./license-invites');
              const l: LedgerLike = await latestLedger();
              return l;
            },
          }),
    });
  })()
    .catch(() => undefined)
    .finally(() => {
      running = undefined;
    });
};

/** Tests only. */
export const __resetRecordWatchForTests = (): void => {
  session = undefined;
  seen = {};
  shown = [];
  running = undefined;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SEEN_KEY);
  } catch {
    /* no storage in this test */
  }
};
