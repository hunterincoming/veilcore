// A record's own timestamps, in seconds (veilcore-api lineage/record-stamps.mjs, 19 Nov 2026).
//
// The moment the registry takes a record's proof code it asks one or more Time Stamping
// Authorities (RFC 3161) for a token on that proof code: the 32 raw bytes, as the SDK stamps a
// record commitment (SPEC 3.2, anchor kind `rfc3161`). GET /proof/:commitment/instant serves
// them. This module:
//   - checks every token here, in the browser, against the proof code it is asked about
//     (veilcore-records verifyTimestampToken: imprint, signature, time-stamping key usage); a
//     token that doesn't check is dropped, never shown;
//   - takes the time from the token itself, not from the registry's answer;
//   - names the TSA by the address the registry says it asked (its host), as the authority
//     pack names a batch's TSA. Who issued the TSA's certificate is not checked here.
// What a token shows: the proof code existed by that time, nothing earlier. The Midnight date
// still comes with the record's batch.
//
// An older registry has no such route (404): nothing is shown, and nothing else changes.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { timestampTokenBytes, verifyTimestampToken } from 'veilcore-records';
import { isObject, isString } from './json';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const HEX64 = /^[0-9a-f]{64}$/;

export type InstantToken = {
  /** The TSA's host, as the registry names the address it asked. */
  readonly tsa: string;
  /** The time the token states (RFC 3339, UTC), read from the checked token. */
  readonly at: string;
  /** What the operator states for this TSA (eIDAS, JP-MIC), if anything. */
  readonly qualified?: string;
};
export type InstantState =
  | { readonly status: 'none' }
  | { readonly status: 'asking' }
  | { readonly status: 'stamped'; readonly tokens: readonly InstantToken[]; readonly stillAsking: boolean };

const hostOf = (u: string): string => {
  try {
    return new URL(u).host;
  } catch {
    return '';
  }
};

const bytesOf = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

/** The answer for one proof code, every token checked here first. Never throws. */
export const instantStampFor = async (commitment?: string, fetchImpl: typeof fetch = fetch): Promise<InstantState> => {
  if (!commitment || !HEX64.test(commitment)) return { status: 'none' };
  let res: Response;
  try {
    res = await fetchImpl(`${BASE}/proof/${commitment}/instant`, { cache: 'no-store' });
  } catch {
    return { status: 'none' };
  }
  if (res.status === 202) return { status: 'asking' };
  if (!res.ok) return { status: 'none' };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { status: 'none' };
  }
  if (!isObject(body) || body.status !== 'stamped' || !Array.isArray(body.tokens)) return { status: 'none' };
  const stamped = bytesOf(commitment);
  const tokens: InstantToken[] = [];
  for (const t of body.tokens.slice(0, 5)) {
    if (!isObject(t) || t.kind !== 'rfc3161' || !isString(t.token) || !isString(t.tsa)) continue;
    try {
      const der = timestampTokenBytes(t.token);
      if (!der) continue;
      const v = await verifyTimestampToken(der, stamped);
      if (!v.ok || !v.genTime) continue;
      const tsa = hostOf(t.tsa);
      if (!tsa || tokens.some((x) => x.tsa === tsa)) continue;
      const q = isObject(t.qualified) && isString(t.qualified.scheme) ? t.qualified.scheme : undefined;
      tokens.push({ tsa, at: v.genTime, ...(q ? { qualified: q } : {}) });
    } catch {
      /* not a token this page can check: not shown */
    }
  }
  if (tokens.length === 0) return { status: 'none' };
  tokens.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return { status: 'stamped', tokens, stillAsking: typeof body.stillAsking === 'number' && body.stillAsking > 0 };
};

/** How long a page keeps asking while a token is on its way: about a minute. */
const ASK_EVERY_MS = 3_000;
const ASK_TIMES = 20;

/**
 * The record's own timestamps, for a page: asked once, then again every few seconds while the
 * registry is still asking a TSA, for about a minute. `undefined` while the first answer is out.
 */
export const useInstantStamp = (commitment?: string): InstantState | undefined => {
  const [state, setState] = useState<InstantState | undefined>(undefined);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState(undefined);
    let n = 0;
    const ask = async () => {
      const s = await instantStampFor(commitment);
      if (!live) return;
      setState(s);
      const more = s.status === 'asking' || (s.status === 'stamped' && s.stillAsking);
      if (more && ++n < ASK_TIMES) timer = setTimeout(() => void ask(), ASK_EVERY_MS);
    };
    if (commitment) void ask();
    else setState({ status: 'none' });
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [commitment]);
  return state;
};
