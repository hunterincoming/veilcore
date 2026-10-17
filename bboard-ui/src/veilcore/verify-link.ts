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
// SPDX-License-Identifier: Apache-2.0

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * The site path for a record's verify page. The fingerprint is added when the record has
 * one (an unsealed record has none, and its link stays as it was). Other query
 * parameters, such as `show`, are kept.
 */
import { enT, type Translator } from '../i18n/translate';

/** Link values that join a record to its on-chain activity: only ever in the fragment (F7). */
export const FRAGMENT_PARAMS = ['chain', 'anchorTx', 'ks', 'cd', 'rs'] as const;
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
