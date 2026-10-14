// "Prove it" without copying codes back and forth.
//
// The checker's browser makes the challenge (ownership-check.ts, kept for a week) and
// posts it to the registry with the record's on-chain identity. The registry hands back
// a request id; the checker sends the holder one link, /prove/<id>. The holder's browser
// reads the request, proves on chain, and posts the transaction id back. The checker's
// page reads it and checks the chain itself.
//
// The registry is only a mailbox. The checker checks against the challenge and identity
// its own browser kept, never the copy the registry hands back, so the registry can make
// a check fail but never pass. No holder key is sent either way: it would tie the
// holder's account to the record's on-chain identity.
//
// Only someone with the link can answer (round 2). The checker's browser makes a random
// answer token and puts it in the link's fragment, /prove/<id>#t=<token>; browsers never
// send a fragment to a server. The registry gets only the token's SHA-256 and takes an
// answer only with the token, so someone who saw just the id can't fill the answer slots
// with junk.
// SPDX-License-Identifier: Apache-2.0

import { isObject, isString, isNumber, readJson } from './json';
import { newChallenge } from './chain/challenge-book';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const ASKS = 'veilcore.prove-asks.v1';
const WEEK = 7 * 24 * 60 * 60_000;
const HEX64 = /^[0-9a-f]{64}$/;
export const PROVE_ID = /^PR-[0-9A-F]{32}$/;
/** The answer token: 16 random bytes, base64url without padding. */
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

/** How long a transaction the network doesn't know yet is given to appear. */
export const NOT_INDEXED_GRACE_MS = 15 * 60_000;
/** Polling: every 5 seconds for 2 minutes after something new, then every 30 seconds. */
export const POLL_FAST_MS = 5_000;
export const POLL_SLOW_MS = 30_000;
export const POLL_FAST_FOR_MS = 2 * 60_000;

export type ProveAnswer = { readonly txId: string; readonly answeredAt: number };

export type ProveRequest = {
  readonly id: string;
  readonly identity: string;
  readonly challenge: string;
  readonly asker: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly answers: readonly ProveAnswer[];
};

/** What this browser remembers about a request it made. */
export type MyAsk = {
  readonly id: string;
  readonly identity: string;
  readonly challenge: string;
  /** The answer token in the link's fragment, so this browser can show the link again. */
  readonly token?: string;
  readonly recordId?: string;
  readonly anchorTx?: string;
  readonly createdAt: number;
  /** Set once an answer checks out on chain. */
  readonly confirmed?: { readonly txId: string; readonly at: number; readonly anchor?: boolean };
  /** Answers that were checked and refused, with the reason. */
  readonly refused?: Readonly<Record<string, string>>;
};

const isRequest = (v: unknown): v is ProveRequest =>
  isObject(v) &&
  isString(v.id) &&
  isString(v.identity) &&
  isString(v.challenge) &&
  isString(v.asker) &&
  isNumber(v.createdAt) &&
  isNumber(v.expiresAt) &&
  Array.isArray(v.answers) &&
  v.answers.every((a) => isObject(a) && isString(a.txId) && isNumber(a.answeredAt));

const errorOf = async (res: Response): Promise<string> => {
  const body = await readJson(res).catch(() => undefined);
  return isObject(body) && isString(body.error) ? body.error : `the registry answered ${res.status}`;
};

const unreachable = 'could not reach the VeilCore registry; check your connection and try again';

// --- this browser's own requests ------------------------------------------------------

const readAsks = (): MyAsk[] => {
  try {
    const raw = localStorage.getItem(ASKS);
    const all = raw ? (JSON.parse(raw) as MyAsk[]) : [];
    return Array.isArray(all) ? all.filter((a) => isObject(a) && isString(a.id)) : [];
  } catch {
    return [];
  }
};
const writeAsks = (all: MyAsk[], now = Date.now()): void => {
  try {
    localStorage.setItem(ASKS, JSON.stringify(all.filter((a) => now - a.createdAt <= WEEK)));
  } catch {
    /* private window: this tab still has it in memory */
  }
};

/** Requests this browser made, newest first. */
export const myAsks = (): MyAsk[] => readAsks().sort((a, b) => b.createdAt - a.createdAt);
export const myAsk = (id: string): MyAsk | undefined => readAsks().find((a) => a.id === id);
export const updateMyAsk = (id: string, change: (a: MyAsk) => MyAsk): MyAsk | undefined => {
  const all = readAsks();
  const i = all.findIndex((a) => a.id === id);
  if (i < 0) return undefined;
  all[i] = change(all[i]);
  writeAsks(all);
  return all[i];
};

// --- the answer token -----------------------------------------------------------------

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** A fresh answer token: 128 random bits. */
export const newAnswerToken = (): string => base64url(crypto.getRandomValues(new Uint8Array(16)));

/** What the registry keeps instead of the token: SHA-256 of the token's text, as hex. */
export const answerTokenHash = async (token: string): Promise<string> => {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  return Array.from(d, (b) => b.toString(16).padStart(2, '0')).join('');
};

/** The token from a link's fragment (`location.hash`, e.g. "#t=…"); undefined when it has none. */
export const tokenFromHash = (hash: string): string | undefined => {
  const t = new URLSearchParams(hash.replace(/^#/, '')).get('t') ?? '';
  return TOKEN.test(t) ? t : undefined;
};

// --- the checker ----------------------------------------------------------------------

/** Ask the holder of an on-chain identity to prove it. Returns the link to send them. */
export const askToProve = async (input: {
  identity: string;
  asker?: string;
  recordId?: string;
  anchorTx?: string;
}): Promise<{ ask: MyAsk; link: string } | { error: string }> => {
  const identity = input.identity.trim().toLowerCase();
  if (!HEX64.test(identity)) return { error: 'this link names no on-chain identity to check' };
  const challenge = newChallenge(Date.now(), { lasting: true });
  const token = newAnswerToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}/prove-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity,
        challenge,
        answerTokenHash: await answerTokenHash(token),
        asker: input.asker?.trim() ?? '',
      }),
    });
  } catch {
    return { error: unreachable };
  }
  if (!res.ok) return { error: await errorOf(res) };
  const body = await readJson(res).catch(() => undefined);
  if (!isObject(body) || !isString(body.id) || !PROVE_ID.test(body.id)) {
    return { error: 'unexpected response from the registry' };
  }
  const ask: MyAsk = {
    id: body.id,
    identity,
    challenge,
    token,
    ...(input.recordId ? { recordId: input.recordId } : {}),
    ...(input.anchorTx ? { anchorTx: input.anchorTx } : {}),
    createdAt: Date.now(),
  };
  writeAsks([...readAsks(), ask]);
  return { ask, link: proveLink(ask.id, token) };
};

/** The holder's link. The token rides in the fragment, which is never sent to a server. */
export const proveLink = (id: string, token?: string): string =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/prove/${id}${token ? `#t=${token}` : ''}`;

// --- both sides -----------------------------------------------------------------------

/** The request as the registry has it; null when it is unknown or expired. */
export const getProveRequest = async (id: string): Promise<ProveRequest | null | { error: string }> => {
  if (!PROVE_ID.test(id)) return null;
  let res: Response;
  try {
    res = await fetch(`${BASE}/prove-requests/${id}`, { cache: 'no-store' });
  } catch {
    return { error: unreachable };
  }
  if (res.status === 404) return null;
  if (!res.ok) return { error: await errorOf(res) };
  const body = await readJson(res).catch(() => undefined);
  if (!isRequest(body) || body.id !== id) return { error: 'unexpected response from the registry' };
  return body;
};

// --- the holder -----------------------------------------------------------------------

/**
 * Send the id of the holder's proveOwnership transaction back to the checker, with the
 * token from the link's fragment (tokenFromHash).
 */
export const answerProveRequest = async (
  id: string,
  txId: string,
  token: string,
): Promise<{ ok: true } | { error: string }> => {
  const t = txId.trim().toLowerCase().replace(/^0x/, '');
  if (!HEX64.test(t)) return { error: 'that is not a transaction id' };
  if (!TOKEN.test(token)) return { error: 'the link is missing its last part; open the whole link you were sent' };
  let res: Response;
  try {
    res = await fetch(`${BASE}/prove-requests/${id}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId: t, token }),
    });
  } catch {
    return { error: unreachable };
  }
  return res.ok ? { ok: true } : { error: await errorOf(res) };
};

/**
 * A refusal worth trying again: the network or the indexer was not ready. Anything else
 * is a verdict about that answer, except "No such transaction" (notIndexedYet).
 */
export const worthRetrying = (reason: string): boolean =>
  /could not reach|could not read|try again|indexer answered 5|timed? ?out/i.test(reason);

/** The network doesn't know the transaction (yet): fine just after it was sent, not for long. */
export const notIndexedYet = (reason: string): boolean => /No such transaction/i.test(reason);

export const NEVER_APPEARED =
  'The network still has no such transaction, 15 minutes after the answer came in. It may not be real.';

/**
 * When to look again: every 5 seconds for 2 minutes after `since` (the watch started, or
 * a new answer came in), then every 30 seconds. Null once the request has expired.
 */
export const nextPollMs = (since: number, now: number, expiresAt: number): number | null =>
  now >= expiresAt ? null : now - since < POLL_FAST_FOR_MS ? POLL_FAST_MS : POLL_SLOW_MS;

export type AnswerCheck = {
  readonly checkOwnership: (input: {
    txId: string;
    identity: string;
    challenge: string;
  }) => Promise<{ accepted: boolean; reason: string }>;
  readonly checkAnchor: (txId: string, identity: string) => Promise<boolean>;
};

/**
 * Check the answers the registry holds for one of this browser's requests, and return
 * the request as it now stands (also saved). Each answer is checked against the
 * challenge and identity this browser kept, never the registry's copy, so a registry
 * that lies can make a check fail but never pass. Each answer is checked at most once a
 * call (the caller calls once per poll). An answer refused for a passing reason (the
 * indexer not reachable) is left to try again; one the network doesn't know is given 15
 * minutes from when it came in (answeredAt), then refused.
 */
export const checkAnswers = async (
  ask: MyAsk,
  answers: readonly ProveAnswer[],
  check: AnswerCheck,
  clock: () => number = Date.now,
): Promise<MyAsk> => {
  let now = ask;
  if (now.confirmed) return now;
  const seen = new Set<string>();
  for (const a of answers) {
    const txId = a.txId.trim().toLowerCase().replace(/^0x/, '');
    if (seen.has(txId) || now.refused?.[txId]) continue;
    seen.add(txId);
    const v = await check.checkOwnership({ txId, identity: ask.identity, challenge: ask.challenge });
    if (v.accepted) {
      const anchor = ask.anchorTx ? await check.checkAnchor(ask.anchorTx, ask.identity) : undefined;
      now = { ...now, confirmed: { txId, at: clock(), ...(anchor === undefined ? {} : { anchor }) } };
      break;
    }
    if (notIndexedYet(v.reason)) {
      if (clock() - a.answeredAt > NOT_INDEXED_GRACE_MS)
        now = { ...now, refused: { ...now.refused, [txId]: NEVER_APPEARED } };
    } else if (!worthRetrying(v.reason)) now = { ...now, refused: { ...now.refused, [txId]: v.reason } };
  }
  if (now !== ask) {
    const result = now;
    updateMyAsk(ask.id, () => result);
  }
  return now;
};
