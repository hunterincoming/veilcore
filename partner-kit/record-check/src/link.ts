// Reading a check link a depositor pasted.
//
// A check link is what the VeilCore site makes for a record (Share, or the certificate's QR
// code): https://veilcore.org/verify/<record id>?fp=<fingerprint>[&show=…][&rs=…]
// [&chain=<key>&anchorTx=…&ks=<key salt>&cd=<content hash>]. A bare record id is also
// accepted, and then there is no fingerprint to hold the registry's answer to.
//
// Only the record id and the parameters are read from the link. Which registry answers is
// the partner's choice (the `registry` option), never the link's host: a link from a
// stranger must not pick who vouches for it.
// SPDX-License-Identifier: Apache-2.0

import { isHex64 } from './hash.js';

/** A record id as any registry might make one: VEIL-… on VeilCore's, at most 128 safe characters. */
const RECORD_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_LINK = 4096;

export type CheckLink = {
  readonly recordId: string;
  /** The fingerprint the link was made for: 'absent' on an old link or a bare id. */
  readonly fingerprint: { state: 'given'; value: string } | { state: 'absent' } | { state: 'invalid' };
  /** `show=`: narrows what the registry sends; it can never widen the holder's grant. */
  readonly show?: string;
  /** The record's key and what ties it to the fingerprint, when the holder put them in the link. */
  readonly key?: { readonly key?: string; readonly keySalt?: string; readonly contentHash?: string };
};

export class LinkError extends Error {}

const hexParam = (q: URLSearchParams, name: string): string | undefined => {
  const v = q.get(name);
  if (v === null) return undefined;
  const h = v.trim().toLowerCase();
  return isHex64(h) ? h : 'invalid';
};

/**
 * Read a check link (or a bare record id). Throws LinkError, in plain words, for anything
 * that names no record.
 */
export const parseCheckLink = (input: string): CheckLink => {
  const raw = String(input ?? '').trim();
  if (!raw) throw new LinkError('Paste the record’s check link.');
  if (raw.length > MAX_LINK) throw new LinkError('That is too long to be a check link.');
  if (RECORD_ID.test(raw) && !raw.includes(':')) return { recordId: raw, fingerprint: { state: 'absent' } };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new LinkError('That is not a check link. It should start with https:// and contain /verify/.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    throw new LinkError('That is not a check link. It should start with https://.');
  const m = /\/verify\/([^/?#]+)\/?$/.exec(url.pathname);
  if (!m)
    throw new LinkError('That link does not point at a record. A check link contains /verify/ and the record id.');
  let id: string;
  try {
    id = decodeURIComponent(m[1]);
  } catch {
    throw new LinkError('The record id in that link is damaged.');
  }
  if (!RECORD_ID.test(id)) throw new LinkError('The record id in that link is not one a registry makes.');

  const q = url.searchParams;
  const fp = q.get('fp');
  const fingerprint: CheckLink['fingerprint'] =
    fp === null
      ? { state: 'absent' }
      : isHex64(fp.trim().toLowerCase())
        ? { state: 'given', value: fp.trim().toLowerCase() }
        : { state: 'invalid' };
  const key = hexParam(q, 'chain');
  const keySalt = hexParam(q, 'ks');
  const contentHash = hexParam(q, 'cd');
  const show = q.get('show') ?? undefined;
  return {
    recordId: id,
    fingerprint,
    ...(show !== undefined && show.length <= 512 ? { show } : {}),
    ...(key || keySalt || contentHash ? { key: { key, keySalt, contentHash } } : {}),
  };
};
