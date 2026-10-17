// "Copy details for support": a short plain-text note a person can paste into an email when
// something fails (a date stamp, a save, a delivery, a restore), so nobody has to send them on
// a debugging errand.
//
// What it says: the site and its release (commit, from /release.json when the site has one),
// the network, the time, the step that failed, the first sentence of what went wrong, the
// browser, whether this browser keeps what the app stores, how many records wait in this
// browser for VeilCore, and whether a backup has been checked. What it never says: anything
// secret or typed. No keys, codes, names, notes or links; any run of more than 16 hex
// characters (a key, a proof code, a transaction) and any long code-like run is cut out, and
// so is anything in double quotation marks (where a name could be). Single quotes stay: a
// browser's own error names what it refused that way ('Worker', 'TrustedScriptURL').
// SPDX-License-Identifier: Apache-2.0

import { NETWORK, isTestNetwork } from '../config/network';
import { errorDetail } from '../components/flow/log-flow-state';

/** The steps a note can be about, as support reads them. */
export type SupportStep =
  | 'key date stamp'
  | 'save to VeilCore'
  | 'lab delivery'
  | 'receiving a delivery'
  | 'restore from backup'
  | 'backup'
  | 'agreement'
  | 'proving you hold a record'
  | 'DNA report date stamp'
  | 'checking a record';

export type SupportFacts = {
  readonly step: SupportStep;
  readonly error?: string;
  readonly site: string;
  readonly commit?: string;
  readonly network: string;
  readonly at: Date;
  readonly userAgent: string;
  readonly storageWorks: boolean;
  readonly outboxCount: number;
  /** yes | no | no key yet (nothing has been locked in this browser). */
  readonly backupChecked: 'yes' | 'no' | 'no key yet';
};

/** Anything that could carry a secret or a typed value, taken out. */
export const scrub = (s: string): string =>
  s
    // Double-quoted text (a record's or a person's name could be in it).
    .replace(/[“"][^“”"]{1,200}[”"]/g, '“…”')
    // Long hex: keys, proof codes, transactions, record ids.
    .replace(/(0x)?[0-9a-fA-F]{17,}/g, '…')
    // Long code-like runs (base64, a delivery code, a vault key).
    .replace(/[A-Za-z0-9_+/=-]{24,}/g, '…')
    // An email address or a link.
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '…')
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '…');

/** "Chrome 141 on macOS", from a user-agent string. Never the full string. */
export const browserName = (ua: string): string => {
  const v = (re: RegExp) => re.exec(ua)?.[1];
  const name =
    (v(/Edg\/(\d+)/) && `Edge ${v(/Edg\/(\d+)/)}`) ||
    (v(/OPR\/(\d+)/) && `Opera ${v(/OPR\/(\d+)/)}`) ||
    (v(/Firefox\/(\d+)/) && `Firefox ${v(/Firefox\/(\d+)/)}`) ||
    (v(/CriOS\/(\d+)/) && `Chrome ${v(/CriOS\/(\d+)/)} (iOS)`) ||
    (v(/Chrome\/(\d+)/) && `Chrome ${v(/Chrome\/(\d+)/)}`) ||
    (/Safari\//.test(ua) && v(/Version\/(\d+(?:\.\d+)?)/) && `Safari ${v(/Version\/(\d+(?:\.\d+)?)/)}`) ||
    'an unknown browser';
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Mac OS X|Macintosh/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'an unknown system';
  return `${name} on ${os}`;
};

/** The note, as it is copied. */
export const supportText = (f: SupportFacts): string => {
  const lines = [
    'VeilCore support details',
    `Site: ${scrub(f.site)}${f.commit ? ` · release ${scrub(f.commit.slice(0, 12))}` : ' · release not known'}`,
    `Network: ${f.network}${isTestNetwork(f.network) ? ' (test network)' : ''}`,
    `Time: ${f.at.toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
    `Step: ${f.step}`,
    `What went wrong: ${f.error ? scrub(errorDetail(f.error)) || 'no message' : 'no message'}`,
    `Browser: ${browserName(f.userAgent)}`,
    `Browser storage works: ${f.storageWorks ? 'yes' : 'no'}`,
    `Records waiting in this browser for VeilCore: ${String(f.outboxCount)}`,
    `Backup checked: ${f.backupChecked}`,
  ];
  return lines.join('\n');
};

/** A mailto: link to VeilCore with the note in it. */
export const SUPPORT_EMAIL = 'hunter@veilcore.org';
export const supportMailto = (text: string, step: SupportStep): string =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`VeilCore: ${step} didn’t work`)}&body=${encodeURIComponent(text)}`;

// ---- this browser's facts ----------------------------------------------------------------

let release: Promise<string | undefined> | undefined;
/** The deployed release's commit (/release.json, written by every deploy), if the site has one. */
const releaseCommit = (): Promise<string | undefined> =>
  (release ??= (async () => {
    try {
      const r = await fetch('/release.json', { cache: 'no-store' });
      if (!r.ok) return undefined;
      const v = (await r.json()) as { commit?: unknown };
      return typeof v.commit === 'string' && /^[0-9a-f]{7,40}$/.test(v.commit) ? v.commit : undefined;
    } catch {
      return undefined;
    }
  })());

/** The note for this browser now. */
export const supportTextNow = async (step: SupportStep, error?: string): Promise<string> => {
  const [{ outboxRecords }, { vaultKeyIfAny, vaultNeedsBackup }, { storageKeeps }] = await Promise.all([
    import('./outbox'),
    import('./vault'),
    import('./record-keys'),
  ]);
  return supportText({
    step,
    ...(error ? { error } : {}),
    site: typeof location !== 'undefined' ? location.host : 'unknown',
    commit: await releaseCommit(),
    network: NETWORK,
    at: new Date(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    storageWorks: storageKeeps(),
    outboxCount: Object.keys(outboxRecords()).length,
    backupChecked: !vaultKeyIfAny() ? 'no key yet' : vaultNeedsBackup() ? 'no' : 'yes',
  });
};
