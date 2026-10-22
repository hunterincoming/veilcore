// A lab's (or any partner's) intake page sends the breeder to VeilCore and gets a record back.
//
// The pattern is the one "Sign in with Google" and bank-connection services use: the partner's
// page links to https://veilcore.org/intake?return=…&state=…; the breeder makes (or picks) a
// record here, on VeilCore's own site, in their own browser; then, only if they say so, this
// page sends them back to the partner with the record's ID, its proof code and its check link
// in the address's # part. Why this shape and not a widget inside the partner's page:
//
//   - nothing the breeder types ever runs inside the partner's page. A script or frame placed
//     on someone else's site can be read or changed by that site; a separate page on
//     veilcore.org can't. The partner learns only what is sent back, which is public anyway;
//   - the record's keys land in the breeder's own VeilCore (this site's storage), with the
//     same backup as any record, not in a box tied to the partner's site;
//   - the site keeps its strict headers (no framing, its own window), and it works the same
//     on a phone, where pop-up windows don't;
//   - any partner can do it with a link, no sign-up and no code from us: the standard is the
//     link (docs/INTAKE.md).
//
// The partner is not trusted with anything: `return` must be https, the breeder sees its
// address before anything is sent, and `state` (the partner's own random value) comes back
// unchanged so another site can't slip the partner an answer to a request it never made.
// What the answer does NOT prove (attack pass 22 Oct, finding 1): that the sender holds the
// record, or that it is the sample. The sender sees `state` and could hand-write an answer
// naming anyone's public record. The answer says which record the sender points at; the
// partner checks it exists and is dated on VeilCore itself (never through the `check` link it
// was handed), and asks the sender to prove they hold it (a prove link) when that matters.
//
// The request lives in this tab for an hour at most, can be dropped at any time ("Not now"),
// and only a record picked or finished during it can be sent back (finding 2).
// SPDX-License-Identifier: Apache-2.0

import { IS_MAINNET } from '../config/network';

export const INTAKE_VERSION = 'veilcore/intake/v1';

export type IntakeRequest = {
  /** Where to send the breeder back: https, no # part, no user or password. */
  readonly returnTo: string;
  /** The partner's own value, sent back unchanged. */
  readonly state: string;
  /** The partner's reference for this sample (its sample or order number), put in the record's "your reference". */
  readonly ref?: string;
  /** A name the partner suggests; the breeder can change it. */
  readonly name?: string;
};

/** The request as this tab keeps it: when it came, and the records picked or made for it. */
export type KeptIntake = IntakeRequest & { readonly savedAt: number; readonly allowed: readonly string[] };

/** How long a request waits in a tab before it is dropped. */
export const INTAKE_TTL_MS = 60 * 60 * 1000;

export type IntakeReturn = {
  readonly recordId: string;
  readonly proofCode: string;
  /** The public check link for the record (no name in it). */
  readonly checkLink: string;
};

const STATE = /^[A-Za-z0-9_-]{8,128}$/;
const MAX_RETURN = 2000;
const STORE = 'veilcore:intake';

/**
 * Text from someone else's link, made safe to show: control and format characters out (line
 * breaks, C1, bidi overrides, zero-width marks: re-check finding 3), trimmed, at most `max`.
 */
export const clean = (s: string | null, max: number): string | undefined => {
  if (s === null) return undefined;
  const t = s
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, '')
    .trim()
    .slice(0, max);
  return t || undefined;
};

/** Whether the host is one a person can't easily judge: an IP address, punycode, or a port. */
export const oddHost = (host: string): boolean =>
  /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(host) || host.startsWith('[') || /(^|\.)xn--/i.test(host) || /:\d+$/.test(host);

/** Why a request is refused: a key under app.intake.err (the page words it). */
export type IntakeProblem = 'noReturn' | 'tooLong' | 'notUrl' | 'notHttps' | 'credentials' | 'hasHash' | 'badState';

/** Why a return address is refused, or undefined when it is fine. */
export const returnProblem = (raw: string, mainnet = IS_MAINNET): IntakeProblem | undefined => {
  if (raw.length > MAX_RETURN) return 'tooLong';
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return 'notUrl';
  }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local && !mainnet)) return 'notHttps';
  if (u.username || u.password) return 'credentials';
  if (u.hash || raw.includes('#')) return 'hasHash';
  return undefined;
};

export type ParsedIntake =
  | { readonly ok: true; readonly request: IntakeRequest }
  | { readonly ok: false; readonly problem: IntakeProblem };

/** The request in /intake's address. */
export const parseIntake = (search: string, mainnet = IS_MAINNET): ParsedIntake => {
  const q = new URLSearchParams(search);
  const returnTo = q.get('return') ?? '';
  const state = q.get('state') ?? '';
  if (!returnTo) return { ok: false, problem: 'noReturn' };
  const p = returnProblem(returnTo, mainnet);
  if (p) return { ok: false, problem: p };
  if (!STATE.test(state)) return { ok: false, problem: 'badState' };
  const ref = clean(q.get('ref'), 120);
  const name = clean(q.get('name'), 200);
  return { ok: true, request: { returnTo, state, ...(ref ? { ref } : {}), ...(name ? { name } : {}) } };
};

/** The host the breeder is shown, and asked about, before anything is sent. */
export const hostOf = (r: IntakeRequest): string => new URL(r.returnTo).host;

/** The address the breeder goes back to: the partner's own, with VeilCore's answer after the #. */
export const returnUrl = (r: IntakeRequest, answer: IntakeReturn | 'declined'): string => {
  const h = new URLSearchParams({ veilcore: INTAKE_VERSION, state: r.state });
  if (answer === 'declined') h.set('declined', '1');
  else {
    h.set('record', answer.recordId);
    h.set('proof', answer.proofCode);
    h.set('check', answer.checkLink);
  }
  return `${r.returnTo}#${h.toString()}`;
};

// --- kept for this tab only, while the breeder makes the record ---

const write = (k: KeptIntake): void => {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(k));
  } catch {
    /* without storage the request lives only on the /intake page */
  }
};

export const saveIntake = (r: IntakeRequest, now = Date.now()): void => write({ ...r, savedAt: now, allowed: [] });

export const loadIntake = (mainnet = IS_MAINNET, now = Date.now()): KeptIntake | undefined => {
  try {
    const v: unknown = JSON.parse(sessionStorage.getItem(STORE) ?? 'null');
    if (typeof v !== 'object' || v === null) return undefined;
    const o = v as Record<string, unknown>;
    if (typeof o.returnTo !== 'string' || typeof o.state !== 'string') return undefined;
    if (returnProblem(o.returnTo, mainnet) || !STATE.test(o.state)) return undefined;
    const savedAt = typeof o.savedAt === 'number' ? o.savedAt : 0;
    if (!(now - savedAt >= 0 && now - savedAt < INTAKE_TTL_MS)) {
      clearIntake();
      return undefined;
    }
    const allowed = Array.isArray(o.allowed) ? o.allowed.filter((x): x is string => typeof x === 'string') : [];
    return {
      returnTo: o.returnTo,
      state: o.state,
      savedAt,
      allowed,
      ...(typeof o.ref === 'string' ? { ref: clean(o.ref, 120) } : {}),
      ...(typeof o.name === 'string' ? { name: clean(o.name, 200) } : {}),
    };
  } catch {
    return undefined;
  }
};

/** A record the breeder picked or finished for this request: the only kind /intake/send will offer. */
export const allowRecord = (id: string): void => {
  const k = loadIntake();
  if (k && !k.allowed.includes(id)) write({ ...k, allowed: [...k.allowed, id] });
};

export const clearIntake = (): void => {
  try {
    sessionStorage.removeItem(STORE);
  } catch {
    /* nothing kept */
  }
};
