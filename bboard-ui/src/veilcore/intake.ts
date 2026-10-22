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
// unchanged so the partner can tell its own request from a forged one.
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

export type IntakeReturn = {
  readonly recordId: string;
  readonly proofCode: string;
  /** The public check link for the record (no name in it). */
  readonly checkLink: string;
};

const STATE = /^[A-Za-z0-9_-]{8,128}$/;
const MAX_RETURN = 2000;
const STORE = 'veilcore:intake';

/** Control characters out, trimmed, at most `max` characters: text typed into someone else's link. */
const clean = (s: string | null, max: number): string | undefined => {
  if (s === null) return undefined;
  const t = s
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex -- control characters are what this removes
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
  return t || undefined;
};

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
  if (u.hash) return 'hasHash';
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

export const saveIntake = (r: IntakeRequest): void => {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(r));
  } catch {
    /* without storage the request lives only on the /intake page */
  }
};

export const loadIntake = (mainnet = IS_MAINNET): IntakeRequest | undefined => {
  try {
    const v: unknown = JSON.parse(sessionStorage.getItem(STORE) ?? 'null');
    if (typeof v !== 'object' || v === null) return undefined;
    const o = v as Record<string, unknown>;
    if (typeof o.returnTo !== 'string' || typeof o.state !== 'string') return undefined;
    if (returnProblem(o.returnTo, mainnet) || !STATE.test(o.state)) return undefined;
    return {
      returnTo: o.returnTo,
      state: o.state,
      ...(typeof o.ref === 'string' ? { ref: o.ref.slice(0, 120) } : {}),
      ...(typeof o.name === 'string' ? { name: o.name.slice(0, 200) } : {}),
    };
  } catch {
    return undefined;
  }
};

export const clearIntake = (): void => {
  try {
    sessionStorage.removeItem(STORE);
  } catch {
    /* nothing kept */
  }
};
