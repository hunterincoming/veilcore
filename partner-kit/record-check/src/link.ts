// Reading a check link a depositor pasted.
//
// A check link is what the VeilCore site makes for a record (Share, or the certificate's QR
// code): https://veilcore.org/verify/<record id>?fp=<proof code>[&show=…]
// [#n=<name>&ds=<pairing salt>&chain=<key>&anchorTx=…&ks=<key salt>&cd=<content hash>].
// What follows the # never reaches a server: the name (round 5, the registry no longer has
// it), the DNA report's pairing salt, and since round 4 the key's values. Links
// made before round 4 have the key's values in the query string, and are read from there too.
// A bare record id is also accepted, and then there is no proof code to hold the registry's
// answer to.
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
  /**
   * The fingerprint the link was made for: 'absent' on an old link or a bare id. 'invalid'
   * with `cut`: the link looks cut off (the fingerprint stops short, or the link ends where
   * it should begin), so the whole link is needed.
   */
  readonly fingerprint: { state: 'given'; value: string } | { state: 'absent' } | { state: 'invalid'; cut?: true };
  /** `show=`: narrows what the registry sends; it can never widen the holder's grant. */
  readonly show?: string;
  /** The record's key and what ties it to the fingerprint, when the holder put them in the link. */
  readonly key?: { readonly key?: string; readonly keySalt?: string; readonly contentHash?: string };
  /** The record's name, from after the # (round 5): the holder's word, as typed. */
  readonly name?: string;
  /**
   * The DNA report's pairing salt, from after the # (round 5): with the report file and the
   * link's proof code, the report the holder saved can be checked.
   */
  readonly dnaSalt?: string;
};

export class LinkError extends Error {}

/** What a partner is told about a link that stops short. */
export const CUT = 'This link looks cut off. Ask for the whole link.';

const hexParam = (q: URLSearchParams, name: string, hash?: URLSearchParams): string | undefined => {
  const v = hash?.get(name) ?? q.get(name);
  if (v === null) return undefined;
  const h = v.trim().toLowerCase();
  return isHex64(h) ? h : 'invalid';
};

/**
 * A fingerprint that stops short: the start of one (hexadecimal, fewer than 64
 * characters), possibly with the "…" or "..." a screen or a chat app put where it cut it.
 */
const fingerprintCut = (fp: string): boolean => {
  const h = fp.trim().replace(/(\u2026|\.{2,})$/, '');
  return /^[0-9a-fA-F]{0,63}$/.test(h);
};

/** A link that ends where its fingerprint should begin: "…/VEIL-…?", "?f", "?fp", "&". */
const endsCut = (raw: string): boolean => /(\?|\?f|&|&f|\u2026|\.{2,})$/.test(raw);

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
  if (!m) {
    // "https://veilcore.org/ver", "…/verify/": it stops before the record id.
    if (url.pathname.length > 1 && '/verify/'.startsWith(url.pathname)) throw new LinkError(CUT);
    throw new LinkError('That link does not point at a record. A check link contains /verify/ and the record id.');
  }
  let id: string;
  try {
    id = decodeURIComponent(m[1]);
  } catch {
    throw new LinkError('The record id in that link is damaged.');
  }
  if (/(\u2026|\.{2,})$/.test(id)) throw new LinkError(CUT);
  if (!RECORD_ID.test(id)) throw new LinkError('The record id in that link is not one a registry makes.');

  const q = url.searchParams;
  const fp = q.get('fp');
  const fingerprint: CheckLink['fingerprint'] =
    fp === null
      ? endsCut(raw)
        ? { state: 'invalid', cut: true }
        : { state: 'absent' }
      : isHex64(fp.trim().toLowerCase())
        ? { state: 'given', value: fp.trim().toLowerCase() }
        : fingerprintCut(fp)
          ? { state: 'invalid', cut: true }
          : { state: 'invalid' };
  const h = new URLSearchParams(url.hash.replace(/^#/, ''));
  const key = hexParam(q, 'chain', h);
  const keySalt = hexParam(q, 'ks', h);
  const contentHash = hexParam(q, 'cd', h);
  const show = q.get('show') ?? undefined;
  const name = nameOf(h.get('n'));
  const salt = hexParam(new URLSearchParams(), 'ds', h);
  return {
    recordId: id,
    fingerprint,
    ...(show !== undefined && show.length <= 512 ? { show } : {}),
    ...(key || keySalt || contentHash ? { key: { key, keySalt, contentHash } } : {}),
    ...(name ? { name } : {}),
    ...(salt && salt !== 'invalid' ? { dnaSalt: salt } : {}),
  };
};

/** The name after the # (`n`, its UTF-8 bytes in base64url), or undefined when it isn't one. */
const nameOf = (raw: string | null): string | undefined => {
  if (!raw || !/^[A-Za-z0-9_-]+$/.test(raw) || raw.length > 4000) return undefined;
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    return text.trim() ? text : undefined;
  } catch {
    return undefined;
  }
};
