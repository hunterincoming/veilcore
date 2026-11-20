// A record's own timestamps, in seconds (veilcore-api lineage/record-stamps.mjs, 19 Nov 2026).
//
// The moment the registry takes a record's proof code it asks one or more Time Stamping
// Authorities (RFC 3161) for a token on that proof code: the 32 raw bytes, as the SDK stamps a
// record commitment (SPEC 3.2, anchor kind `rfc3161`). GET /proof/:commitment/instant serves
// them. This module shows a token only when this page can say who signed it:
//   - it checks the token here against the proof code it is asked about (veilcore-records
//     verifyTimestampToken: imprint, signature, time-stamping key usage);
//   - it keeps it only when the certificate that signed it is one this site pins
//     (config/tsa-pins.json, by the SHA-256 of the certificate; scripts/tsa-signer.mjs finds the
//     signing certificate exactly as the check does). Security review of PR #145, TSA-1: without
//     the pin, a registry that lied could sign with a certificate of its own making, name it
//     after any authority and pick any time. With no pins, nothing is shown;
//   - the name is the pin file's, the time the token's own; nothing comes from the registry's
//     words about the token (not its address, not its "qualified" label: TSA-6);
//   - one token per pinned certificate (TSA-5), and when the authorities' times are more than
//     five minutes apart, the page says they disagree and leads with none of them.
// What a token shows: the proof code existed by that time, nothing earlier. The Midnight date
// still comes with the record's batch.
//
// An older registry has no such route (404): nothing is shown, and nothing else changes.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { timestampTokenBytes, verifyTimestampToken } from 'veilcore-records';
import { isObject, isString } from './json';
import { isPinFile, pinOf, stripCertificates, type TsaPin } from '../../../scripts/tsa-signer.mjs';
import pinFile from '../config/tsa-pins.json';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const HEX64 = /^[0-9a-f]{64}$/;
/** Timestamps from different authorities further apart than this disagree (TSA-5). */
export const DISAGREE_MS = 5 * 60_000;

/**
 * Only in the end-to-end build (package.json e2e:build sets VITE_E2E_FIXTURES=1): a pin the
 * browser test puts in this browser for its own local TSA. The condition is a constant in every
 * other build, so this is not in the site's code at all.
 */
const e2ePins = (): TsaPin[] => {
  if (import.meta.env.VITE_E2E_FIXTURES !== '1') return [];
  try {
    const v: unknown = JSON.parse(localStorage.getItem('veilcore.e2e.tsa-pins') ?? 'null');
    return isPinFile(v) ? v.pins : [];
  } catch {
    return [];
  }
};

/** The pinned signing certificates (config/tsa-pins.json); none when the file is not well formed. */
export const TSA_PINS: readonly TsaPin[] = [...(isPinFile(pinFile) ? pinFile.pins : []), ...e2ePins()];

export type InstantToken = {
  /** The authority's name, from the pin file. */
  readonly tsa: string;
  /** The time the token states (RFC 3339, UTC), read from the checked token. */
  readonly at: string;
};
export type InstantState =
  | { readonly status: 'none' }
  | { readonly status: 'asking' }
  | {
      readonly status: 'stamped';
      readonly tokens: readonly InstantToken[];
      readonly stillAsking: boolean;
      /** The authorities' times are more than DISAGREE_MS apart: no headline (TSA-5). */
      readonly disagree: boolean;
    };

/**
 * A token's time is within its pinned certificate's life (`notBefore` to `validUntil`, when the
 * pin gives them; every pin the site ships does). A pinned key that leaks once its certificate
 * has expired or been retired can't then date anything outside that window (re-check of PR #145).
 */
export const withinPin = (pin: TsaPin, at: string): boolean => {
  const t = Date.parse(at);
  if (Number.isNaN(t)) return false;
  for (const [k, ok] of [
    ['notBefore', (b: number) => t >= b],
    ['validUntil', (b: number) => t <= b],
  ] as const) {
    const v = pin[k];
    if (v === undefined) continue;
    const b = typeof v === 'string' ? Date.parse(v) : NaN;
    if (Number.isNaN(b) || !ok(b)) return false;
  }
  return true;
};

const bytesOf = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

/** The answer for one proof code: only tokens checked here and signed by a pinned certificate. Never throws. */
export const instantStampFor = async (
  commitment?: string,
  fetchImpl: typeof fetch = fetch,
  pins: readonly TsaPin[] = TSA_PINS,
): Promise<InstantState> => {
  if (!commitment || !HEX64.test(commitment) || pins.length === 0) return { status: 'none' };
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
  const seen = new Set<string>();
  for (const t of body.tokens.slice(0, 5)) {
    if (!isObject(t) || t.kind !== 'rfc3161' || !isString(t.token)) continue;
    try {
      const der = timestampTokenBytes(t.token);
      if (!der) continue;
      const pin = await pinOf(der, pins);
      if (!pin || seen.has(pin.certSha256)) continue;
      // Checked with the pinned certificate as the only one there is: the signature can then only
      // pass with that key, whatever other certificates the token carried.
      const v = await verifyTimestampToken(stripCertificates(der), stamped, { certificates: [pin.cert] });
      if (!v.ok || !v.genTime || !withinPin(pin, v.genTime)) continue;
      seen.add(pin.certSha256);
      tokens.push({ tsa: pin.name, at: v.genTime });
    } catch {
      /* not a token this page can check: not shown */
    }
  }
  if (tokens.length === 0) return { status: 'none' };
  tokens.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const times = tokens.map((x) => Date.parse(x.at));
  const disagree = Math.max(...times) - Math.min(...times) > DISAGREE_MS;
  return {
    status: 'stamped',
    tokens,
    stillAsking: typeof body.stillAsking === 'number' && body.stillAsking > 0,
    disagree,
  };
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
