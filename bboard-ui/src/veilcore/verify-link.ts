// Verify links carry the record's fingerprint (round D verification, Medium).
//
// The public verify page checks an inclusion proof and signed attestations against a
// fingerprint. If that fingerprint comes from the registry's own answer, the registry
// decides what is checked: it can answer record Y's id with record X's fingerprint and
// borrow X's genuine proof and lab signature. So every link and QR code the site makes
// names the fingerprint itself (`?fp=<64 hex>`), and the page checks against that. The
// fingerprint is not secret; the page already shows it.
//
// Links made before this (old links, printed QR codes) have no `fp`. They still open,
// but the page then shows everything as the registry's report and ticks nothing.
//
// Round 4 (F7): what links a record to its holder's on-chain activity goes after the `#`
// (the fragment), which a browser never sends to any server: the on-chain identity
// (`chain`), its date stamp (`anchorTx`), the key's salt (`ks`), the hash of the sealed
// details (`cd`) and the saved report's SHA-256 (`rs`). In the query string they reached
// VeilCore's web host, which logs every request, and so joined a record id to an on-chain
// identity: the link the record-keys design keeps off the registry. Old links with them in
// the query string still open (linkParam reads both), and the page moves them into the
// fragment at once. `fp` and `show` are public and stay in the query string.
//
// Round 5 (CONTRACT.md #28, #29): the record's name is sealed, so the registry doesn't have it
// to show. The holder's link carries it after the # instead (`n`, the name's UTF-8 bytes in
// base64url), with the DNA report's pairing salt (`ds`: dna-link.ts), so the person the holder
// sends the link to sees the name and can check the report file. A browser opening the link
// doesn't send what follows the #; the link itself goes whole wherever it is pasted or sent.
//
// Round 6 (CONTRACT.md #33, the fifth review's finding 2): anyone forwarding a genuine link
// could change the name in it, and the check page showed it as the holder's. Now the holder's
// app publishes a salted name code with the record (`nameCode`, nameCodeOf below), over the
// name, the proof code and a salt kept inside the record; the link carries the salt (`ns`).
// The check page says "Name matches the record" or "This name does not match the record"; a
// name without a salt or without a published code is "Name given in this link (not checked)".
// A name the holder published (the `name` grant) wins over a link's, and a different one in
// the link is flagged. The lab report salt (`ls`, lab-doc.ts) goes after the # too.
// SPDX-License-Identifier: Apache-2.0

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * The site path for a record's verify page. The fingerprint is added when the record has
 * one (an unsealed record has none, and its link stays as it was). Other query
 * parameters, such as `show`, are kept.
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { enT, type Translator } from '../i18n/translate';

/** Link values that join a record to its on-chain activity: only ever in the fragment (F7). */
export const FRAGMENT_PARAMS = ['chain', 'anchorTx', 'ks', 'cd', 'rs', 'n', 'ds', 'ns', 'ls'] as const;

/** The link's name value: the name's UTF-8 bytes, base64url without padding (CONTRACT.md #28). */
export const NAME_PARAM = 'n';
/** The link's name salt (round 6, CONTRACT.md #33): 64 lowercase hex, kept in the sealed record. */
export const NAME_SALT_PARAM = 'ns';
const NAME_MAX = 500;

/** A name as a link carries it and a name code covers it: NFC, trimmed, at most 500 characters. */
export const linkName = (name: string): string => name.normalize('NFC').trim().slice(0, NAME_MAX);

const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/**
 * The name code (CONTRACT.md #33): hex SHA-256("veilcore:name:v1" 0x00 || UTF-8 name || 0x00 ||
 * proof code hex || 0x00 || salt hex). Public with the record; without the salt it says nothing
 * about the name. Undefined unless the proof code and the salt are 64 hex and the name isn't empty.
 */
export const nameCodeOf = (name: string, proofCode: string, salt: string): string | undefined => {
  const n = linkName(name);
  if (!n || !HEX64.test(proofCode) || !HEX64.test(salt)) return undefined;
  return toHex(sha256(new TextEncoder().encode(`veilcore:name:v1\0${n}\0${proofCode}\0${salt}`)));
};

/** A new name salt: 32 random bytes, hex. */
export const newNameSalt = (): string => toHex(crypto.getRandomValues(new Uint8Array(32)));

/** The record's name and its salt for a check link: { n, ns }, or {} for a record without a name. */
export const nameLinkParams = (r: { strainName?: string; nameSalt?: string }): Record<string, string> => {
  const n = nameParam(r.strainName ?? '');
  return n[NAME_PARAM] && r.nameSalt && HEX64.test(r.nameSalt) ? { ...n, [NAME_SALT_PARAM]: r.nameSalt } : n;
};

/** The name salt after a link's #, when it is 64 hex. */
export const nameSaltFromLink = (hash: string): string | null => {
  const v = new URLSearchParams(hash.replace(/^#/, '')).get(NAME_SALT_PARAM)?.trim().toLowerCase();
  return v && HEX64.test(v) ? v : null;
};

/**
 * What a check page may say about a record's name (CONTRACT.md #33, #37):
 *   published  the holder published it (the `name` grant): shown as theirs; `conflict` when
 *              the link carries a different one, which is flagged and never shown as the name;
 *   matches    the link's name, with its salt, makes the record's published name code;
 *   differs    it doesn't: this is not the record's name;
 *   unchecked  the link has a name but no salt, or the record publishes no name code (a link
 *              or a record from before round 6): the link's word only;
 *   none       the link carries no name.
 */
export type NameCheck =
  | { state: 'published'; name: string; conflict?: string }
  | { state: 'matches' | 'differs' | 'unchecked'; name: string }
  | { state: 'none' };

export const nameCheckOf = (o: {
  linkName: string | null;
  linkSalt: string | null;
  nameCode?: string | null;
  proofCode?: string | null;
  published?: string | null;
}): NameCheck => {
  const link = o.linkName ? linkName(o.linkName) : '';
  const published = o.published ? o.published.normalize('NFC').trim() : '';
  if (published)
    return link && link !== published
      ? { state: 'published', name: published, conflict: link }
      : { state: 'published', name: published };
  if (!link) return { state: 'none' };
  const code = o.nameCode && HEX64.test(o.nameCode) ? o.nameCode : null;
  if (!o.linkSalt || !code || !o.proofCode || !HEX64.test(o.proofCode)) return { state: 'unchecked', name: link };
  return { state: nameCodeOf(link, o.proofCode, o.linkSalt) === code ? 'matches' : 'differs', name: link };
};

export const nameParam = (name: string): Record<string, string> => {
  const n = linkName(name);
  if (!n) return {};
  const bytes = new TextEncoder().encode(n);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return { [NAME_PARAM]: btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') };
};

/**
 * The name a link carries after the #, or null when it carries none (or one that isn't
 * base64url of UTF-8 text). The page cleans it before showing it (display-name.ts), like
 * any name somebody typed.
 */
export const nameFromLink = (hash: string): string | null => {
  const raw = new URLSearchParams(hash.replace(/^#/, '')).get(NAME_PARAM);
  if (!raw || !/^[A-Za-z0-9_-]+$/.test(raw) || raw.length > 2 * NAME_MAX * 4) return null;
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    return text.trim() ? text : null;
  } catch {
    return null;
  }
};
const inFragment = (k: string): boolean => (FRAGMENT_PARAMS as readonly string[]).includes(k);

export const verifyPath = (
  id: string,
  fingerprint?: string,
  params?: Record<string, string> | URLSearchParams,
): string => {
  const all = new URLSearchParams(params);
  all.delete('fp');
  const q = new URLSearchParams();
  const h = new URLSearchParams();
  for (const [k, v] of all) (inFragment(k) ? h : q).append(k, v);
  if (fingerprint && HEX64.test(fingerprint)) q.set('fp', fingerprint);
  const s = q.toString();
  const f = h.toString();
  return `/verify/${encodeURIComponent(id)}${s ? `?${s}` : ''}${f ? `#${f}` : ''}`;
};

/**
 * A link value: from the fragment, or (an old link) from the query string. Values in
 * FRAGMENT_PARAMS are read from the fragment first; the query string only for links made
 * before round 4.
 */
export const linkParam = (name: string, search: string, hash: string): string | null => {
  const fromHash = new URLSearchParams(hash.replace(/^#/, '')).get(name);
  if (fromHash !== null && inFragment(name)) return fromHash;
  return new URLSearchParams(search.replace(/^\?/, '')).get(name);
};

/**
 * An old link's linking values, moved from the query string into the fragment: the address
 * the page should show (so a copy of it, or a reload, no longer sends them anywhere), or
 * null when there is nothing to move.
 */
export const movedToFragment = (search: string, hash: string): { search: string; hash: string } | null => {
  const q = new URLSearchParams(search.replace(/^\?/, ''));
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  let moved = false;
  for (const k of FRAGMENT_PARAMS) {
    const v = q.get(k);
    if (v === null) continue;
    q.delete(k);
    if (!h.has(k)) h.set(k, v);
    moved = true;
  }
  if (!moved) return null;
  const s = q.toString();
  const f = h.toString();
  return { search: s ? `?${s}` : '', hash: f ? `#${f}` : '' };
};

/** What a verify link says about the fingerprint it was made for. */
export type LinkFingerprint =
  | { state: 'absent' } // an old link: the registry's word only, no ticks
  | { state: 'invalid'; raw: string } // cut short or edited: nothing can be checked
  | { state: 'given'; fingerprint: string };

export const linkFingerprint = (raw: string | null): LinkFingerprint => {
  if (raw === null) return { state: 'absent' };
  const v = raw.trim().toLowerCase();
  return HEX64.test(v) ? { state: 'given', fingerprint: v } : { state: 'invalid', raw };
};

/**
 * How the registry's answer relates to the link.
 *   bound    — the link names a fingerprint and the registry reports the same one:
 *              checks run against the link's fingerprint and may be ticked;
 *   unbound  — an old link with no fingerprint: checks run against the registry's value
 *              and are shown as its report, never ticked;
 *   mismatch — the link names a fingerprint the registry does not report for this id
 *              (or an invalid one): nothing is checked and nothing is ticked.
 */
export type Binding =
  | { kind: 'bound'; fingerprint: string }
  | { kind: 'unbound'; fingerprint?: string }
  | { kind: 'mismatch'; linked?: string; reported?: string };

export const bindingOf = (link: LinkFingerprint, reported: string | undefined): Binding => {
  if (link.state === 'absent') return { kind: 'unbound', fingerprint: reported || undefined };
  if (link.state === 'invalid') return { kind: 'mismatch', reported: reported || undefined };
  return reported === link.fingerprint
    ? { kind: 'bound', fingerprint: link.fingerprint }
    : { kind: 'mismatch', linked: link.fingerprint, reported: reported || undefined };
};

/**
 * The footer: exactly what this browser checked, and that the rest is the registry's
 * report. Never "nothing could be checked" when a line above says something was.
 */
export const checkedSummary = (
  c: {
    bound: boolean;
    proofChecked: boolean;
    signaturesChecked: number;
    /** What each checked signature is (VerifyPage signatureKind, in English), so the footer names them as the lines do. */
    signatureKinds?: readonly string[];
  },
  tr: Translator = enT,
): string => {
  const kinds = (c.signatureKinds ?? []).map((k) =>
    /^Lab report/.test(k)
      ? 'app.verify.sum.reports'
      : /^Lab’s receipt/.test(k)
        ? 'app.verify.sum.receipts'
        : 'app.verify.sum.statements',
  );
  const counted = [...new Set(kinds)].map((k) => tr.tp(k, kinds.filter((x) => x === k).length));
  const what = counted.length ? tr.t('app.verify.sum.what', { list: counted.join(tr.t('app.verify.sum.comma')) }) : '';
  const done = [
    ...(c.bound ? [tr.t('app.verify.sum.bound')] : []),
    ...(c.proofChecked ? [tr.t('app.verify.sum.inBatch')] : []),
    ...(c.signaturesChecked > 0 ? [tr.tp('app.verify.sum.signatures', c.signaturesChecked, { what })] : []),
  ];
  if (done.length === 0) return tr.t('app.verify.sum.nothing');
  const list =
    done.length === 1
      ? done[0]
      : tr.t('app.verify.sum.list', {
          rest: done.slice(0, -1).join(tr.t('app.verify.sum.comma')),
          last: done[done.length - 1],
        });
  return tr.t('app.verify.sum.checked', { list, unbound: c.bound ? '' : tr.t('app.verify.sum.unbound') });
};

/** The heading: plain words for where the record stands. */
export const verifyHeading = (
  s: {
    sealed: boolean;
    bound: boolean;
    proof: 'checking' | 'none' | 'pending' | 'anchor-reported';
  },
  tr: Translator = enT,
): string =>
  tr.t(
    !s.sealed
      ? 'app.verify.heading.nothingSealed'
      : !s.bound
        ? 'app.verify.heading.unbound'
        : s.proof === 'checking'
          ? 'app.verify.heading.checking'
          : s.proof === 'anchor-reported'
            ? 'app.verify.heading.reported'
            : s.proof === 'pending'
              ? 'app.verify.heading.pending'
              : 'app.verify.heading.none',
  );
