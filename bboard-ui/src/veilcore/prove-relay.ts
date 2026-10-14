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
// SPDX-License-Identifier: Apache-2.0

import { isObject, isString, isNumber, readJson } from './json';
import { newChallenge } from './chain/challenge-book';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const ASKS = 'veilcore.prove-asks.v1';
const WEEK = 7 * 24 * 60 * 60_000;
const HEX64 = /^[0-9a-f]{64}$/;
export const PROVE_ID = /^PR-[0-9A-F]{32}$/;

export type ProveRequest = {
  readonly id: string;
  readonly identity: string;
  readonly challenge: string;
  readonly asker: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly answers: readonly string[];
};

/** What this browser remembers about a request it made. */
export type MyAsk = {
  readonly id: string;
  readonly identity: string;
  readonly challenge: string;
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
  v.answers.every(isString);

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
  let res: Response;
  try {
    res = await fetch(`${BASE}/prove-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, challenge, asker: input.asker?.trim() ?? '' }),
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
    ...(input.recordId ? { recordId: input.recordId } : {}),
    ...(input.anchorTx ? { anchorTx: input.anchorTx } : {}),
    createdAt: Date.now(),
  };
  writeAsks([...readAsks(), ask]);
  return { ask, link: proveLink(ask.id) };
};

export const proveLink = (id: string): string =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/prove/${id}`;

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

/** Send the id of the holder's proveOwnership transaction back to the checker. */
export const answerProveRequest = async (id: string, txId: string): Promise<{ ok: true } | { error: string }> => {
  const t = txId.trim().toLowerCase().replace(/^0x/, '');
  if (!HEX64.test(t)) return { error: 'that is not a transaction id' };
  let res: Response;
  try {
    res = await fetch(`${BASE}/prove-requests/${id}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId: t }),
    });
  } catch {
    return { error: unreachable };
  }
  return res.ok ? { ok: true } : { error: await errorOf(res) };
};

/**
 * A refusal worth trying again: the network or the indexer was not ready, or a
 * transaction posted a moment ago has not reached the indexer yet. Anything else is a
 * verdict about that answer.
 */
export const worthRetrying = (reason: string): boolean =>
  /could not reach|could not read|try again|No such transaction|indexer answered 5|timed? ?out/i.test(reason);

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
 * that lies can make a check fail but never pass. An answer refused for a passing reason
 * (the indexer not ready yet) is left to try again.
 */
export const checkAnswers = async (ask: MyAsk, answers: readonly string[], check: AnswerCheck): Promise<MyAsk> => {
  let now = ask;
  if (now.confirmed) return now;
  for (const raw of answers) {
    const txId = raw.trim().toLowerCase().replace(/^0x/, '');
    if (now.refused?.[txId]) continue;
    const v = await check.checkOwnership({ txId, identity: ask.identity, challenge: ask.challenge });
    if (v.accepted) {
      const anchor = ask.anchorTx ? await check.checkAnchor(ask.anchorTx, ask.identity) : undefined;
      now = { ...now, confirmed: { txId, at: Date.now(), ...(anchor === undefined ? {} : { anchor }) } };
      break;
    }
    if (!worthRetrying(v.reason)) now = { ...now, refused: { ...now.refused, [txId]: v.reason } };
  }
  if (now !== ask) {
    const result = now;
    updateMyAsk(ask.id, () => result);
  }
  return now;
};
