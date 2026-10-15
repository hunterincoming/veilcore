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
// SPDX-License-Identifier: Apache-2.0

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * The site path for a record's verify page. The fingerprint is added when the record has
 * one (an unsealed record has none, and its link stays as it was). Other query
 * parameters, such as `show`, are kept.
 */
export const verifyPath = (
  id: string,
  fingerprint?: string,
  params?: Record<string, string> | URLSearchParams,
): string => {
  const q = new URLSearchParams(params);
  q.delete('fp');
  if (fingerprint && HEX64.test(fingerprint)) q.set('fp', fingerprint);
  const s = q.toString();
  return `/verify/${encodeURIComponent(id)}${s ? `?${s}` : ''}`;
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
export const checkedSummary = (c: {
  bound: boolean;
  proofChecked: boolean;
  signaturesChecked: number;
  /** What each checked signature is (VerifyPage signatureKind), so the footer names them as the lines do. */
  signatureKinds?: readonly string[];
}): string => {
  const kinds = (c.signatureKinds ?? []).map((k) =>
    /^Lab report/.test(k) ? 'a lab report' : /^Lab’s receipt/.test(k) ? 'a lab’s receipt' : 'a signed statement',
  );
  const counted = [...new Set(kinds)].map((k) => {
    const n = kinds.filter((x) => x === k).length;
    return n === 1 ? k : `${n} × ${k.replace(/^an? /, '')}`;
  });
  const what = counted.length ? ` (${counted.join(', ')})` : '';
  const done = [
    ...(c.bound ? ['the link’s fingerprint matches the one the registry reports'] : []),
    ...(c.proofChecked ? ['the record is in its batch'] : []),
    ...(c.signaturesChecked > 0
      ? [(c.signaturesChecked === 1 ? 'one signature about it' : `${c.signaturesChecked} signatures about it`) + what]
      : []),
  ];
  if (done.length === 0)
    return 'Nothing on this page could be checked in this browser: it is all the VeilCore registry’s report.';
  const list = done.length === 1 ? done[0] : `${done.slice(0, -1).join(', ')} and ${done[done.length - 1]}`;
  return (
    `Checked in this browser: ${list}. Everything else is the VeilCore registry’s report.` +
    (c.bound ? '' : ' This link names no fingerprint, so those checks used the registry’s own and nothing is ticked.')
  );
};

/** The heading: plain words for where the record stands. */
export const verifyHeading = (s: {
  sealed: boolean;
  bound: boolean;
  proof: 'checking' | 'none' | 'pending' | 'anchor-reported';
}): string =>
  !s.sealed
    ? 'Record found, nothing sealed'
    : !s.bound
      ? 'The registry’s report: this link has no fingerprint to check against'
      : s.proof === 'checking'
        ? 'Checking…'
        : s.proof === 'anchor-reported'
          ? 'In a dated batch: the date is the registry’s report, not checked here'
          : s.proof === 'pending'
            ? 'In a batch, not dated yet'
            : 'Not dated yet';
